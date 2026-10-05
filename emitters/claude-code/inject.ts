#!/usr/bin/env bun
/**
 * Hands an agent the dead ends it is about to walk into, without being asked.
 *
 * The log only helps if the agent reads it, and an agent only reads it if it
 * thinks to call a tool. Measured on this repository: the one abandoned
 * attempt we have is found by searching the exact word "summarizer" and by
 * nothing else — "summary model", "intent extraction" and "compress records"
 * all return nothing. So a retrieval path that waits to be asked is a retrieval
 * path that mostly does not fire.
 *
 * The obvious fix is the wrong one. Injecting context unconditionally is
 * measured at +20-23% inference cost with no significant success gain
 * (p=0.87), a single irrelevant item measurably degrades retrieval across
 * eighteen models, and a relevant document in the wrong position scores below
 * having no context at all. A stale "we tried X and it failed" is the most
 * dangerous shape of all: topically on point, operationally wrong.
 *
 * So this is narrow by construction:
 *
 *   - it speaks only about what the user just asked for, the path the agent is
 *     opening, or the session it is starting — never the whole log
 *   - it says nothing at all when nothing matches, which is the common case
 *   - it does not repeat itself within a session
 *   - it is capped well under Claude Code's 10,000-character hook limit, past
 *     which the whole block is silently replaced by a stub
 *   - it never fails a tool call; a broken injector must not break a session
 *
 * `UserPromptSubmit` and `SessionStart` are confirmed against a live agent to
 * reach the model. `PreToolUse` knows exactly which file is about to be
 * opened, but a fresh session once read a file with a recorded dead end and
 * saw none of the block this hook produced. A 2.1.282 transcript since stores
 * that output as an attachment, which suggests it now arrives; whether the
 * model saw it was not checked (docs/decisions/2026-09-25-yodermon-trial.md).
 *
 * `SubagentStart` is the other half, and it is the one that was missing. A
 * subagent starts with a fresh, isolated context window — no parent
 * conversation, no parent tool results, nothing this hook put in front of the
 * parent — so the agent that does the actual editing saw none of it.
 *
 * The headers here are deliberately factual rather than imperative. Claude
 * Code wraps injected context in a system reminder and warns that text framed
 * as an out-of-band instruction can trip its prompt-injection defences, and
 * the same shape is the one that lasts: a prohibition decays with distance
 * from where it was stated while an instruction to run something does not.
 * "X was abandoned; `bun test y` says whether that still holds" outlives
 * "do not retry X".
 *
 * Wire it as UserPromptSubmit, SessionStart, SubagentStart, and PreToolUse on
 * Read|Edit|Write.
 */
import type { Database } from "bun:sqlite";
import type { CheckpointRecord } from "../../protocol/record";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { abandonedTouching, buildIndex, changedSince, openDeadEnds, openIndex, printable, QUOTED, redToGreen, relatedTo, remoteOf, retirements, succeededBy, summary, type Hit } from "../../protocol/query";
import { readPolicy } from "../../protocol/policy";
import { appendDaily, logActivity, readActivity } from "../../protocol/activity";

/** How long away before a session starts with what happened meanwhile. */
const GAP_MS = 3 * 86_400_000;
import { codexExit, contextOutput, denyOutput, hookInput, hookRepo, noteSession, outputOf, succeeded, toolCall } from "../../protocol/agents";
import { failedBefore, repeatReason } from "../../protocol/repeats";
import { handoff } from "../../protocol/handoff";
import { changedLines } from "../../protocol/drift";
import { checkResult, dataMode, describe, listResults, sameNumber, type ResultView } from "../../protocol/results";
import { catchUpOffer, dataFiles, dataLine, holdsNumbers, isDataPath, RECORD_RESULT, writtenData } from "../../protocol/catchup";
import { anvcCommand, installLauncher, readUpdate, updateOffer } from "../../protocol/version";
import { refreshPrePush } from "../../protocol/prepush";
import { cachedCheck, runnable, verifyCached } from "../../protocol/recheck";
import { autosave } from "../../protocol/autosave";
import { readAssist, type Moment } from "../../protocol/assist";
import { goalsBrief, readGoals } from "../../protocol/goals";
import { noteFolder } from "../../protocol/folders";
import { recordsTravel } from "../../protocol/git";
import { inRepo, metricsRoot, stateRoot } from "../../protocol/rawlog";
import { recovery } from "../../protocol/recovery";
import { brief, briefForAgent } from "../../protocol/brief";
import { errorLine, similarErrors, signature } from "../../protocol/search";
import { sessionRows } from "../../protocol/evidence";
import { COMMIT, isCommit, rulesContext } from "../../protocol/rules";
import { notesBriefing } from "../../protocol/tools";
import { readStatus, statusBrief } from "../../protocol/status";

