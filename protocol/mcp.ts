#!/usr/bin/env bun
/**
 * MCP server exposing the six queries over refs/anvc/*.
 *
 * This is the point of the protocol: an agent starting fresh on a repository
 * can ask what was already tried and what failed, instead of rediscovering it.
 * `abandoned_touching` is the tool no competitor can offer, because an
 * abandoned attempt produces no commit and cannot be found by walking history.
 *
 * Speaks MCP over stdio: newline-delimited JSON-RPC 2.0 on stdin and stdout.
 * Nothing is written to stdout except protocol messages, so diagnostics go to
 * stderr.
 */
import { isAbsolute, join, resolve } from "node:path";
import { abandonedCount, abandonedTouching, changedSince, deadEnds, failed, forRepo, overlap, printable, redToGreen, remoteOf, revisions, session, succeededBy, tried, why, type Hit } from "./query";
import { ingest, readCapture } from "./ingest";
import { logActivity, repoRoot } from "./activity";
import { currentSession } from "./agents";
import { below, captureFiles, realInside, samePath } from "./rawlog";
import { fillEvidence, sessionRows } from "./evidence";
import { searchRaw, searchRecords } from "./search";
import { splitLine, whyLine } from "./blame";
import { readPolicy } from "./policy";
import { folderOn } from "./folders";
import { checkResult, dataMode, describe, listResults, recordResult, recordStatus, whence, type Actor } from "./results";
import { checkDocument, describeRow } from "./check";
import { runnable } from "./recheck";
import { mainStep } from "./runs";
import { changedLines } from "./drift";
import { agentRetire, headAnchor } from "./retire";
import { GOAL_TOOLS, goalTool } from "./goals";
import { RULE_TOOLS, ruleTool } from "./rules";
import { appendRecord, defaultTier, readRecords, RESULT_STATUSES, RETIRE_REASONS, ulid, MAX_DETAIL_BYTES, MAX_DETAIL_ITEMS, MAX_EVIDENCE, type CheckpointRecord, type FailureScope, type ResultStatus, type Tier } from "./record";
import { existsSync, readFileSync, statSync } from "node:fs";
import { TOOL_TOOLS, toolTool } from "./tools";
import { ALONGSIDE, STATUS_TOOLS, statusTool } from "./status";
import { openWorkLog } from "./open";
import { anvcCommand } from "./version";
import { SOURCE_TOOLS, sourcesSection, sourceTool } from "./sources";

/**
 * The repository records go to: ANVC_REPO, else the top of the repository the
 * agent started this server in. Codex registers MCP servers globally, so its
 * config cannot name one repository, and a session started in a subdirectory
 * would otherwise file records against the subdirectory.
 */
const repo = resolve(process.env.ANVC_REPO
  ?? (Bun.spawnSync(["git", "rev-parse", "--show-toplevel"], { stdout: "pipe", stderr: "ignore", windowsHide: true }).stdout.toString().trim()
    || process.cwd()));

/**
 * A path an agent passed, as a repository-relative path.
 *
 * The tool asks for repository-relative paths, but an agent started in a
 * subdirectory passes paths relative to where it is: Codex, run from src/,
 * recorded src/math.ts as math.ts. A path that exists from the repository root
 * is taken as given; otherwise one that exists from the agent's directory is
 * rebased; an absolute path inside the repository is made relative.
 */
function repoPath(path: string): string {
  if (isAbsolute(path)) {
    // Through symlinks, since git reports /private/var where an agent on macOS
    // may pass /var.
    return below(samePath(repo), existsSync(path) ? samePath(path) : path) ?? path;
  }
  if (existsSync(resolve(repo, path))) return path;
  const fromHere = below(samePath(repo), resolve(samePath(process.cwd()), path));
  return fromHere !== null && existsSync(resolve(repo, fromHere)) ? fromHere : path;
}

/** Which agent wrote a record. Claude Code is recognised by its session variable. */
const agentName = process.env.ANVC_AGENT ?? (process.env.CLAUDE_CODE_SESSION_ID ? "claude-code" : "unknown");

/**
 * The session this server's checkpoints are filed under.
 *
 * It used to fall back to the literal "agent", and the MCP config `setup`
 * prints never set ANVC_SESSION, so every checkpoint on a machine landed under
 * refs/anvc/agent/. Every session then read as one session, and two machines
 * each claimed refs/anvc/agent/000001, so the second push of records failed.
 *
 * Claude Code sets CLAUDE_CODE_SESSION_ID in the environment of the MCP servers
 * it starts. Measured on 2.1.282: it matches the `session_id` the capture hook
 * records, so a checkpoint and the captured events of its session now share a
 * run id. An agent that sets neither still gets an id no other process holds.
 */
/** The same repository key the hooks log under, whichever worktree this runs in. */
const activityRepo = repoRoot(repo) ?? repo;
/**
 * Codex and Cursor give the session id to hooks only, so their hooks write it
 * down and it is read here. Read per call rather than at startup: the server
 * can start before the first hook runs, and a resumed session changes it.
 */
const ownId = `mcp-${ulid()}`;
const runId = () => process.env.ANVC_SESSION ?? process.env.CLAUDE_CODE_SESSION_ID
  ?? currentSession(agentName, activityRepo) ?? ownId;

/**
 * Whether this process is older than the code it claims to be running.
 *
 * An MCP server starts once and lives as long as the agent session, so a
 * server started before an upgrade keeps serving the old schema from memory.
 * Comparing what was asked for against what was stored catches that — but only
 * in a build that contains the comparison, which a stale process by definition
 * does not.
 *
 * Measured here the hard way: every field added today was written on every
 * checkpoint for ten hours and stored on none of them, by a server that
 * predated both the fields and the check meant to notice their absence. The
 * file's own mtime against this process's start is the one signal that works
 * across versions, because it does not depend on the running code knowing
 * anything about the new one.
 */
function runningStaleBuild(): boolean {
  try {
    const source = Bun.fileURLToPath(import.meta.url);
    const changed = statSync(source).mtimeMs;
    const started = Date.now() - process.uptime() * 1000;
    return changed > started;
  } catch {
    return false;
  }
}
const PROTOCOL_VERSION = "2024-11-05";

/** Where a part sits on the project map, left to right. */
const LAYERS = ["edge", "core", "store", "tool", "surface"] as const;

