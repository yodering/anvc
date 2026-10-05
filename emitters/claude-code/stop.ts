#!/usr/bin/env bun
/**
 * Asks an agent once to record the attempt it just made.
 *
 * Everything downstream depends on checkpoints, and a line in the project's
 * instructions is not enough to get them. On the yodermon trial Opus 5.5
 * checkpointed unprompted and Sonnet 5 did not, with the same `AGENTS.md`
 * line; Sonnet's own summary says it knew the repository asked for one.
 *
 * So when the agent is about to stop, and this session edited files in the
 * repository and recorded nothing, the stop is blocked with a reason. Claude
 * Code hands the reason to the agent as the reason to continue.
 *
 * Once per session, and never twice in a row. An agent that declines is not
 * asked again, because a hook that argues every turn costs a model turn every
 * turn, and a user who sees it argue turns it off.
 *
 * What counts is read from the session transcript, whose shape was checked
 * against both trial sessions: an assistant line whose `message.content` holds
 * `tool_use` blocks by tool name. An edit counts only inside the repository:
 * run 1's agent wrote a scratch script under /tmp, and that is not work on the
 * project. A checkpoint counts if the agent called the tool or if a record
 * exists under this session's refs, whichever is found.
 *
 * Wire it as Stop.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { refFor } from "../../protocol/record";
import { gitOrNull, leftBehindLine, recordsLeftBehind } from "../../protocol/git";
import { appendDaily, logActivity, readActivity, receipt } from "../../protocol/activity";
import { capturedEdits } from "../../protocol/handoff";
import { keepSession } from "../../protocol/keep";
import { missingCursorPrompts } from "../../protocol/backfill";
import { autosave } from "../../protocol/autosave";
import { absorbLater } from "../../protocol/absorb";
import { readAssist } from "../../protocol/assist";
import { tellOnce } from "../../protocol/folders";
import { captureFile, captureRows, inRepo, metricsRoot, stateRoot } from "../../protocol/rawlog";
import { readPolicy } from "../../protocol/policy";
import { scrub } from "../../protocol/scrub";
import { shellWord } from "../../protocol/args";
import { anvcCommand, checkDaily, hooksBehind, managedBy, readUpdate, updateLine } from "../../protocol/version";
import { continueOutput, continuing, hookInput, hookRepo, noticeOutput, patchPaths } from "../../protocol/agents";
import { openItems } from "../../protocol/status";
import { hitsById, printable, withIndex } from "../../protocol/query";

const EDITS = new Set(["Edit", "MultiEdit", "Write", "NotebookEdit", "StrReplace"]);
/**
 * `mcp__anvc__anvc_checkpoint` under Claude Code. Other agents join the
 * server name and the tool differently, and the server may be registered
 * under another name, so match the tool, not the prefix.
 */
const CHECKPOINT = /(^|__|[./:])anvc_checkpoint$/;

/** Which repository files the session edited, and whether it called anvc_checkpoint. */
function readTranscript(path: string, repo: string, cwd: string): { edited: Set<string>; checkpointed: boolean } {
  const edited = new Set<string>();
  let checkpointed = false;
  const toRepo = inRepo(repo);
  const add = (raw: unknown) => {
    const rel = typeof raw === "string" && raw ? toRepo(resolve(cwd, raw)) : null;
    if (rel) edited.add(rel);
  };
  for (const line of readFileSync(path, "utf8").split("\n")) {
    // Codex writes `response_item` lines: a function or custom tool call with
    // its name, and `apply_patch` carrying the patch whose headers name files.
    // Newer Codex reports a finished MCP call or file change as an item.
    if (line.includes('"item_completed"')) {
      let row: { payload?: { item?: Record<string, unknown> } };
      try { row = JSON.parse(line); } catch { continue; }
      const item = row.payload?.item;
      if (item?.type === "McpToolCall" && CHECKPOINT.test(String(item.tool ?? ""))) checkpointed = true;
      if (item?.type === "FileChange") {
        const changes = item.changes;
        const files = Array.isArray(changes)
          ? changes.map((c) => (c as { path?: unknown })?.path)
          : changes && typeof changes === "object" ? Object.keys(changes) : [];
        for (const file of files) add(file);
      }
      continue;
    }
    if (line.includes('"response_item"')) {
      let row: { type?: string; payload?: Record<string, unknown> };
      try { row = JSON.parse(line); } catch { continue; }
      const p = row.payload;
      if (row.type !== "response_item" || !p) continue;
      if (p.type !== "function_call" && p.type !== "custom_tool_call") continue;
      const name = String(p.name ?? "");
      if (CHECKPOINT.test(name)) checkpointed = true;
      if (name === "apply_patch") {
        const patch = typeof p.input === "string" ? p.input : typeof p.arguments === "string" ? p.arguments : "";
        for (const file of patchPaths(patch)) add(file);
      }
      continue;
    }
    if (!line.includes("tool_use")) continue;
    let entry: { type?: string; role?: string; message?: { content?: unknown } };
    try { entry = JSON.parse(line); } catch { continue; }
    // Cursor's lines name the speaker in `role`, Claude Code's in `type`.
    if ((entry.type ?? entry.role) !== "assistant" || !Array.isArray(entry.message?.content)) continue;
    for (const block of entry.message.content as Array<Record<string, unknown>>) {
      if (block?.type !== "tool_use" || typeof block.name !== "string") continue;
      // `mcp__anvc__anvc_checkpoint` under Claude Code; the server may be
      // registered under another name, so match the tool, not the prefix.
      if (CHECKPOINT.test(block.name)) checkpointed = true;
      if (!EDITS.has(block.name)) continue;
      const input = (block.input ?? {}) as Record<string, unknown>;
      add(input.file_path ?? input.notebook_path ?? input.path);
    }
  }
  return { edited, checkpointed };
}