/**
 * Claude Code delivers a hook's stdout verbatim up to 10,000 characters, and
 * one character more replaces the whole block with a stub while still
 * reporting success. Staying far below it also respects the finding that
 * degradation starts around 500 tokens, long before any hard limit.
 */
const MAX_CHARS = 1_200;

/**
 * Everything one hook call says, together. Each block keeps to its own cap,
 * and a session start says up to a dozen of them: measured on a fixture with
 * each near its cap, 10,702 characters. What doesn't fit is left out whole.
 */
const MAX_TOTAL = 9_000;

/** At most this many attempts, however many match. Volume is the enemy here. */
const MAX_ITEMS = 3;

/**
 * Checks run for records shown in this hook call, beyond those already
 * remembered. Each can take two seconds of the agent's turn, so a prompt runs
 * at most one new check and a session start, which already waits, three.
 */
let freshChecks = 1;
/** Whether the person lets ANVC run checks at all; see protocol/assist.ts. */
let allowChecks = true;

/** A record's check, from the cache or run now while the budget allows. */
function check(command: string): string | null {
  if (!allowChecks) return null;
  const known = cachedCheck(served, command);
  if (known !== undefined) return known;
  if (freshChecks <= 0) return null;
  freshChecks--;
  return verifyCached(served, command);
}

/** How long ago, the way a person says it. */
function age(ts: string): string {
  const days = Math.floor((Date.now() - Date.parse(ts)) / 86_400_000);
  if (Number.isNaN(days)) return "date unknown";
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}

/** The repository this hook serves, for checks made while rendering. */
let served = "";

/**
 * One record, as the agent reads it.
 *
 * A record says what was true when it was written, so every line says how
 * old it is, whether the files it names have changed since, and whether the
 * failure was one step or the whole approach. That is for whoever reads the
 * block; it doesn't stop an agent following a stale record. What does is the
 * result of the record's own check, in words; see verify().
 */
function line(hit: Hit, resolved?: string | null): string {
  const why = hit.errors[0]?.replace(/\s+/g, " ").trim();
  const goal = hit.intent.replace(/\s+/g, " ").trim();
  const moved = served ? changedSince(served, hit) : [];
  const remote = remoteOf(hit.ref);
  const when = [
    age(hit.ts),
    // A teammate's or a fork's, fetched: whoever can push there wrote it.
    remote ? `from ${remote}` : null,
    hit.status === "abandoned" && hit.scope === "general" ? "the whole approach was judged dead" : null,
    // The fact, not a verdict: a file changing doesn't make the record wrong,
    // and saying it might was its own way of misleading.
    moved.length ? `changed since: ${moved.slice(0, 3).join(", ")}${moved.length > 3 ? ` and ${moved.length - 3} more` : ""}` : null,
  ].filter(Boolean).join("; ");
  // The evidence an agent acts on, where a warning isn't. Not needed when the
  // record's own check already ran.
  // Kept records too: a stale "this is what works" misleads more than a stale
  // dead end. drift.ts measures a kept record from the commit its own work
  // landed in, so its own work isn't shown as change.
  const drift = !resolved && moved.length ? changedLines(served, hit, 6) : [];
  const since = drift.length
    ? `\n  Since then, lines naming what this record relies on changed, so it may no longer be true:\n${drift.map((l) => `    ${l}`).join("\n")}`
    : "";
  // In quotes, so what an agent wrote reads as its words and nothing else.
  const head = `- ${goal ? `"${goal}"` : "(no goal recorded)"}${why ? ` — "${why}"` : ""} (${when})`;
  // Whether there is more, and its id, so a reader who wants the full story can
  // ask for it. This is the only place the two budgets meet: the dense half
  // never enters the block, but a reader who cannot tell it exists will never
  // fetch it, and a store nothing reads is the `plan` field again.
  //
  // Named rather than hinted, because a vague "more is available" is the
  // pointer shape that measured *worse than no record at all* — twice, in two
  // independent experiments. A concrete id and a concrete tool is a different
  // object from a reference to somewhere.
  const more = hit.has_detail ? ` [full output, what was ruled out and what was never checked: anvc_detail ${hit.id}]` : "";
  // An outcome the hook observed beats a command the reader has to run, and
  // beats it for a measured reason rather than an aesthetic one.
  if (resolved) return `${head} [${resolved}]${more}`;
  if (since) return `${head}${more}${since}`;
  // The `recheck` command is the half worth the most. A verdict a later agent
  // can only believe is worth little — if the original diagnosis was wrong,
  // the record misleads every session after it, confidently and forever. A
  // command turns that into ten seconds of work, and running one command is a
  // far cheaper action than deciding whether some record is worth going to
  // read.
  //
  // A command we declined to run must not be handed over as one to run: the
  // block would be inviting the agent to execute exactly what the allowlist
  // refused. Shown with its shape named, so a reader can see a check exists
  // without being nudged into running it.
  if (hit.recheck && !runnable(hit.recheck)) {
    return `${head} [records a check this hook will not run]${more}`;
  }
  return hit.recheck ? `${head} [still true? \`${hit.recheck}\`]${more}` : `${head}${more}`;
}