const TOOLS = [
  { name: "anvc_why", description: "Why does this file, or this line, look like this? For a path, the intents behind every recorded change to it. For path:line, the commit that last changed the line and the attempts behind that commit, abandoned ones included: read it before rewriting a line back the way it was.",
    inputSchema: { type: "object", properties: { path: { type: "string", description: "Repository-relative or absolute file path, optionally with :line, as in src/api.ts:42" }, limit: { type: "number" } }, required: ["path"] } },
  {
    name: "anvc_search",
    description:
      "Search everything anvc holds: every record's goal, reason, errors, full output, commands and files, this repository's private log of past commands and their output, and the pages and documents agents read here. "
      + "Use it before retrying something, and when an error looks familiar: paste the error line. Line numbers, addresses and temp paths are ignored, so the same error from another run matches. A date such as 2026-10-07 keeps what was recorded that day, and a date alone lists it.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "Words, a file path, an error message or a date." }, limit: { type: "number" } }, required: ["query"] },
  },
  { name: "anvc_tried", description: "What has already been attempted for a goal? Full-text search over recorded intent. Use before starting work to avoid repeating an approach.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "number" } }, required: ["query"] } },
  { name: "anvc_dead_ends", description: "What has been abandoned in this repository? Needs no search term. Call this before starting any non-trivial task: a dead end is invisible to git log, and rediscovering one costs the work that was already thrown away.",
    inputSchema: { type: "object", properties: { limit: { type: "number" } } } },
  { name: "anvc_failed", description: "Which attempts failed, and with what error? Optionally filtered by text.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "number" } } } },
  { name: "anvc_red_to_green", description: "Which attempts turned a failing test suite green? The repair record.",
    inputSchema: { type: "object", properties: { limit: { type: "number" } } } },
  { name: "anvc_abandoned_touching", description: "What work on this path was abandoned? Abandoned attempts produce no commit, so they cannot be found in git log — this is the only way to see them.",
    inputSchema: { type: "object", properties: { path: { type: "string" }, limit: { type: "number" } }, required: ["path"] } },
  { name: "anvc_session", description: "Replay one agent session in order.",
    inputSchema: { type: "object", properties: { run_id: { type: "string" }, limit: { type: "number" } }, required: ["run_id"] } },
  { name: "anvc_overlap", description: "File-read overlap between concurrent sessions in this repository.",
    inputSchema: { type: "object", properties: {} } },
  { name: "anvc_ingest", description: "Turn newly captured hook events into checkpoint records.",
    inputSchema: { type: "object", properties: {} } },
  { name: "anvc_open", description: "Open this project's work log in the person's browser, when they ask to see it. Returns its address; the browser is signed in without the token passing through you.",
    inputSchema: { type: "object", properties: {} } },
  {
    name: "anvc_revisions",
    description:
      "Every version of a claim, and which one is current. Records are append-only: a correction appends a new record pointing back at the old one, and the old one is never edited — so a record you are holding may already have been replaced without anything on it saying so. "
      + "Call this whenever a record you are about to rely on is marked SUPERSEDED, and whenever you want to know whether a claim still stands.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Any record id in the chain. You will get the whole chain back whichever one you name." } },
      required: ["id"],
    },
  },
  {
    name: "anvc_detail",
    description:
      "The full stored record behind a one-line summary: the verbatim output of what failed, the prose account of what was going on, what was ruled out and why, what was never investigated, and the commands that were actually run. "
      + "Nothing injected into your context carries any of this — the summaries are capped hard on purpose, and this is where the rest lives. "
      + "Worth calling whenever a recorded dead end stands between you and something you were about to do: the summary tells you an approach failed, and this tells you whether the diagnosis was right.",
    inputSchema: {
      type: "object",
      properties: { record: { type: "string", description: "The record id, as shown to you in a summary." } },
      required: ["record"],
    },
  },
  {
    name: "anvc_feedback",
    description:
      "Say whether a record you were shown was any use. Call it when a recorded attempt turns out to be wrong, stale, or irrelevant to what you are doing — those are worth far more than agreement, because nothing else can tell whether the log is actively misleading people. "
      + "A record that warned you off something that actually works is the most expensive failure this system has, and you are the only party in a position to notice.",
    inputSchema: {
      type: "object",
      properties: {
        record: { type: "string", description: "The id of the record you are judging, as shown to you." },
        verdict: {
          type: "string",
          enum: ["helped", "wrong", "stale", "irrelevant"],
          description: "wrong: the claim is untrue, or warns off something that works. stale: it was true once and the code has moved since. irrelevant: true and unrelated to this task, so it cost attention for nothing. helped: it changed what you did.",
        },
        why: { type: "string", description: "One line of what you observed. For 'wrong' or 'stale', say what you saw that the record did not predict." },
      },
      required: ["record", "verdict"],
    },
  },
  {
    name: "anvc_retire",
    description:
      "Take a record out of what agents are shown, because it is no longer true. The record stays in git and in search, marked retired; it stops being injected. "
      + "Use it when a record you were shown is out of date: a newer record replaced it, the files it is about are gone, its recheck now passes, or it is wrong. "
      + "Always give evidence: what you ran or read that the record did not predict. What happens next is the person's setting: it may retire the record, or become a proposal they approve. "
      + "Say in your reply which you did.",
    inputSchema: {
      type: "object",
      properties: {
        record: { type: "string", description: "The id of the record to retire, as shown to you." },
        reason: {
          type: "string",
          enum: Object.keys(RETIRE_REASONS),
          description: Object.entries(RETIRE_REASONS).map(([k, v]) => `${k}: ${v}`).join(" "),
        },
        evidence: { type: "string", description: "What you saw, in a line or two: the command and its result, or the file and line. For recheck-passes, quote the passing output." },
        by: { type: "string", description: "For replaced: the id of the newer record." },
      },
      required: ["record", "reason", "evidence"],
    },
  },
  {
    name: "anvc_result",
    description:
      "Record a result: a value someone will rely on, such as a number for a paper, a benchmark or a count. "
      + "Record it when you produce or report it: "
      + "the value as written, the file and key it was read from, the command and settings, the files it depends on, and why. "
      + "ANVC checks the value is really at the source and fingerprints the files, so a later reader sees whether anything changed. "
      + "To record several, pass them as `results`, one call for all of them; a field given beside the list, such as a shared command or depends, applies to each. "
      + "To change a result's status later, pass `of` with its id and the new status. Locking is the person's decision: asking for locked records a proposal. "
      + ALONGSIDE,
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "What the value is, as someone would say it: \"D accuracy\", \"Table 2 F1\"." },
        value: { type: "string", description: "The value as it is written where it is used: \"88.1%\", \"0.8812\", \"1.2 s\"." },
        status: { type: "string", enum: [...RESULT_STATUSES], description: "draft: still being worked on. current: the good one for now. locked: final, don't re-run (the person decides; you can propose it). superseded: replaced. invalid: wrong. Defaults to current." },
        of: { type: "string", description: "Only to change an existing result's status: its id. Then give status and why, nothing else. Setting it current again after checking it fingerprints its files as they are now, which clears a flag that something changed." },
        part: { type: "string", description: "The part of the project it belongs to, so only that part's changes make it stale: \"retrieval\", \"component D\"." },
        source: {
          type: "object",
          description: "The file it was read from, repository-relative, and where in it: a JSON path, with list items by number (\"test.acc\", \"runs.2.f1\"); a CSV or Markdown table's \"row/column\", the row named by its first cell, or by columns when the first cell repeats (\"benchmark=aftraj,horizon=3/auc\"); or the label on a log line. JSON with NaN in it, as Python writes it, reads fine.",
          properties: { path: { type: "string" }, key: { type: "string" } },
          required: ["path"],
        },
        command: { type: "string", description: "The command that produced it." },
        settings: { type: "object", additionalProperties: { type: "string" }, description: "Settings it was produced with: seed, learning rate, split." },
        depends: { type: "array", items: { type: "string" }, description: "Repository-relative files and folders it was computed from: the code, the data, a checkpoint. Only these make it stale when they change." },
        derived_from: { type: "array", items: { type: "string" }, description: "Ids of results it was computed from: a mean of seeds, a total." },
        replaces: { type: "string", description: "The id of an earlier result this one replaces." },
        used_in: { type: "array", items: { type: "string" }, description: "Where it is used: \"paper.tex Table 2\"." },
        why: { type: "string", description: "What it is for and what changed from the last version. For a status change, why." },
        after_the_fact: { type: "boolean", description: "True when you are recording a result you didn't see being made." },
        results: { type: "array", items: { type: "object" }, description: "Several results, each with the fields above." },
      },
    },
  },
  {
    name: "anvc_results",
    description:
      "Find recorded results and where a number came from. Pass a number as it appears (\"88.1%\") or a name (\"D accuracy\"): "
      + "you get the recorded results holding it, with their status and whether what they depend on changed since, then commands whose output printed it. "
      + "Call it before re-running an experiment or trusting a number you can't place. With no query, lists the results that are current or locked. "
      + "With a document (a README or a paper), checks every number in it and says which were found, which changed since, and which nothing here printed.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "A number as written, or words from a result's name." },
        document: { type: "string", description: "A file in this repository whose numbers to check, such as README.md or paper.tex." },
        part: { type: "string", description: "Only results in this part of the project." },
        status: { type: "string", enum: [...RESULT_STATUSES], description: "Only results with this status." },
      },
    },
  },
  {
    name: "anvc_checkpoint",
    // Loaded into context each time an agent fetches it, so every word here
    // costs every session that records: 9,001 characters became 5,781.
    description:
      "Record why you did a piece of work, when you finish it or abandon an approach. An abandoned attempt is the most valuable record: nothing else in version control keeps it. "
      + "Write the goal in your own words, like a commit subject: what you set out to do, not what the user typed. Never include secrets, personal details, or anything the user would not put in a commit message. "
      + ALONGSIDE,
    inputSchema: {
      type: "object",
      properties: {
        goal: { type: "string", description: "One line under 200 characters, in the imperative, like a commit subject." },
        outcome: { type: "string", enum: ["kept", "abandoned"], description: "kept if the work stands. abandoned if you backed it out or it did not work." },
        tier: {
          type: "string",
          enum: ["shared", "private"],
          description: "Who can read it. shared: sent with git push, to teammates and their agents. private: stays on this machine. Omit it for the repository default; if the user made that private, shared is ignored. Use private for what the user would not put in a commit, such as a customer name. Only the user can share a private record.",
        },
        why: { type: "string", description: "Why, in one or two sentences. Abandoned: why it failed. Kept: why this choice over the alternatives, which the diff can't show." },
        constraints: { type: "array", items: { type: "string" }, description: "Limits you worked under, such as an API to keep stable." },
        files: { type: "array", items: { type: "string" }, description: "Repository-relative paths this work changed." },
        tests: { type: "object", properties: { passed: { type: "number" }, failed: { type: "number" } }, description: "Test counts, if you ran tests." },
        parent: { type: "string", description: "Only for a retry after a dead end: the id of the attempt this one continues. Leave it out when the earlier work was a different problem." },
        serves: { type: "string", description: "The id of the goal (from anvc_goals) or record this work is for, when several attempts make one effort." },
        supersedes: { type: "string", description: "The id of a record this one replaces because the goal changed. The old record stays." },
        scope: { type: "string", enum: ["local", "general"], description: "Only for abandoned. local (the default): this step failed. general: the whole approach is dead. A wrong general warns people off something that works, so use it only with evidence." },
        recheck: { type: ["string", "null"], description: "Required when abandoned: one command a later agent can run to see if this is still true, such as the failing test. If nothing settles it, pass null. Don't leave it out." },
        detail: {
          type: "object",
          description: "What a one-line summary loses. Stored up to 64 KiB and never shown unasked, so be generous.",
          properties: {
            output: { type: "string", description: "The verbatim output of what failed, not your summary, so a reader can see if your diagnosis was wrong." },
            narrative: { type: "string", description: "What happened, in full sentences: what you tried, what surprised you, what you suspected." },
            ruled_out: {
              type: "array",
              description: "Approaches you set aside, each with why.",
              items: { type: "object", properties: { approach: { type: "string" }, because: { type: "string" } }, required: ["approach", "because"] },
            },
            not_investigated: { type: "array", items: { type: "string" }, description: "What you did not check, so the next reader knows where you stopped." },
            commands: { type: "array", items: { type: "string" }, description: "The commands you ran, in order." },
          },
        },
        map: {
          type: "object",
          description: "How one part of the system works, kept current. Write one when you learn how a part works, change its shape, or find its map wrong, and pass supersedes to replace the old one. Say what the part is for and why it has this shape: imports can't show that.",
          properties: {
            part: { type: "string", description: "A name a person would say, such as 'record format', not a path. Reuse an existing part's exact name: two spellings make two boxes." },
            does: { type: "string", description: "What the part is for, in one or two plain sentences." },
            layer: {
              type: "string",
              enum: [...LAYERS],
              description: "edge: touches the outside world. core: logic in the middle. store: persists things. tool: called by an agent or person. surface: what a person looks at.",
            },
            owns: { type: "array", items: { type: "string" }, description: "Repository-relative files and folders it owns. End a folder with /." },
            reads: {
              type: "array",
              description: "Parts this one depends on, and what it takes from each.",
              items: { type: "object", properties: { part: { type: "string" }, what: { type: "string", description: "Two or three words, no article: 'parsed rows'." } }, required: ["part", "what"] },
            },
            feeds: {
              type: "array",
              description: "Parts that depend on this one, and what they take.",
              items: { type: "object", properties: { part: { type: "string" }, what: { type: "string", description: "Two or three words, no article: 'captured events'." } }, required: ["part", "what"] },
            },
            decisions: {
              type: "array",
              description: "Design decisions that hold here, each with why.",
              items: {
                type: "object",
                properties: { what: { type: "string" }, because: { type: "string", description: "Why, with the number you measured if there is one." } },
                required: ["what", "because"],
              },
            },
          },
          required: ["part", "does"],
        },
        evidence: {
          type: "array",
          description: "Where this can be checked: paths, lines and commits, not prose.",
          items: {
            type: "object",
            properties: {
              path: { type: "string" },
              line: { type: "number" },
              commit: { type: "string", description: "A git oid the claim depends on." },
              note: { type: "string", description: "What to look at there." },
            },
          },
        },
      },
      required: ["goal", "outcome"],
    },
  },
  ...GOAL_TOOLS,
  ...TOOL_TOOLS,
  ...SOURCE_TOOLS,
];