/** Whether a record was already written under this session's run id. */
function hasRecord(repo: string, session: string): boolean {
  // Either tier counts: a checkpoint kept private is still a checkpoint.
  // One git call that stops at the first ref, rather than listing each tier.
  const prefixes = (["shared", "private"] as const).map((t) => refFor(session, 1, t).replace(/\/\d+$/, "/"));
  return Boolean(gitOrNull(repo, ["for-each-ref", "--count=1", "--format=%(refname)", ...prefixes]));
}

function addCursorPrompts(repo: string, session: string, transcript: string): void {
  if (readPolicy(repo).fields.prompts === "off") return;
  const now = Date.now();
  const days = [now - 86_400_000, now].map((t) => new Date(t).toISOString().slice(0, 10));
  const missing = missingCursorPrompts(transcript, session, repo, captureRows(repo, undefined, days), scrub);
  if (!missing.length) return;
  const file = captureFile(repo, missing[0]!.ts.slice(0, 10));
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  appendFileSync(file, missing.map((r) => JSON.stringify(r)).join("\n") + "\n", { mode: 0o600 });
}

try {
  const input = await hookInput();
  if (!input) process.exit(0);
  const { payload, event, agent, cwd } = input;
  // Claude Code sets this when the agent is already continuing because a Stop
  // hook blocked. Blocking again is the loop the flag exists to prevent. The
  // stop is still counted: it is the one that shows whether asking worked.
  const continued = continuing(payload);
  const transcript = typeof payload.transcript_path === "string" ? payload.transcript_path : "";
  // Not a repository, or one ANVC is turned off for: nothing is kept or asked for here.
  const here = hookRepo(cwd);
  if (!here) process.exit(0);
  const { repo, root } = here;

  const session = String(payload.session_id ?? "unknown");
  // A private copy of the session, at most one turn behind, so the agent
  // deleting its own after 30 days loses nothing.
  const ending = event === "SessionEnd" || payload.hook_event_name === "sessionEnd";
  if (transcript) keepSession(root, agent, session, transcript, { force: ending });
  // The session is over: nothing to ask, only the final copy to make, and
  // for Cursor's print mode the prompts its hooks never sent.
  // Then whatever the agent finished without recording is saved from the
  // raw log, so it is kept and marked as having no reason.
  const assist = readAssist(root);
  // Goals and writing rules from what's new, when the person turned that on:
  // in the background, so this stop isn't held up.
  absorbLater(root, existsSync(join(import.meta.dir, "cli.js")) ? join(import.meta.dir, "cli.js") : join(import.meta.dir, "../../protocol/cli.ts"));
  if (ending) {
    if (agent === "cursor" && transcript) addCursorPrompts(root, session, transcript);
    if (assist.moments.autosave) {
      try { autosave(root, { session }); } catch { /* the next session start catches it */ }
    }
    process.exit(0);
  }
  const { edited, checkpointed: called } = transcript && existsSync(transcript)
    ? readTranscript(transcript, repo, cwd)
    : { edited: new Set<string>(), checkpointed: false };
  // The capture log saw the same edits, for agents whose session files this
  // cannot read.
  for (const file of capturedEdits(root, session)) edited.add(file);
  const checkpointed = called || (edited.size > 0 && hasRecord(repo, session));

  const stateDir = stateRoot();
  const marker = join(stateDir, `${session.replace(/[^\w.-]/g, "-")}.stop`);
  const asked = existsSync(marker);
  // Items this session marked in progress (protocol/status.ts) are part of the
  // same one reminder: a session that recorded its work can still leave one
  // open that it finished.
  const due = assist.moments.remind && edited.size > 0 && !asked && !continued;
  const open = due ? openItems(root, session) : [];
  const ask = due && (!checkpointed || open.length > 0);

  // One row per stop, asked or not, beside inject's rows. The rows answer the
  // question the week of use is for: what share of sessions that edited files
  // ended with a record, and whether asking changed it.
  appendDaily(metricsRoot(), { event: "Stop", session, repo, edited: edited.size, checkpointed, asked: ask, ...(continued ? { continued } : {}) });

  if (ask) logActivity({ kind: "nudged", repo: root, session });

  if (!ask && assist.moments.notices) {
    // What anvc did since the last receipt in this session. Shown to the
    // person, not the model: Claude Code displays `systemMessage` in the
    // terminal. This is where someone learns anvc did anything at all.
    const seenFile = join(stateDir, `${session.replace(/[^\w.-]/g, "-")}.receipt`);
    let since = "";
    try { since = existsSync(seenFile) ? readFileSync(seenFile, "utf8").trim() : ""; } catch { /* first receipt */ }
    const now = new Date().toISOString();
    const done = receipt(readActivity({ repo: root, session, since: since || undefined }),
      (ids) => withIndex(repo, (db) => new Map(hitsById(db, ids).map((h) => [h.id, h.status]))));
    // About anvc itself, once a day per repository: an update is ready, or
    // this repository's hooks are older than the anvc running them.
    checkDaily();
    const dayFile = join(stateDir, `notice-${repo.replace(/[^\w.-]/g, "-")}`);
    const today = new Date().toISOString().slice(0, 10);
    let told = "";
    try { told = readFileSync(dayFile, "utf8").trim(); } catch { /* not told today */ }
    const about = told === today || process.env.ANVC_NO_UPDATE_NOTICE ? [] : [
      updateLine(readUpdate()),
      // The plugin's hooks are the plugin's own, so they're as new as it is.
      managedBy() !== "plugin" && hooksBehind(repo, agent) ? `This repository's ANVC hooks are older than ANVC. Run: ${anvcCommand()} update` : null,
      leftBehindLine(recordsLeftBehind(repo)),
    ].filter(Boolean);
    if (about.length) { try { mkdirSync(stateDir, { recursive: true }); writeFileSync(dayFile, today); } catch { /* said again tomorrow */ } }
    // Once per folder: ANVC runs in every repository once installed, so the
    // person hears where it is on and how to turn it off. Cursor's stop hook
    // has nowhere to show a line, so the work log's switch is its only notice.
    const here = agent !== "cursor" && !process.env.ANVC_NO_UPDATE_NOTICE && tellOnce(root)
      ? `ANVC is on for this project. To turn it off: ${managedBy() === "plugin" ? "/anvc:off" : `${anvcCommand()} off --repo ${shellWord(root)}`}, or the switch in the work log.`
      : null;
    const text = [done, ...about, here].filter(Boolean).join("\n") || null;
    const notice = text ? noticeOutput(agent, text) : null;
    if (notice) {
      try { mkdirSync(stateDir, { recursive: true }); writeFileSync(seenFile, now); } catch { /* repeats next time; harmless */ }
      process.stdout.write(JSON.stringify(notice));
    }
  }

  if (ask) {
    try {
      mkdirSync(stateDir, { recursive: true });
      writeFileSync(marker, new Date().toISOString());
    } catch {
      // Without the marker this would ask on every stop. Staying quiet is the
      // cheaper failure.
      process.exit(0);
    }
    const files = edited.size === 1 ? "1 file" : `${edited.size} files`;
    const items = open.map((i) => `"${printable(i.title)}"`).join(", ");
    const marked = open.length === 1 ? `an item marked in progress: ${items}` : `${open.length} items marked in progress: ${items}`;
    process.stdout.write(JSON.stringify(continueOutput(agent, checkpointed
      ? `This session edited ${files} in ${basename(repo)} and still has ${marked}. `
        + "If one is finished, mark it done with the anvc_status_item tool. If not, there's nothing to do."
      : `This session edited ${files} in ${basename(repo)} and recorded no attempt. `
        + "The repository asks you to call the anvc_checkpoint tool (from the anvc MCP server) once an attempt is finished or abandoned: "
        + "a one-line goal, kept or abandoned, and what was ruled out on the way. "
        + (open.length ? `It also has ${marked}; mark one done with anvc_status_item when it's finished. ` : "")
        + "If the work is still in progress, there is nothing to record yet.")));
  }
} catch (error) {
  // A broken hook must never keep a session from stopping.
  try { process.stderr.write(`anvc-stop: ${error instanceof Error ? error.name : "error"}\n`); } catch { /* ignore */ }
}