/** What a block actually put in front of the agent, for the metrics row. */
interface Shown { ids: string[]; titles: string[]; verified: string[] }

/**
 * The records each block names, by the block's text. Whether a block was
 * said is decided at the end, when the total is (see MAX_TOTAL), so a
 * record counts as shown only if a block naming it is in what was said.
 */
const named = new Map<string, Shown>();

/**
 * At most `MAX_ITEMS` items under a header, inside the character budget.
 *
 * Whole items are dropped rather than truncated: half a sentence about why an
 * approach failed is worse than saying nothing about it, because the reader
 * cannot tell what was cut. An item that doesn't fit is skipped and the next
 * one tried, so one record too long on its own can't empty the block every
 * time it comes first. What was shown is collected here rather than at
 * the call site because the budget decides what an agent actually saw: an
 * item dropped for length was not shown, and counting it would overstate
 * delivery.
 */
function fit<T>(header: string, items: T[],
  render: (item: T) => { text: string; id: string; title: string; verified?: string }): string | null {
  const kept: string[] = [];
  const shown: Shown = { ids: [], titles: [], verified: [] };
  let size = header.length;
  for (const item of items.slice(0, MAX_ITEMS)) {
    const r = render(item);
    if (size + r.text.length + 1 > MAX_CHARS) continue;
    kept.push(r.text);
    size += r.text.length + 1;
    shown.ids.push(r.id);
    shown.titles.push(r.title);
    if (r.verified) shown.verified.push(r.verified);
  }
  if (!kept.length) return null;
  const text = `${header}\n${kept.join("\n")}`;
  named.set(text, shown);
  return text;
}

/**
 * Results under a header, as facts from their fingerprints taken now
 * (protocol/results.ts), within the same budget as any block.
 */
const resultsBlock = (header: string, views: ResultView[], all: ResultView[]) =>
  fit(header, views, (view) => ({
    text: describe(view, checkResult(served, view, all), all), id: view.id, title: `${view.name} = ${view.value}`.slice(0, 90),
  }));

/** Records under a header, within the budget. */
const block = (header: string, hits: Hit[]) =>
  fit(header, hits, (hit) => {
    // Only a dead end's check means "this still fails": for kept work the
    // same words would read backwards.
    // Only records written here: a fetched one is a teammate's or a fork's,
    // and running its command would run their choice of code on this machine.
    const checked = hit.recheck && hit.status === "abandoned" && served && !remoteOf(hit.ref) ? check(hit.recheck) : null;
    return {
      text: line(hit, checked), id: hit.id, title: hit.intent.replace(/\s+/g, " ").slice(0, 90),
      ...(checked ? { verified: checked.includes("passes") ? "passes" : "fails" } : {}),
    };
  });

/**
 * Paths and records already spoken about in this session.
 *
 * Without this a file read twenty times injects twenty times, which is exactly
 * the repetition that makes injected context read as noise. Kept on disk
 * because each hook invocation is a fresh process.
 *
 * `forget` is for the moments the agent's context is gone while its session id
 * is not. Everything said before it was said to a context that no longer
 * exists, so it no longer counts as said.
 */
function claimed(session: string): { has: (key: string) => boolean; add: (key: string) => void; forget: () => void } {
  const dir = stateRoot();
  const file = join(dir, `${session.replace(/[^\w.-]/g, "-")}.txt`);
  const seen = new Set<string>();
  try {
    if (existsSync(file)) {
      for (const key of readFileSync(file, "utf8").split("\n")) {
        if (key === "@forget") seen.clear();
        else if (key) seen.add(key);
      }
    }
  } catch { /* unreadable state is the same as no state */ }
  const write = (key: string) => {
    try {
      mkdirSync(dir, { recursive: true });
      appendFileSync(file, `${key}\n`);
    } catch { /* failing to remember is survivable; failing loudly is not */ }
  };
  return {
    has: (key) => seen.has(key),
    add: (key) => { seen.add(key); write(key); },
    forget: () => { seen.clear(); write("@forget"); },
  };
}

/**
 * One row per hook invocation, whether or not anything was injected.
 *
 * The dedupe cache above records that injection fired and nothing else: not
 * which records were shown, and — the part that matters — not the times it ran
 * and stayed silent. Without those there is no denominator, so "injection
 * helped" cannot be stated as a rate, only as an anecdote.
 *
 * That asymmetry is the whole reason this exists. Measured across thousands of
 * reports about agent memory tools, the costs are quantified to three
 * significant figures — token overhead, junk rates, how often the tool is
 * called at all — and the benefits are not quantified anywhere. Nobody can say
 * "since adding this, the agent stopped re-making mistake X", because nobody
 * logged the attempts.
 *
 * `records` is what makes the later questions answerable: whether a given
 * record was ever put in front of an agent, and whether the work repeated
 * anyway. A hash of the rendered text cannot answer either.
 *
 * Appended, never read by the hook, and never allowed to fail: a metrics write
 * that breaks a session costs more than the measurement is worth.
 */