/** Tools another file lists and answers: goals, tool notes, writing rules and status. */
const ANSWERED_ELSEWHERE: Array<[Array<{ name: string }>, (repo: string, name: string, args: Record<string, unknown>, actor: Actor) => string]> = [
  [GOAL_TOOLS, goalTool], [TOOL_TOOLS, toolTool], [RULE_TOOLS, ruleTool], [STATUS_TOOLS, statusTool],
];

/**
 * Rendered for a model to read, not for a UI: compact, and says what is absent.
 *
 * Everything that decides an action goes in the result itself, because a
 * reader that has to make a second call to learn whether a warning still
 * applies mostly will not make it — measured elsewhere, an escape hatch an
 * agent must elect to use has a median invocation rate of zero, and models
 * left to decide whether to fetch evidence under-fetch by about half.
 *
 * So `scope` (is this one step or the whole approach), `recheck` (the command
 * that settles it) and `evidence` (where to look) are printed inline. They are
 * short, and the alternative is an agent acting on a verdict it cannot check.
 */
function render(hits: Hit[], empty: string): string {
  if (!hits.length) return empty;
  return hits.map((h) => {
    // Private records are marked so an agent quoting one knows not to paste it
    // into a commit message or a PR a teammate will read.
    // The id is printed so the agent can pass it to anvc_detail or
    // anvc_revisions, and so the activity log can say which records it saw.
    // A fetched record says where it came from: whoever can push there wrote it.
    const remote = remoteOf(h.ref);
    const lines = [`[${h.status}${h.scope === "general" ? " · whole approach" : ""}${h.tier === "private" ? " · private" : ""}${remote ? ` · from ${remote}` : ""}] ${h.ts} id ${h.id} (${h.agent} · ${h.run}, ${h.anchor})`,
      `  ${h.source === "authored" ? "goal" : "said"}: ${h.intent.replace(/\s+/g, " ")}`];
    // A dead end that names its parent is worth following: the reader can see
    // this was one of several attempts rather than an isolated failure.
    // The forward edge, first and unmissable. Append-only means a correction
    // never touches the record it corrects, so a superseded claim looks exactly
    // like a current one — and an agent will act on it. This is the line that
    // stops that.
    if (h.superseded_by) {
      lines.push(`  SUPERSEDED — a later record replaced this. Call anvc_revisions with id ${h.id} for the current version.`);
    }
    // Retired records stay findable, because the history is the point of the
    // log; they are marked so nobody acts on one as current.
    if (h.retired) lines.push(`  RETIRED (${h.retired}) — no longer true here. Kept for history; do not act on it.`);
    if (h.retires) lines.push(`  a retirement decision about record ${h.retires}`);
    if (h.parent) lines.push(`  continued from: ${h.parent}`);
    if (h.serves) lines.push(`  serves goal: ${h.serves}`);
    if (h.files.length) lines.push(`  files: ${h.files.join(", ")}`);
    // What moved since, as a fact: the record may still hold, but the code it
    // describes is not the code it was written about.
    const moved = knownRepo ? changedSince(repo, h) : [];
    if (moved.length) lines.push(`  changed since it was written: ${moved.join(", ")}`);
    // The changed lines themselves, where they touch what the record names:
    // evidence an agent acts on, where a list of files isn't.
    const drift = moved.length ? changedLines(repo, h, 6) : [];
    if (drift.length) lines.push("  since then, lines naming what this record relies on changed, so it may no longer be true:", ...drift.map((l) => `    ${l}`));
    // The reason, labelled as one. A kept record's reason used to be printed
    // as "error:", since it also fills the errors column for search.
    if (h.why) lines.push(`  why: ${h.why.replace(/\s+/g, " ")}`);
    for (const error of h.errors) if (!h.why?.includes(error)) lines.push(`  error: ${error}`);
    // The half that turns a verdict into something falsifiable.
    // Only a command the allowlist accepts is handed over as one to run.
    if (h.recheck) lines.push(runnable(h.recheck) ? `  still true? run: ${h.recheck}` : "  records a check anvc won't run");
    return lines.join("\n");
  }).join("\n\n");
}

const withIndex = forRepo(repo);

/**
 * Whether the server knows which repository it serves. Installed for every
 * project, it can be started outside one (a home folder), or with a config
 * variable the agent never filled in. Guessing then is how one project's
 * records end up read or written in another, so it says so and does nothing.
 */
const revParse = (flag: string) => Bun.spawnSync(["git", "-C", repo, "rev-parse", flag], { stdout: "pipe", stderr: "ignore", windowsHide: true })
  .stdout.toString().trim();
// samePath, so a short Windows name such as RUNNER~1 matches git's long one.
const sameDir = (a: string, b: string) => existsSync(a) && existsSync(b) && samePath(a) === samePath(b);
const knownRepo = !repo.includes("${") && (sameDir(revParse("--show-toplevel") || "\0", repo) || revParse("--is-bare-repository") === "true");

/**
 * The plugin's server in a project that registers ANVC's server itself, as
 * ANVC's own checkout does in .mcp.json. Both would run, and the agent would
 * see every tool twice, so the plugin's copy offers none there.
 */
const shadowed = process.env.ANVC_PLUGIN === "1" && (() => {
  try { return Boolean((JSON.parse(readFileSync(join(repo, ".mcp.json"), "utf8")) as { mcpServers?: Record<string, unknown> }).mcpServers?.anvc); }
  catch { return false; }
})();

const unknownRepo = `ANVC can't tell which git repository this session is in (it was started in ${repo}), so it reads and records nothing. Open the project folder itself.`;

/**
 * Opens the work log for the person, even where ANVC is off, since the work
 * log is where it's turned back on. The answer goes into the agent's
 * transcript, so it has no token in it; the browser signs in with a code.
 */
async function openTool(): Promise<string> {
  if (!knownRepo) return unknownRepo;
  try {
    const o = await openWorkLog(repo);
    return o.browser
      ? `Opened the work log for ${o.repo} in the browser, at ${o.url}.`
      : `The work log for ${o.repo} is on ${o.url}. There's no display here to open it on. For a link that signs in, the person can run ${anvcCommand()} open --no-browser in a terminal.`;
  } catch (error) { return error instanceof Error ? error.message : String(error); }
}