const note = (row: Record<string, unknown>): void => appendDaily(metricsRoot(), row);

/**
 * The repository-relative path a tool is about to touch, if it is touching one.
 * Symlinks are resolved, since on macOS a tool path under /var and the
 * repository under /private/var name the same folder.
 */
function targetPath(payload: Record<string, unknown>, repo: string): string | null {
  const input = (payload.tool_input ?? {}) as Record<string, unknown>;
  const raw = input.file_path ?? input.path ?? input.notebook_path;
  if (typeof raw !== "string" || !raw) return null;
  const rel = isAbsolute(raw) ? inRepo(repo)(raw) : raw;
  // A path outside the repository is not ours to comment on.
  return rel && !rel.startsWith("..") ? rel : null;
}

try {
  const input = await hookInput();
  if (!input) process.exit(0);
  const { payload, agent, cwd } = input;
  const event = input.event ?? "";
  // PreToolUse sees every shell command: a commit gets the writing rules
  // below, and any other is checked only against earlier failures.
  const tool = String(payload.tool_name ?? "");
  const command = String((payload.tool_input as { command?: unknown } | undefined)?.command ?? "");
  const shellOnly = event === "PreToolUse" && tool === "Bash" && !isCommit(command);
  // Not a repository, or one ANVC is turned off for: nothing is shown here.
  const here = hookRepo(cwd);
  if (!here) process.exit(0);
  const { repo, root } = here;
  served = repo;
  if (event === "SessionStart") freshChecks = 3;
  if (event === "SessionStart") noteFolder(root);
  // How much the person lets ANVC say on its own here (protocol/assist.ts).
  // A moment that is off says nothing and runs nothing.
  const assist = readAssist(root);
  allowChecks = assist.moments.checks;
  const moment: Moment | null = event === "SessionStart" ? "briefing"
    : event === "SubagentStart" ? "subagents"
    : event === "PostToolUse" || event === "PostToolUseFailure" ? "failures"
    : event === "PreToolUse" ? "prompts" : null;
  const silent = moment !== null && !assist.moments[moment];
  if (silent) freshChecks = 0;

  // A subagent shares its parent's `session_id`, so keying dedupe on that
  // alone would brief the first subagent and silence every one after it.
  // `agent_id` is present only inside a subagent, which is exactly the
  // distinction needed.
  const session = String(payload.session_id ?? "unknown");
  const agentId = typeof payload.agent_id === "string" ? payload.agent_id : null;
  // Codex and Cursor tell only their hooks which session this is, so the MCP
  // server reads it from here when it files a checkpoint.
  if (payload.session_id) noteSession(agent, root, session);
  const seen = claimed(agentId ? `${session}--${agentId}` : session);
  if (shellOnly) {
    // A command that failed in an earlier session here and was never got to
    // work there is stopped once, with that session's error, so the agent
    // chooses before it runs it again. Running it a second time goes through.
    const before = assist.moments.failures ? failedBefore(root, session, command) : null;
    if (before && !seen.has(`@repeat:${before.key}`)) {
      seen.add(`@repeat:${before.key}`);
      note({ event, session, repo, injected: true, records: [], chars: repeatReason(before).length, stopped: before.key });
      process.stdout.write(JSON.stringify(denyOutput(agent, repeatReason(before))));
    }
    process.exit(0);
  }
  // One index for the whole run, built from every record the first time a
  // block asks for it. A session start asked up to seven times, and each
  // rebuilt it.
  let index: { db: Database; records: Map<string, CheckpointRecord> } | null = null;
  const withIndex = <T,>(fn: (db: Database, records: Map<string, CheckpointRecord>) => T): T => {
    if (!index) {
      index = { db: openIndex(), records: new Map() };
      buildIndex(index.db, repo, index.records);
    }
    return fn(index.db, index.records);
  };
  // What this call may say, most important first, each with the keys it
  // claims in the session once it's said. Collected across whichever branch
  // runs, and cut to MAX_TOTAL once at the end, so a piece left out claims
  // nothing and stays sayable.
  const pieces: Array<{ text: string; claims: string[]; said?: () => void }> = [];
  const say = (text: string | null, claims: string[] = [], said?: () => void) => {
    if (text) pieces.push({ text, claims, said });
  };
  // Deduped by record id across every event. Each event used to keep its own
  // key — session start the session, prompts a hash of their rendered text,
  // files the path — so none knew what another had said. On the yodermon trial
  // one seeded dead end reached the agent at session start, again at its first
  // prompt, and a third time on the first read of the file it named.
  // Every block passes through here, so this is the one place a retired
  // record, or a retirement decision itself, is kept out of what is injected.
  // Records the agent wrote only: one saved from the raw log has no goal and
  // no reason, and briefed as "(no goal recorded)" it tells an agent nothing
  // it can act on. It stays searchable, and stuck detection, where the
  // matching error is the evidence, doesn't go through here.
  const unseen = (hits: Hit[]) => hits.filter((hit) => hit.source === "authored" && !hit.retired && !hit.retires && !seen.has(`@record:${hit.id}`));
  /** What a session or a subagent starts with: the open dead ends, and what stands. */
  const briefing = (db: Database) => [
    block("Attempts that agents stopped here, and that nobody fixed since:", unseen(openDeadEnds(db, MAX_ITEMS))),
    block("Recent work that still stands:", unseen(redToGreen(db, 2))),
  ];

  // What this session did before compaction, taken from the raw log. Claude
  // Code reports compaction as a session start and hears it there; Codex and
  // Cursor only announce it in a hook that cannot answer, so it is marked
  // then and said with the next prompt.
  const recovered = (): void => {
    const text = withIndex((db) => recovery(db, root, session));
    if (!text) seen.add("@recovered");
    say(text, ["@recovered"], () => logActivity({ kind: "recovered", repo: root, session, via: event }));
  };

  if (event === "PostCompact" || event === "PreCompact") {
    seen.forget();
    seen.add("@compacted");
  } else if (silent && event !== "SessionStart") {
    // A moment the person switched off says nothing, and claims and logs
    // nothing, so what it would have said stays sayable if they switch it
    // back on. A session start still saves and forgets, below.
  } else if (event === "SubagentStart") {
    // The agent that does the actual editing was the one getting nothing.
    //
    // A subagent starts with a fresh, isolated context window: it does not see
    // the parent's conversation, the parent's tool results, or anything this
    // hook injected into the parent. Measured here in one day — 902 captured
    // events under a single session id while seven subagents ran and edited
    // files. Injection reached the orchestrator and stopped there.
    //
    // Relying on the parent to pass the warning along does not work either.
    // Measured elsewhere, a handoff keeps the facts and drops the constraints
    // governing them, and the two survive independently — so a summarising
    // parent carries "we tried X" and loses "…and it was abandoned".
    //
    // Same budget as a session briefing, because a subagent's context is
    // smaller than its parent's, not larger.
    for (const part of withIndex(briefing)) say(part);
  } else if (event === "SessionStart") {
    // Compaction is the moment this matters most and the one we were silent
    // for. An agent that has just been compacted has lost its tool outputs and
    // its intermediate reasoning — measured elsewhere, only about a sixth of
    // stated constraints survive it — so it is the agent most likely to walk
    // back into a dead end it already walked. Treating it as "already briefed"
    // because the session id is unchanged got that exactly backwards.
    //
    // `clear`, `resume` and `fork` are the same shape: the context is gone,
    // the session id is not.
    const source = String(payload.source ?? "startup");
    // The anvc command runs whichever copy started a session last, so after
    // an update it runs the new one. Someone who set up before there was a
    // launcher gets it here, and a push check that named the version gone
    // after an update is written again.
    installLauncher();
    refreshPrePush(root);
    // Sessions that ended without a record, and whose end never arrived (a
    // closed terminal, a crash), are saved from the raw log now. See
    // protocol/autosave.ts.
    if (source === "startup" && assist.moments.autosave) {
      try { autosave(root, { except: session }); } catch { /* next start tries again */ }
    }
    const reentry = source === "compact" || source === "clear" || source === "resume" || source === "fork";
    if (reentry) seen.forget();
    if (source === "compact" && !silent) recovered();

    if (!silent && !seen.has("@session")) {
      // Dead ends alone have almost nothing to say on a real log — on this
      // repository only one record in twenty-one is abandoned. What currently
      // works is the other half, and an agent has no other way to learn it.
      const parts = withIndex(briefing);
      // One line every session, whether or not anything matched: an agent that
      // has not been told what anvc can answer does not ask it. Measured on the
      // research: people "can't even get my agents to properly read the
      // memories they have saved locally".
      const records = withIndex((db) => summary(db).records);
      const reminder = withIndex((db) => {
        // Said in a project with nothing recorded too: the agent there hasn't
        // been told ANVC is on, and records nothing for want of being asked.
        if (!records) return "anvc is on in this repository, and it has no records yet. When you finish or stop an attempt, record it with the anvc_checkpoint tool.";
        const open = openDeadEnds(db, 999).length;
        // Retirement is named only when the person allowed it, and in the
        // words of their setting, so the agent knows whether it acts or asks.
        const mode = readPolicy(repo).retire;
        const retire = mode === "auto"
          ? " If a record is no longer true, retire it with anvc_retire and your evidence."
          : mode === "ask"
            ? " If a record is no longer true, propose to retire it with anvc_retire and your evidence. The user decides."
            : "";
        const waiting = retirements(db).pending.length;
        return `anvc: this repository has ${records} record${records === 1 ? "" : "s"}${open ? ` and ${open} open dead end${open === 1 ? "" : "s"}` : ""}. `
          + `Each was true when written. Check it before you rely on it. ${QUOTED} Before you try something again, search with anvc_search. When you finish or stop an attempt, record it with anvc_checkpoint.`
          + retire
          + (waiting ? ` ${waiting} proposed retirement${waiting === 1 ? "" : "s"} wait${waiting === 1 ? "s" : ""} for the user.` : "");
      });
      // Work another session left mid-flight, from this agent or another one.
      // Records cover what an agent chose to save; this covers the rest.
      const left = withIndex((db) => handoff(root, session, { db }));
      // After a gap of days, what happened while this agent was away.
      const last = readActivity({ repo: root, kinds: ["injected"] }).filter((r) => r.session !== session).at(-1);
      const gap = last && Date.now() - Date.parse(last.ts) > GAP_MS
        ? withIndex((db) => briefForAgent(brief(db, repo, last.ts))) : null;
      // A fresh clone fetches no records and has none of its own yet, so this
      // is said whatever the count; nothing else would say why the team's
      // records are missing.
      const untravelled = recordsTravel(repo) === false
        ? `anvc: records in this repository do not travel with git push and fetch yet, so the team's records are missing here. Tell the user to run /anvc:init (or ${anvcCommand()} init).`
        : null;
      // Results that need a look: something a locked or current one depends on
      // changed, or a decision waits for the person. The rest are one query away.
      let results: string | null = null;
      const data = dataMode(root);
      if (data.mode !== "off") {
        const all = listResults(root);
        const standing = all.filter((v) => v.status === "locked" || v.status === "current").slice(0, 50);
        const attention = [...standing.filter((v) => checkResult(served, v, all).stale), ...all.filter((v) => v.proposed)]
          .filter((v, i, list) => list.indexOf(v) === i && !seen.has(`@record:${v.id}`));
        const locked = all.filter((v) => v.status === "locked").length;
        results = [
          all.length
            ? `anvc: ${all.length} result${all.length === 1 ? "" : "s"} recorded here${locked ? `, ${locked} locked` : ""}. Before re-running an experiment or trusting a number you can't place, look it up with anvc_results.`
            : null,
          // Said where results are in use, not to every project: a code-only
          // repository that never chose this has no numbers to record. Files
          // that already hold numbers count, so a research project turned on
          // with the defaults is told too.
          all.length || data.from !== "default" || dataFiles(root, 1).length
            ? `When you produce a number someone will rely on, ${RECORD_RESULT}.`
            : null,
          resultsBlock("Results that need a look:", attention, all),
        ].filter(Boolean).join("\n");
      }
      for (const part of [reminder, untravelled, gap, left, ...parts, results]) say(part);
      // Once per project, the first time ANVC runs where work happened before it.
      const offer = catchUpOffer(root, session, records);
      if (offer) say(offer.text, [], offer.said);
      const update = updateOffer(readUpdate());
      if (update) say(update.text, [], update.said);
      seen.add("@session");
    }
  } else if (event === "UserPromptSubmit") {
    // An event confirmed to reach the model; see the note at the top.
    //
    // The prompt is read here and thrown away. Nothing derived from it is
    // written: the agent titles its own work, and a record never carries the
    // sentence that provoked it.
    const prompt = String(payload.prompt ?? "");
    if (assist.moments.briefing && seen.has("@compacted") && !seen.has("@recovered")) recovered();
    // System-injected text is not the user asking for something.
    if (assist.moments.prompts && prompt && !/^\s*<(task-notification|system-reminder|local-command)/.test(prompt)) {
      const hits = withIndex((db) => relatedTo(db, prompt, MAX_ITEMS));
      // An abandoned attempt and a kept one need different headers: "we tried
      // this and dropped it" and "this is how it is done here" are opposite
      // instructions, and one block cannot carry both.
      // Deduped on the records, not on the prompt: two differently-worded
      // questions about the same thing should not repeat the same records.
      const fresh = unseen(hits);
      const dead = fresh.filter((h) => h.status === "abandoned");
      const kept = fresh.filter((h) => h.status !== "abandoned");
      say(block("Related attempts that were abandoned:", dead));
      say(block("Related work that stands:", kept));
      // A number or a result named in the prompt: its standing, before the
      // agent goes looking or re-runs something.
      if (dataMode(root).mode !== "off") {
        const all = listResults(root);
        if (all.length) {
          const numbers = prompt.match(/\d+(?:\.\d+)?%?/g)?.filter((n) => n.replace(/\D/g, "").length >= 2) ?? [];
          const lower = prompt.toLowerCase();
          const mentioned = all.filter((v) => v.status !== "superseded" && !seen.has(`@record:${v.id}`)
            && (numbers.some((n) => sameNumber(n, v.value) || sameNumber(v.value, n))
              || v.name.toLowerCase().split(/\W+/).filter((w) => w.length > 2).every((w) => lower.includes(w))));
          say(resultsBlock("Results this mentions:", mentioned, all));
        }
      }
    }
  } else if (event === "PostToolUse" || event === "PostToolUseFailure") {
    // Stuck detection. A command failed: if its error matches a past record,
    // say what that record found and what came after it; if this session has
    // now failed the same way twice, say so before the third try. Each is said
    // once per error per session.
    const call = toolCall(payload.tool_name, (payload.tool_input ?? {}) as Record<string, unknown>);
    const ok = succeeded(payload, event, agent)
      ?? (agent === "codex" && call.tool === "Bash" ? codexExit(payload.transcript_path, call.command) : null);
    if (call.tool === "Bash" && call.command && ok === false) {
      const output = outputOf(payload) ?? "";
      const lastLine = errorLine(output);
      const key = `@stuck:${signature(`${call.command}|${lastLine}`).slice(0, 160)}`;
      if (!seen.has(key)) {
        const lines: string[] = [];
        const found: Shown = { ids: [], titles: [], verified: [] };
        const known = lastLine.length >= 8
          ? withIndex((db) => similarErrors(db, lastLine, 3)).filter((h) => !h.retired && !h.retires)
          : [];
        // Not filtered by what this session was already shown: being told of a
        // dead end at the start is not the same as being told the moment its
        // error comes back. A live run stayed silent here for that reason.
        // Each error is still said once, by its key.
        const past = known[0];
        if (past) {
          const after = withIndex((db) => succeededBy(db, past.id)).find((h) => h.status === "kept");
          const remote = remoteOf(past.ref);
          lines.push(`anvc: this error was seen before, on ${past.ts.slice(0, 10)}${remote ? `, in a record from ${remote}` : ""}. ${QUOTED} "${past.intent.replace(/\s+/g, " ").slice(0, 100)}" (${past.status})${
            past.errors[0] ? `: "${past.errors[0].replace(/\s+/g, " ").slice(0, 140)}"` : ""}.${after ? ` What worked after: "${after.intent.replace(/\s+/g, " ").slice(0, 100)}".` : ""} id ${past.id}`);
          found.ids.push(past.id);
          found.titles.push(past.intent.slice(0, 90));
        }
        const sig = signature(call.command);
        const before = sessionRows(root, session, null)
          .filter((r) => r.tool === "Bash" && r.ok === false && r.command && signature(r.command) === sig);
        // Capture runs on the same event and may already have logged this
        // failure, seconds ago; if not, it is one more than the log shows.
        const logged = before.some((r) => Date.now() - Date.parse(r.ts) < 5000);
        const times = before.length + (logged ? 0 : 1);
        if (times >= 2) {
          lines.push(`anvc: \`${call.command.split("\n")[0]!.slice(0, 80)}\` has now failed ${times} times in this session. Before another try, check what you already ruled out, or anvc_search the error.`);
        }
        if (lines.length) {
          const text = lines.join("\n");
          named.set(text, found);
          say(text, [key]);
        }
      }
    }
  } else {
    const path = targetPath(payload, repo);
    if (path && !seen.has(path)) {
      const hits = unseen(withIndex((db) => abandonedTouching(db, path, MAX_ITEMS)));
      // Only a path we actually spoke about is claimed. Claiming on a miss
      // looks like a cheap way to avoid re-querying, but it silences the hook
      // for the rest of the session on exactly the files that matter: an agent
      // opens a file, finds nothing recorded, works, abandons the approach,
      // records it, and comes back — and the one moment the dead end is worth
      // hearing is the moment the cache says "already handled". Observed on
      // this repository. A miss is cheap; a permanent silence is not.
      say(block(`Work on ${path} that was abandoned:`, hits), [path]);
    }
  }

  // Numbers in a file the agent is about to write, or that a command it ran
  // wrote: the moment to record the ones that are results, said once a file.
  if (assist.moments.results && event !== "SessionStart" && event !== "PreCompact" && event !== "PostCompact" && dataMode(root).mode !== "off") {
    const fresh = new Set(writtenData(root, session, (p) => seen.has(`@data:${p}`)));
    const target = event === "PreToolUse" && /^(Write|Edit|MultiEdit)$/.test(tool) ? targetPath(payload, repo) : null;
    if (target && isDataPath(target) && !seen.has(`@data:${target}`)) {
      const input = (payload.tool_input ?? {}) as { content?: unknown; new_string?: unknown; edits?: Array<{ new_string?: unknown }> };
      const text = [input.content, input.new_string, ...(input.edits ?? []).map((e) => e.new_string)].filter((t) => typeof t === "string").join("\n");
      if (holdsNumbers(text)) fresh.add(target);
    }
    if (fresh.size) say(dataLine([...fresh]), [...fresh].map((p) => `@data:${p}`));
  }

  // When a session starts, and with a prompt after compaction, since Codex
  // and Cursor report compaction only in a hook that can't answer.
  const restart = event === "SessionStart" || (event === "UserPromptSubmit" && seen.has("@compacted"));
  /** A block said when a session starts and again after compaction. It's claimed once made, even empty, unless `claimEmpty` is false. */
  const once = (key: string, on: boolean, make: () => string | null, claimEmpty = true) => {
    if (!on || !restart || seen.has(key)) return;
    const said = make();
    if (said) say(said, [key]);
    else if (claimEmpty) seen.add(key);
  };

  // What's in progress, done recently and up next (protocol/status.ts), at
  // the same moments as the goals and ahead of them: after compaction it's
  // what the person otherwise asks for every twenty turns.
  once("@status", assist.moments.status, () => withIndex((db, records) => statusBrief(readStatus(root, { db, records }), session, MAX_CHARS)));

  // The project's goals, when a session starts and again after compaction,
  // whether or not the briefing is on: after compaction they're what the
  // person otherwise has to say again.
  once("@goals", assist.moments.goals, () => withIndex((db) => goalsBrief(readGoals(db), MAX_CHARS)), false);

  // Writing rules (protocol/rules.ts), under their own moment, so they're
  // given where the moments above are off: the list when a session or a
  // subagent starts, and a rule set's text the first time the agent is about
  // to write what it covers. A commit is seen in its git command, before it
  // runs; its message is already written, so the agent is asked to amend.
  if (assist.moments.rules) {
    const target = event !== "PreToolUse" ? null
      : tool === "Bash" ? COMMIT
      : /^(Edit|MultiEdit|Write|NotebookEdit)$/.test(tool) ? targetPath(payload, repo) : null;
    // What it claims waits, like the rest, for the total to decide.
    const claims: string[] = [];
    say(rulesContext(repo, event, target, { has: (key) => seen.has(key) || claims.includes(key), add: (key) => claims.push(key) }), claims);
  }

  // When to use which tool, from the project's notes (protocol/tools.ts),
  // within the same budget as any block. The agent knows its tools; this is
  // what it loses at compaction.
  once("@tools", assist.moments.tools, () => notesBriefing(root, MAX_CHARS));

  // Said once, above everything shown: these are evidence from the past, not
  // instructions. See line(). Credit after it, the way an agent cites a doc it
  // read. Without it the person never learns that anvc changed anything, and
  // a tool whose effect nobody sees gets uninstalled.
  const head = `anvc: past records from this repository. ${QUOTED} Each was true when written. Check it before you rely on it.`;
  const credit = "If any of this changes what you do, tell the user it came from anvc.";
  // Pieces in order until the next would pass MAX_TOTAL, with room kept for
  // the head and the credit. One that doesn't fit is left out whole, and a
  // later, shorter one can still go in.
  let room = MAX_TOTAL - head.length - credit.length - 4;
  const kept: typeof pieces = [];
  for (const p of pieces) if (p.text.length + 2 <= room) { kept.push(p); room -= p.text.length + 2; }
  let text = kept.map((p) => p.text).join("\n\n") || null;
  const shown: Shown = { ids: [], titles: [], verified: [] };
  for (const [said, s] of named) {
    if (!kept.some((p) => p.text.includes(said))) continue;
    shown.ids.push(...s.ids); shown.titles.push(...s.titles); shown.verified.push(...s.verified);
  }
  // Claimed only once the budget has decided what was shown: a record or a
  // block dropped for length was not said, and must stay sayable.
  for (const p of kept) { for (const key of p.claims) seen.add(key); p.said?.(); }
  for (const id of shown.ids) seen.add(`@record:${id}`);

  if (shown.ids.length) {
    if (!text!.includes(QUOTED)) text = `${head}\n\n${text}`;
    text = `${text}\n\n${credit}`;
    logActivity({
      kind: "injected", repo: root, session, via: event,
      ...(agentId ? { agent_id: agentId } : {}),
      records: shown.ids, titles: shown.titles,
    });
  }

  // Every invocation, hit or miss. The miss rows are the denominator, and
  // without them "injection helped" has no rate to be stated as.
  const out = text ? printable(text) : null;
  note({
    event,
    session,
    ...(agentId ? { agent_id: agentId } : {}),
    repo,
    injected: Boolean(out),
    records: shown.ids,
    chars: out?.length ?? 0,
    ...(shown.verified.length ? { verified: shown.verified } : {}),
  });

  // Silence is the default and the common case. Saying nothing costs nothing;
  // saying something irrelevant costs accuracy.
  if (out) process.stdout.write(JSON.stringify(contextOutput(agent, event, out)));
} catch (error) {
  // A broken injector must never break a tool call or a session.
  try { process.stderr.write(`anvc-inject: ${error instanceof Error ? error.name : "error"}\n`); } catch { /* ignore */ }
}