function callTool(name: string, args: Record<string, unknown>): string {
  if (!knownRepo) return unknownRepo;
  if (!folderOn(repoRoot(repo) ?? repo)) return "ANVC is off in this folder, so it reads and records nothing here. The person can turn it on in the work log.";
  const limit = typeof args.limit === "number" ? args.limit : 10;
  const answer = ANSWERED_ELSEWHERE.find(([tools]) => tools.some((t) => t.name === name))?.[1];
  if (answer) return answer(repo, name, args, { kind: "agent", agent: agentName, session: runId() });
  switch (name) {
    case "anvc_revisions": {
      const id = String(args.id ?? "");
      if (!id) throw new Error("id is required");
      return withIndex((db) => {
        const { current, chain } = revisions(db, id);
        if (!chain.length) return `No record with id ${id}.`;
        if (chain.length === 1) return `${render(chain, "")}\n\n  This is the only version. Nothing has replaced it.`;
        const head = current === id
          ? `You named the current version. It replaced ${chain.length - 1} earlier one${chain.length === 2 ? "" : "s"}.`
          : `The record you named is NOT current. The current version is ${current}.`;
        return `${head}\n\n${chain.map((h, i) =>
          `${i === 0 ? "[current]" : `[replaced, v${chain.length - i}]`}\n${render([h], "")}`).join("\n\n")}`;
      });
    }
    case "anvc_detail": {
      // The other half of the two-budget split. Injection is rationed to about
      // a thousand characters because context is scarce; a record is allowed
      // 64 KiB because a git blob is not. Nothing can read the dense half
      // unless something serves it, and a field nothing can read is the `plan`
      // field all over again: present in the schema since v0, written by
      // nobody, and indistinguishable from coverage.
      const want = String(args.record ?? "");
      // Last match: a private companion is listed after its shared copy and
      // holds the fields the policy kept off the shared one.
      const [ref, found] = readRecords(repo).findLast(([, r]) => r.id === want) ?? [];
      if (!found) return `No record ${want}. Ids come from a summary line or from anvc_dead_ends.`;
      const d = found.detail;
      const remote = remoteOf(ref!);
      const lines = [`[${found.outcome.status}${remote ? ` · from ${remote}` : ""}] ${found.ts} — ${found.intent.goal ?? "(no goal)"}`];
      const retired = withIndex((db) => (db.prepare(`SELECT retired FROM records WHERE id = ?`).get(want) as { retired: string | null } | null)?.retired);
      if (retired) lines.push(`RETIRED (${retired}) — no longer true here. Kept for history; do not act on it.`);
      if (found.intent.why) lines.push(`\nwhy: ${found.intent.why}`);
      if (!d) {
        lines.push("\nNo stored detail. Written before the record carried one, or the agent did not supply it.");
        return lines.join("\n");
      }
      if (d.narrative) lines.push(`\nwhat was happening:\n${d.narrative}`);
      if (d.output) lines.push(`\nverbatim output:\n${d.output}`);
      if (d.commands?.length) lines.push(`\ncommands run:\n${d.commands.map((c) => `  ${c}`).join("\n")}`);
      if (d.ruled_out?.length) {
        lines.push(`\nruled out:\n${d.ruled_out.map((e) => `  ${e.approach} — ${e.because}`).join("\n")}`);
      }
      // Last and unmissable: this is where the previous reader stopped
      // thinking, which is the most actionable thing in the whole record.
      if (d.not_investigated?.length) {
        lines.push(`\nNOT investigated — nobody has checked these:\n${d.not_investigated.map((e) => `  ${e}`).join("\n")}`);
      }
      return lines.join("\n");
    }
    case "anvc_why": {
      const at = splitLine(String(args.path));
      if (!at) return withIndex((db) => render(why(db, String(args.path), limit), `No recorded intent touched ${String(args.path)}.`));
      const w = withIndex((db) => whyLine(db, repo, repoPath(at.path), at.line));
      const head = w.commit
        ? `Line ${w.line} of ${w.path} was last changed by ${w.commit.oid.slice(0, 10)} on ${w.commit.date.slice(0, 10)}: "${w.commit.subject}".`
        : `Line ${w.line} of ${w.path} is not committed yet.`;
      return `${head}\n\n${render(w.attempts, "No recorded attempt is behind that change. Nothing was recorded, which is not the same as nothing being tried.")}`;
    }
    case "anvc_tried":
      return withIndex((db) => {
        const found = tried(db, String(args.query), limit);
        if (found.length) return render(found, "");
        // Full-text search only matches the words someone else happened to
        // use, so an empty result means "these words did not match", not
        // "nothing was tried". Saying the former as if it were the latter is
        // how an agent talks itself into repeating an abandoned approach.
        const dead = abandonedCount(db);
        return `No record matched "${String(args.query)}". This means those words did not match, not that nothing was tried.${
          dead ? ` ${dead} abandoned attempt${dead === 1 ? " is" : "s are"} recorded; call anvc_dead_ends to see ${dead === 1 ? "it" : "them"}.` : ""}`;
      });
    case "anvc_dead_ends":
      return withIndex((db) => {
        const dead = deadEnds(db, limit);
        if (!dead.length) return "No abandoned work recorded yet.";
        // A dead end alone tells you what not to do. A dead end plus what
        // replaced it tells you what to do instead, which is the more useful
        // half and costs one query per hit.
        return dead.map((h) => {
          const after = succeededBy(db, h.id);
          const base = render([h], "");
          return after.length
            ? `${base}\n  what worked instead: ${after.map((a) => a.intent).join("; ")}`
            : base;
        }).join("\n\n");
      });
    case "anvc_failed":
      return withIndex((db) => render(failed(db, args.query ? String(args.query) : null, limit), "No recorded failures."));
    case "anvc_red_to_green":
      return withIndex((db) => render(redToGreen(db, limit), "No recorded attempt turned tests green."));
    case "anvc_abandoned_touching":
      return withIndex((db) => render(abandonedTouching(db, String(args.path), limit),
        `No abandoned work recorded on ${String(args.path)}. Note this means none was recorded, not that none happened.`));
    case "anvc_search": {
      const query = String(args.query ?? "");
      const records = withIndex((db) => searchRecords(db, query, limit));
      const raw = searchRaw(activityRepo, query, Math.min(limit, 8));
      const kept = sourcesSection(activityRepo, query);
      if (!records.length && !raw.length && !kept) {
        return `Nothing matched "${query}" in any record, in this repository's command log or in what agents read here. That means these words were not found, not that nothing was tried.`;
      }
      const parts: string[] = [];
      if (records.length) {
        parts.push(render(records, "").split("\n\n").map((block, i) => `${block}\n  matched in: ${records[i]!.matched.join(", ") || "record"}`).join("\n\n"));
      }
      if (raw.length) {
        parts.push(`From the command log (private, not records):\n${raw.map((r) =>
          `  ${r.ts.slice(0, 16).replace("T", " ")} ${r.agent}${r.ok === false ? " · failed" : ""}: ${r.command ? `$ ${r.command.split("\n")[0]!.slice(0, 120)}` : ""}${
            r.line && r.line !== r.command ? `\n    ${r.line.slice(0, 200)}` : ""}${r.more ? ` (seen ${r.more + 1} times)` : ""}`).join("\n")}`);
      }
      if (kept) parts.push(kept);
      return parts.join("\n\n");
    }
    case "anvc_session":
      return withIndex((db) => render(session(db, String(args.run_id), limit), "No such session."));
    case "anvc_overlap":
      return withIndex((db) => {
        const o = overlap(db);
        return `session pairs: ${o.pairs}, overlapping: ${o.overlapping}, ratio: ${(o.ratio * 100).toFixed(0)}%`;
      });
    case "anvc_ingest": {
      const events = captureFiles(activityRepo).flatMap((f) => readCapture(f));
      const result = ingest(repo, events);
      return `ingested ${result.written} new records (${result.skipped} already present) from ${events.length} events`;
    }
    case "anvc_feedback": {
      const target = String(args.record ?? "");
      const verdict = String(args.verdict ?? "");
      if (!["helped", "wrong", "stale", "irrelevant"].includes(verdict)) {
        throw new Error("verdict must be helped, wrong, stale or irrelevant");
      }
      if (!target) throw new Error("name the record you are judging in record");
      // A verdict is a record like any other, naming what it judges in its
      // goal. It pointed there with `supersedes`, which showed the judged
      // record as replaced, even after "helped". Never an edit: the judged
      // record stays exactly as it was written, because a log that rewrites itself cannot be audited, and a
      // wrong verdict would otherwise destroy the thing it was wrong about.
      //
      // Expect this to be called rarely. Measured elsewhere, an optional tool
      // an agent must elect to use is reached for in about a third of sessions
      // at best, so the passive metrics carry the load. The value here is not
      // the count — it is the content of a `wrong` or `stale`, which is the
      // only direct signal that the log is actively misleading somebody, and
      // the agent is the only party positioned to notice.
      const record: CheckpointRecord = {
        anvc: 0,
        id: ulid(),
        anchor: headAnchor(repo),
        session: { agent: agentName, run_id: runId() },
        intent: {
          goal: `Judged record ${target} as ${verdict}`.slice(0, 200),
          ...(args.why ? { why: String(args.why).slice(0, 2000) } : {}),
        },
        // A verdict is about a record, not about work, so it is `kept` — it
        // stands as an observation. `wrong` and `stale` are not abandoned
        // attempts; they are findings about one.
        outcome: { status: "kept" },
        ts: new Date().toISOString(),
      };
      // A verdict goes where the repository's records go by default: it is a
      // finding about shared work more often than not.
      const { ref } = appendRecord(repo, record, { tier: defaultTier(repo) });
      return `recorded verdict "${verdict}" on ${target} at ${ref}\n  id: ${record.id}`;
    }
    case "anvc_result": {
      if (dataMode(repo).mode === "off") return `Keeping track of results is off for this project. The person can turn it on in Settings or with: ${anvcCommand()} data results`;
      const actor = { kind: "agent" as const, agent: agentName, session: runId() };
      const status = typeof args.status === "string" ? args.status as ResultStatus : undefined;
      if (typeof args.of === "string" && args.of) {
        if (!status) return "Give the new status with of.";
        recordStatus(repo, args.of, status, String(args.why ?? ""), actor);
        const view = listResults(repo).find((r) => r.id === args.of)!;
        return view.proposed
          ? `Proposed marking ${view.name} ${status}. It is ${view.status} until the person decides: ${anvcCommand()} result ${status === "locked" ? "lock" : status} ${view.id}`
          : `${view.name} is now ${view.status}.`;
      }
      const strings = (x: unknown) => (Array.isArray(x) ? x.filter((v): v is string => typeof v === "string") : undefined);
      const save = (r: Record<string, unknown>) => {
        if (typeof r.name !== "string" || typeof r.value !== "string") throw new Error("A result needs a name and a value.");
        const source = r.source && typeof r.source === "object" ? r.source as { path?: string; key?: string } : undefined;
        const done = recordResult(repo, {
          name: r.name, value: r.value, status: typeof r.status === "string" ? r.status as ResultStatus : undefined,
          part: typeof r.part === "string" ? r.part : undefined,
          source: source?.path ? { path: repoPath(source.path), ...(source.key ? { key: source.key } : {}) } : undefined,
          command: typeof r.command === "string" ? r.command : undefined,
          settings: r.settings && typeof r.settings === "object"
            ? Object.fromEntries(Object.entries(r.settings as Record<string, unknown>).map(([k, v]) => [k, String(v)])) : undefined,
          depends: strings(r.depends)?.map(repoPath), derived_from: strings(r.derived_from),
          replaces: typeof r.replaces === "string" ? r.replaces : undefined, used_in: strings(r.used_in),
          why: typeof r.why === "string" ? r.why : undefined, after_the_fact: r.after_the_fact === true,
        }, actor);
        logActivity({ kind: "recorded", repo: activityRepo, session: runId(), via: "anvc_result", outcome: "result", records: [done.id], titles: [`${r.name} = ${r.value}`] });
        return done;
      };
      if (!Array.isArray(args.results)) {
        if (typeof args.name !== "string" || typeof args.value !== "string") return "A result needs a name and a value.";
        const done = save(args);
        return [`Recorded result ${args.name} = ${args.value}`, `  id: ${done.id}`, ...done.notes.map((n) => `  ${n}`)].join("\n");
      }
      // Many results in one call answer in a line, plus one for each that
      // needs a look: thirty three-line replies filled the person's screen.
      const { results, ...shared } = args;
      let recorded = 0, matched = 0;
      const problems: string[] = [];
      for (const item of results as unknown[]) {
        const r = { ...shared, ...(item && typeof item === "object" ? item : {}) } as Record<string, unknown>;
        try {
          const done = save(r);
          recorded++;
          if (done.notes.some((n) => n.startsWith("Checked: "))) matched++;
          const needs = done.notes.filter((n) => !/^(Checked: |Command taken from the log|Depends on, from)/.test(n));
          if (needs.length) problems.push(`- ${r.name} (${done.id}): ${needs.join(" ")}`);
        } catch (error) {
          problems.push(`- ${String(r.name ?? "a result")}: not recorded. ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      return [`Recorded ${recorded} of ${(results as unknown[]).length} results; ${matched} match their files.`, ...problems].join("\n");
    }
    case "anvc_results": {
      if (dataMode(repo).mode === "off") return "Keeping track of results is off for this project.";
      if (typeof args.document === "string" && args.document.trim()) {
        // Through symlinks: a link in the repository can point anywhere.
        const path = realInside(repo, args.document.trim());
        if (!path) return `${args.document} is outside this repository.`;
        const rel = below(samePath(repo), path) ?? path;
        if (!existsSync(path)) return `There's no ${rel} in this repository.`;
        const rows = checkDocument(repo, path);
        const count = (state: string) => rows.filter((r) => r.state === state);
        const at = (r: (typeof rows)[number]) => `${r.lines.length > 1 ? "lines" : "line"} ${r.lines.slice(0, 4).join(", ")}`;
        const list = (state: string, label: string) => count(state).length
          ? `${label}:\n${count(state).map((r) => `- ${r.text} (${at(r)}): ${describeRow(r)}${r.evidence ? `\n    ${r.evidence}` : ""}`).join("\n")}`
          : "";
        logActivity({ kind: "searched", repo: activityRepo, session: runId(), via: "anvc_results", query: `check ${rel}`, hits: count("found").length, records: [], titles: [] });
        return [
          `${rel}: ${rows.length} numbers checked against this repository's commands, files and results. ${count("found").length} found, ${count("changed").length} changed since, ${count("unsure").length} unsure, ${count("missing").length} not found.`,
          list("changed", "Changed since"),
          list("missing", "Not found (worked out by hand, from a run before ANVC, or from somewhere else)"),
          list("unsure", "Unsure: something printed it, but it could be something else"),
          list("found", "Found"),
        ].filter(Boolean).join("\n\n");
      }
      const all = listResults(repo);
      const query = typeof args.query === "string" ? args.query.trim() : "";
      const found = query ? whence(repo, query) : { results: all.filter((r) => r.status === "current" || r.status === "locked"), files: [], outputs: [], reads: [], elsewhere: [] };
      const picked = found.results
        .filter((r) => !args.part || r.part === args.part)
        .filter((r) => !args.status || r.status === args.status)
        .slice(0, 8);
      const parts = picked.map((r) => describe(r, checkResult(repo, r, all), all));
      if ("files" in found && found.files.length) {
        parts.push(`In files commands wrote:\n${found.files.slice(0, 5).map((f) => `- ${f.path} → ${f.key} = ${f.found}${f.changed ? " (the file changed since)" : ""}, written by ${mainStep(f.command).slice(0, 200)} (${f.ts.slice(0, 16)})`).join("\n")}`);
      }
      if (found.outputs.length) {
        parts.push(`Commands whose output printed it, oldest first. A number with few digits can match by chance, so check the line is the same thing:\n${found.outputs.slice(0, 5).map((o) => `- ${o.ts.slice(0, 16)} ${mainStep(o.command).slice(0, 200)}\n    ${o.line}`).join("\n")}`);
      } else if (found.reads.length) {
        parts.push(`Only commands that repeated it from a file or an earlier output printed it; these don't show what made it:\n${found.reads.slice(0, 3).map((o) => `- ${o.ts.slice(0, 16)} ${o.command.slice(0, 200)}\n    ${o.line}`).join("\n")}`);
      }
      if (found.elsewhere.length) {
        parts.push(`In other data files, which no logged command named:\n${found.elsewhere.slice(0, 5).map((f) => `- ${f.path} → ${f.key} = ${f.found}, last changed ${f.modified.slice(0, 16)}${f.before ? `, before ${f.before.command} finished` : ""}${f.commit ? `; in commit ${f.commit}` : ""}`).join("\n")}`);
      }
      logActivity({ kind: "searched", repo: activityRepo, session: runId(), via: "anvc_results", query, hits: picked.length, records: picked.map((r) => r.id), titles: picked.map((r) => r.name) });
      return parts.length ? parts.join("\n\n") : query
        ? `No recorded result holds or is named "${query}", and no command in this repository's log printed it. That means it wasn't found, not that it was never made.`
        : "No results recorded here yet.";
    }
    case "anvc_retire": {
      const result = withIndex((db) => agentRetire(db, repo, {
        target: String(args.record ?? ""), reason: String(args.reason ?? ""), evidence: String(args.evidence ?? ""),
        ...(args.by ? { by: String(args.by) } : {}), session: runId(), agent: agentName,
      }));
      const said = result.state === "retired"
        ? `Retired ${String(args.record)}. It is no longer shown to agents. The person can restore it with: ${anvcCommand()} retire restore ${String(args.record)}`
        : `Proposed retiring ${String(args.record)}. Nothing changes until the person approves it with: ${anvcCommand()} retire approve ${String(args.record)}\nTell them you proposed it and why.`;
      return `${said}\n  ${result.checked}\n  decision id: ${result.id} (${result.tier})`;
    }
    case "anvc_checkpoint": {
      if (args.goal !== undefined && typeof args.goal !== "string") {
        throw new Error(`goal must be a string, one line like a commit subject; received ${
          Array.isArray(args.goal) ? "an array" : typeof args.goal}`);
      }
      // Lineage is what makes a set of attempts replayable rather than a
      // pile: without it, three tries from one starting point are
      // indistinguishable from three unrelated turns.
      if (args.parent !== undefined && typeof args.parent !== "string") {
        throw new Error(`parent must be the id string of an earlier record; received ${typeof args.parent}`);
      }
      const goal = String(args.goal ?? "").trim();
      const outcome = String(args.outcome ?? "");
      if (!goal) throw new Error("goal is required");
      // Reject rather than truncate: a silently shortened goal teaches the agent
      // nothing, and the next record repeats the mistake.
      if (goal.length > 200) throw new Error(`goal is ${goal.length} characters; keep it under 200 characters, one line, like a commit subject`);
      if (!["kept", "abandoned"].includes(outcome)) throw new Error("outcome must be kept or abandoned");

      // Anchor to HEAD when it exists. An attempt that produced no commit still
      // anchors, which is the point: abandoned work has no commit to hang from.
      // --verify makes rev-parse fail on an unborn HEAD instead of echoing the
      // literal string "HEAD", which an empty repository otherwise returns.
      const head = Bun.spawnSync(["git", "-C", repo, "rev-parse", "--verify", "--quiet", "HEAD"],
        { stdout: "pipe", stderr: "ignore", windowsHide: true });
      const resolved = head.success ? head.stdout.toString().trim() : "";
      let oid = /^[0-9a-f]{40}$|^[0-9a-f]{64}$/.test(resolved) ? resolved : "";
      if (!oid) {
        // A repository with no commit yet still needs a valid anchor, so hash
        // the record's own goal: a real object the record can hang from.
        const blob = Bun.spawnSync(["git", "-C", repo, "hash-object", "-w", "--stdin"],
          { stdin: Buffer.from(goal), stdout: "pipe", stderr: "ignore", windowsHide: true });
        oid = blob.success ? blob.stdout.toString().trim() : "";
        if (!oid) throw new Error("cannot anchor a record: not a git repository");
      }

      const record: CheckpointRecord = {
        anvc: 0,
        id: ulid(),
        anchor: { kind: oid === resolved ? "commit" : "blob", oid },
        ...(args.parent ? { parent: String(args.parent) } : {}),
        ...(args.serves ? { serves: String(args.serves) } : {}),
        ...(args.supersedes ? { supersedes: String(args.supersedes) } : {}),
        session: { agent: agentName, run_id: runId(), ...(process.env.ANVC_MODEL ? { model: process.env.ANVC_MODEL } : {}) },
        intent: {
          goal,
          ...(args.why ? { why: String(args.why).slice(0, 2000) } : {}),
          ...(Array.isArray(args.constraints) && args.constraints.length ? { constraints: args.constraints.map(String).slice(0, 20) } : {}),
        },
        ...(Array.isArray(args.files) && args.files.length ? { delta: { files: args.files.map((f) => repoPath(String(f))).slice(0, 500) } } : {}),
        ...(args.map && typeof args.map === "object"
          ? (() => {
            const m = args.map as Record<string, unknown>;
            const part = String(m.part ?? "").trim();
            const does = String(m.does ?? "").trim();
            // A map with no part or no purpose describes nothing; storing it
            // would put an empty node on every view.
            if (!part || !does) return {};
            const pairs = (v: unknown, a: string, b: string) =>
              Array.isArray(v)
                ? (v as Array<Record<string, unknown>>)
                  .filter((e) => e?.[a] && e?.[b])
                  .slice(0, 30)
                  .map((e) => ({ [a]: String(e[a]).slice(0, 200), [b]: String(e[b]).slice(0, 600) }))
                : [];
            const reads = pairs(m.reads, "part", "what") as Array<{ part: string; what: string }>;
            const feeds = pairs(m.feeds, "part", "what") as Array<{ part: string; what: string }>;
            const decisions = pairs(m.decisions, "what", "because") as Array<{ what: string; because: string }>;
            return {
              map: {
                part: part.slice(0, 200),
                does: does.slice(0, 2000),
                ...(typeof m.layer === "string" && (LAYERS as readonly string[]).includes(m.layer)
                  ? { layer: m.layer as typeof LAYERS[number] } : {}),
                ...(Array.isArray(m.owns) && m.owns.length
                  ? { owns: m.owns.map(String).map((x) => x.slice(0, 300)).slice(0, 60) } : {}),
                ...(reads.length ? { reads } : {}),
                ...(feeds.length ? { feeds } : {}),
                ...(decisions.length ? { decisions } : {}),
              },
            };
          })()
          : {}),
        outcome: {
          status: outcome as "kept" | "abandoned",
          ...(args.tests && typeof args.tests === "object" ? { tests: args.tests as { passed: number; failed: number } } : {}),
          // `why` used to be copied in here verbatim, which meant `errors` —
          // the field a reader goes to for what actually broke — held the
          // agent's prose opinion instead, duplicated from `intent.why`. Every
          // abandoned record in this repository stored the same sentence
          // twice and no error text at all.
          ...(outcome === "abandoned" ? { scope: (args.scope === "general" ? "general" : "local") as FailureScope } : {}),
          // `null` has to survive: it is the agent answering "nothing settles
          // this", which is different from not answering. A truthiness check
          // here would drop it and then the validator would reject the record
          // for a field the agent did fill in.
          ...(args.recheck === null ? { recheck: null }
            : args.recheck !== undefined ? { recheck: String(args.recheck).slice(0, 300) } : {}),
        },
        ...(args.detail && typeof args.detail === "object"
          ? (() => {
            const d = args.detail as Record<string, unknown>;
            const cut = (v: unknown) => typeof v === "string" ? v.slice(0, MAX_DETAIL_BYTES) : undefined;
            const detail = {
              ...(cut(d.output) ? { output: cut(d.output) } : {}),
              ...(cut(d.narrative) ? { narrative: cut(d.narrative) } : {}),
              ...(Array.isArray(d.ruled_out) && d.ruled_out.length
                ? {
                  ruled_out: (d.ruled_out as Array<Record<string, unknown>>)
                    // An approach with no reason is the shape this field
                    // exists to replace, so it is dropped rather than stored.
                    .filter((e) => e?.approach && e?.because)
                    .slice(0, MAX_DETAIL_ITEMS)
                    .map((e) => ({ approach: String(e.approach).slice(0, 300), because: String(e.because).slice(0, 1000) })),
                }
                : {}),
              ...(Array.isArray(d.not_investigated) && d.not_investigated.length
                ? { not_investigated: d.not_investigated.map(String).slice(0, MAX_DETAIL_ITEMS) } : {}),
              ...(Array.isArray(d.commands) && d.commands.length
                ? { commands: d.commands.map(String).slice(0, MAX_DETAIL_ITEMS) } : {}),
            };
            return Object.keys(detail).length ? { detail } : {};
          })()
          : {}),
        ...(Array.isArray(args.evidence) && args.evidence.length
          ? {
            evidence: (args.evidence as Array<Record<string, unknown>>)
              .filter((e) => e && (e.path || e.commit))
              .slice(0, MAX_EVIDENCE)
              .map((e) => ({
                ...(e.path ? { path: String(e.path) } : {}),
                ...(typeof e.line === "number" ? { line: e.line } : {}),
                ...(e.commit ? { commit: String(e.commit).toLowerCase() } : {}),
                ...(e.note ? { note: String(e.note).slice(0, 300) } : {}),
              })),
          }
          : {}),
        ts: new Date().toISOString(),
      };

      // What the agent left empty, filled from this session's raw log since
      // its previous record: the commands, the last failure and its output,
      // the files edited.
      const since = withIndex((db) => (db.prepare(`SELECT MAX(ts) AS t FROM records WHERE run_id = ?`)
        .get(runId()) as { t: string | null } | null)?.t ?? null);
      const filled = fillEvidence(record, sessionRows(activityRepo, runId(), since), activityRepo);

      // Private by default is the person's choice, and the agent can't undo it
      // one record at a time; asking for shared there is ignored, and said so.
      const tier: Tier = args.tier === "private" || defaultTier(repo) === "private" ? "private" : "shared";
      const overruled = args.tier === "shared" && tier === "private";
      const { ref } = appendRecord(repo, record, { tier });

      // An MCP server is started once and lives as long as the agent session,
      // so a server that began before the last upgrade keeps serving the old
      // schema from memory. Fields the caller sent are then dropped in
      // silence: the write succeeds, the record is thin, and nothing says so.
      // Observed here — a checkpoint sent `serves`, `recheck` and `evidence`
      // to a server 433 minutes old and stored none of them.
      //
      // Comparing what was asked for against what was stored is the only
      // check that catches it, because the process cannot know its own source
      // has changed.
      // `scope` belongs to abandoned attempts only, and a field the project's
      // settings turn off is never stored; neither is a sign of an old server.
      const off = readPolicy(repo).fields;
      const asked = ["serves", "supersedes", "scope", "recheck", "evidence"].filter((k) => args[k] !== undefined)
        .filter((k) => !(k === "scope" && outcome !== "abandoned"))
        .filter((k) => !((k === "recheck" || k === "evidence") && off[k] === "off"));
      const stored = new Set([
        ...(record.serves ? ["serves"] : []), ...(record.supersedes ? ["supersedes"] : []),
        // null is stored too: it says no command settles this.
        ...(record.outcome.scope ? ["scope"] : []), ...(record.outcome.recheck !== undefined ? ["recheck"] : []),
        ...(record.evidence?.length ? ["evidence"] : []),
      ]);
      const dropped = asked.filter((k) => !stored.has(k));
      // A process older than its own source cannot be trusted to know what it
      // is missing, so it says so regardless of what it managed to store.
      const stale = runningStaleBuild();

      // The id has to come back, or the agent cannot name this attempt as the
      // parent of its next one and every record stays a root.
      return `recorded ${outcome}, ${tier === "private" ? "private — stays on this machine" : "shared — travels with git push"}, at ${ref}${
        overruled ? "\n  Not shared: records here are private unless the person shares one with anvc share." : ""}\n  id: ${record.id}${
        outcome === "abandoned"
          ? "\n  Pass this id as `parent` on your next attempt at the same problem, so the two are linked."
          : ""}\n  goal: ${goal}${
        filled.commands || filled.failure || filled.files
          ? `\n  attached from this session's log: ${[
            filled.commands ? `${filled.commands} command${filled.commands === 1 ? "" : "s"}` : "",
            filled.failure ? `the output of \`${filled.failure.slice(0, 60)}\`` : "",
            filled.files ? `${filled.files} file${filled.files === 1 ? "" : "s"} changed` : "",
          ].filter(Boolean).join(", ")}`
          : ""}${
        filled.recheck
          ? `\n  recheck taken from this session: \`${filled.recheck}\`, the last test that failed. If that isn't what shows whether this still holds, record again with the right one.`
          : ""}${
        dropped.length
          ? `\n  WARNING: this server did not store ${dropped.join(", ")} — it is running an older build than the one you called. Restart the MCP server, then record this again.`
          : stale
            ? "\n  WARNING: this server started before the current source was written, so it may be storing less than you sent. Restart the MCP server."
            : ""}`;
    }
    case "anvc_sources":
      return sourceTool(activityRepo, args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function handle(request: { id?: unknown; method: string; params?: Record<string, unknown> }) {
  switch (request.method) {
    case "initialize":
      return { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: { name: "anvc", version: "0.1.0" } };
    case "tools/list":
      return { tools: shadowed ? [] : [...TOOLS, ...RULE_TOOLS, ...STATUS_TOOLS] };
    case "tools/call": {
      const params = request.params ?? {};
      const name = String(params.name);
      const args = (params.arguments as Record<string, unknown>) ?? {};
      // Record text is anyone's who can push to a remote this fetches from.
      const text = printable(name === "anvc_open" ? await openTool() : callTool(name, args));
      record(name, args, text);
      return { content: [{ type: "text", text }] };
    }
    case "ping":
      return {};
    default:
      return null; // notification or unsupported; no reply
  }
}

/**
 * What the agent asked anvc, for the activity log.
 *
 * Read off the rendered result rather than threaded through every handler:
 * the ids and titles are exactly what the agent saw, which is the thing the
 * receipt and the helped stats need to count.
 */
function record(tool: string, args: Record<string, unknown>, text: string): void {
  const ids = [...new Set(text.match(/\bid ([0-9A-HJKMNP-TV-Z]{26})\b/g)?.map((m) => m.slice(3)) ?? [])];
  const titles = [...text.matchAll(/^ {2}(?:goal|said): (.+)$/gm)].map((m) => m[1]!.slice(0, 90));
  const base = { repo: activityRepo, session: runId(), via: tool };
  if (tool === "anvc_checkpoint") {
    const m = /recorded (kept|abandoned), (shared|private)/.exec(text);
    const id = /\n {2}id: ([0-9A-HJKMNP-TV-Z]{26})/.exec(text)?.[1];
    if (m) logActivity({ ...base, kind: "recorded", outcome: m[1], tier: m[2], records: id ? [id] : [], titles: [String(args.goal ?? "").slice(0, 90)] });
  } else if (tool === "anvc_feedback") {
    logActivity({ ...base, kind: "feedback", verdict: String(args.verdict ?? ""), records: [String(args.record ?? "")] });
  } else if (tool === "anvc_retire") {
    const state = /^(Retired|Proposed)/.exec(text)?.[1];
    if (state) logActivity({ ...base, kind: "retired", outcome: state === "Retired" ? "retired" : "proposed", records: [String(args.record ?? "")], verdict: String(args.reason ?? "") });
  } else if (tool === "anvc_detail" || tool === "anvc_revisions") {
    logActivity({ ...base, kind: "opened", records: [String(args.id ?? args.record ?? "")], ...(titles.length ? { titles } : {}) });
  } else if (!["anvc_ingest", "anvc_overlap", "anvc_goals", "anvc_goal", "anvc_tool_note", "anvc_open", "anvc_result", "anvc_results"].includes(tool)) {
    const query = String(args.query ?? args.path ?? args.run_id ?? "");
    logActivity({ ...base, kind: "searched", query: query.slice(0, 200), hits: ids.length, records: ids, titles });
  }
}

const decoder = new TextDecoder();
let buffer = "";
for await (const chunk of Bun.stdin.stream()) {
  buffer += decoder.decode(chunk, { stream: true });
  let index: number;
  while ((index = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (!line) continue;
    let request: { id?: unknown; method: string; params?: Record<string, unknown> };
    try { request = JSON.parse(line); }
    catch { continue; }
    try {
      const result = await handle(request);
      // A request without an id is a notification: never answer it.
      if (result !== null && request.id !== undefined) {
        console.log(JSON.stringify({ jsonrpc: "2.0", id: request.id, result }));
      }
    } catch (error) {
      if (request.id !== undefined) {
        console.log(JSON.stringify({ jsonrpc: "2.0", id: request.id,
          error: { code: -32603, message: error instanceof Error ? error.message : "internal error" } }));
      }
    }
  }
}
