/**
 * Reads Claude Code's own transcripts into capture events.
 *
 * Until this, a repository's log began the day the hooks were installed.
 * Everything before that — every session, every dead end — stayed in
 * `~/.claude/projects/` where nothing read it, so the first thing a new user
 * saw was an empty page, on a project they had been working in for months.
 * That is the worst possible moment to be shown nothing: it is exactly when
 * someone wants to know whether this is worth installing.
 *
 * The transcripts hold what the hooks hold. A `tool_use` block carries the
 * command and the file path, the `tool_result` that answers it carries the
 * output and whether it failed, and the envelope carries the session, the
 * working directory and the time. So this is a translation, not a
 * reconstruction — nothing here infers anything the transcript did not say.
 *
 * What it cannot recover: which attempt was abandoned. A transcript records
 * what happened, never what the agent concluded, and inventing that verdict is
 * the one thing this project exists to avoid. Backfilled turns are therefore
 * captured, never authored, and the log says so.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { repoRoot } from "./activity";
import { toolCall } from "./agents";
import { claudeDir, codexDir, cursorDir } from "./version";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DELEGATE_TOOLS, type CaptureEvent } from "./ingest";
import { keptSessions, readKept } from "./keep";
import { inRepo, isRepo, keepOutput, readHead } from "./rawlog";
import { scrub as scrubSecrets } from "./scrub";

/**
 * Where Claude Code keeps transcripts, and how it names a project's folder.
 *
 * The folder is the absolute path with separators and underscores both
 * replaced by dashes, so `/home/you/code/my_app` becomes
 * `-home-you-code-my-app`. Derived rather than searched, because two projects
 * can share a basename.
 *
 * The underscore is the part that is easy to miss, and missing it is silent:
 * a repository whose name carries one reads as having no history at all rather
 * than as a path that did not match. On Windows the drive's colon and the
 * backslashes go too, so C:\Users\you\app would be C--Users-you-app; that
 * form wasn't checked against a real Claude Code folder.
 */
export function transcriptDir(repo: string, root = join(claudeDir(), "projects")): string {
  return join(root, repo.replace(/[\\/:_]/g, "-"));
}

interface Block {
  type?: string;
  name?: string;
  text?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
}

interface Line {
  type?: string;
  /** Stable across files: a resumed session rewrites earlier turns verbatim. */
  uuid?: string;
  timestamp?: string;
  sessionId?: string;
  cwd?: string;
  isSidechain?: boolean;
  message?: { content?: string | Block[] };
}

/** `text` when the caller already has it, else the file's text, or null when it can't be read. */
function readOr(path: string, text?: string): string | null {
  if (text !== undefined) return text;
  try { return readFileSync(path, "utf8"); } catch { return null; }
}

export interface BackfillResult {
  events: CaptureEvent[];
  sessions: number;
  /** Transcript files read, so a caller can say what was covered. */
  files: number;
  /** The span the events cover, for a caller that wants to report it. */
  from: string | null;
  to: string | null;
}

/**
 * Turns one transcript file into capture events.
 *
 * Two passes, because a tool call and its result are different lines: the call
 * names the command, the result says whether it worked. One pass would emit
 * every command as an unknown outcome, which is the half that matters.
 */
export function readTranscript(
  path: string,
  scrub: (text: string, cap?: number) => string,
  seen?: Set<string>,
  /** The file's text, when it was read some other way, as a kept copy is. */
  text?: string,
): CaptureEvent[] {
  const raw = readOr(path, text);
  if (raw === null) return [];

  const lines: Line[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try { lines.push(JSON.parse(line) as Line); } catch { /* a truncated tail is not an error */ }
  }

  // Results first, keyed by the call they answer.
  const results = new Map<string, { ok: boolean; output: string }>();
  for (const line of lines) {
    if (line.type !== "user" || !Array.isArray(line.message?.content)) continue;
    for (const block of line.message.content) {
      if (block.type !== "tool_result" || !block.tool_use_id) continue;
      results.set(block.tool_use_id, {
        ok: !block.is_error,
        output: textOf(block.content),
      });
    }
  }

  const events: CaptureEvent[] = [];
  for (const line of lines) {
    const ts = line.timestamp;
    const session = line.sessionId ?? null;
    const cwd = line.cwd ?? "";
    if (!ts) continue;

    // A user's own words, which is the only thing here a person wrote.
    if (line.type === "user" && typeof line.message?.content === "string") {
      const text = line.message.content.trim();
      // Slash commands and the harness's own notices are not a person's intent.
      if (!text || /^<(task-notification|system-reminder|local-command|command-)/.test(text)) continue;
      if (line.uuid && seen) {
        if (seen.has(line.uuid)) continue;
        seen.add(line.uuid);
      }
      events.push({
        anvc_capture: 0, event: "UserPromptSubmit", ts, session_id: session, cwd,
        repo: null, tool: null, path: null, bytes: null, command: null,
        prompt: scrub(text).slice(0, 8192), ok: null,
      });
      continue;
    }

    if (line.type !== "assistant" || !Array.isArray(line.message?.content)) continue;
    for (const block of line.message.content) {
      if (block.type !== "tool_use" || !block.name) continue;
      // Claude Code starts a new transcript file when a session resumes and
      // copies the earlier turns into it verbatim. Measured here: 350 of 2,597
      // commands appeared twice. The uuid is the transcript's own identity for
      // a turn and is stable across that copy, so it is what dedupes.
      const key = `${line.uuid ?? ""}|${(block as { id?: string }).id ?? ""}`;
      if (line.uuid && seen) {
        if (seen.has(key)) continue;
        seen.add(key);
      }
      const input = block.input ?? {};
      const result = block.tool_use_id ? undefined : results.get(String((block as { id?: string }).id ?? ""));
      const path = input.file_path ?? input.path ?? input.notebook_path;
      const command = typeof input.command === "string" ? input.command : null;

      events.push({
        anvc_capture: 0,
        event: "PostToolUse",
        ts,
        session_id: session,
        cwd,
        repo: null,
        tool: block.name,
        path: path ? String(path) : null,
        bytes: typeof input.content === "string" ? input.content.length
          : typeof input.new_string === "string" ? input.new_string.length : null,
        command: command ? scrub(command).slice(0, 512) : null,
        prompt: null,
        ok: result ? result.ok : null,
        output: result?.output ? keepOutput(result.output, scrub) : null,
        // A subagent's brief, which the parent wrote and nothing else records.
        delegated: DELEGATE_TOOLS.has(block.name) && typeof input.description === "string"
          ? scrub(String(input.description)).slice(0, 200) : null,
        agent_type: DELEGATE_TOOLS.has(block.name) && typeof input.subagent_type === "string"
          ? String(input.subagent_type).slice(0, 64) : null,
      });
    }
  }
  return events;
}

/**
 * Codex's session files, in `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`.
 *
 * Unlike Claude Code's, they are filed by date rather than by project, so a
 * project's sessions are found by the working directory in each file's
 * first line, `session_meta`.
 */
export function codexSessions(root = join(codexDir(), "sessions")): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    let names: string[] = [];
    try { names = readdirSync(dir); } catch { return; }
    for (const name of names) {
      const full = join(dir, name);
      if (name.endsWith(".jsonl") && name.startsWith("rollout-")) out.push(full);
      else if (/^\d+$/.test(name)) walk(full);
    }
  };
  walk(root);
  return out.sort();
}

/**
 * A Codex session's id and starting directory, from its first line. Only the
 * start of the file is read: the first line was about 22 KB in 52 sessions
 * here, which held 1.6 GB, and reading them whole took 1.2 s.
 */
export function codexMeta(path: string): { id: string | null; cwd: string | null } {
  try {
    const head = readHead(path, 256 * 1024) ?? "";
    const first = (head.includes("\n") ? head : readFileSync(path, "utf8")).split("\n", 1)[0] ?? "";
    const row = JSON.parse(first) as { type?: string; payload?: { cwd?: unknown; id?: unknown } };
    if (row.type !== "session_meta") return { id: null, cwd: null };
    return {
      id: typeof row.payload?.id === "string" ? row.payload.id : null,
      cwd: typeof row.payload?.cwd === "string" ? pathOf(row.payload.cwd) : null,
    };
  } catch { return { id: null, cwd: null }; }
}

/**
 * Every session file on disk that belongs to a repository, from each agent,
 * with the id the hooks know it by.
 */
export function sessionFiles(repo: string, opts: { root?: string; codexRoot?: string } = {}): Array<{ agent: string; session: string; path: string }> {
  const out: Array<{ agent: string; session: string; path: string }> = [];
  const dir = transcriptDir(repo, opts.root);
  try {
    for (const name of readdirSync(dir)) {
      if (name.endsWith(".jsonl")) out.push({ agent: "claude-code", session: name.slice(0, -6), path: join(dir, name) });
    }
  } catch { /* no Claude Code history here */ }
  for (const path of codexSessions(opts.codexRoot)) {
    const meta = codexMeta(path);
    if (meta.id && meta.cwd && repoOf(meta.cwd, repo)) out.push({ agent: "codex", session: meta.id, path });
  }
  for (const { session, path } of cursorSessions(repo)) out.push({ agent: "cursor", session, path });
  return out;
}

/**
 * One Codex session as capture events.
 *
 * Codex writes what the hooks would have seen as it finishes each step: a
 * command with its exit code and output, a patch with the files it changed,
 * and the person's message. Older versions wrote one event kind per step
 * (`exec_command_end`, `patch_apply_end`, `user_message`); newer ones write
 * `item_completed` with the same fields, and a file can hold both. A step is
 * taken once, by its id.
 */
export function readCodexSession(path: string, scrub: (text: string, cap?: number) => string, text?: string): CaptureEvent[] {
  const raw = readOr(path, text);
  if (raw === null) return [];
  let session: string | null = null;
  let cwd = "";
  const events: CaptureEvent[] = [];
  const done = new Set<string>();
  let lastPrompt = "";

  const base = (ts: string) => ({
    anvc_capture: 0 as const, ts, session_id: session, agent: "codex", cwd, repo: null,
    tool: null, path: null, bytes: null, command: null, prompt: null, ok: null,
  });
  const once = (id: unknown) => {
    if (typeof id !== "string") return true;
    if (done.has(id)) return false;
    done.add(id);
    return true;
  };
  const prompt = (ts: string, text: string) => {
    const t = text.trim();
    // The same message arrives as both an event and an item in one file.
    if (!t || t === lastPrompt) return;
    lastPrompt = t;
    events.push({ ...base(ts), event: "UserPromptSubmit", prompt: scrub(t).slice(0, 8192) });
  };
  const command = (ts: string, c: Record<string, unknown>) => {
    const cmd = Array.isArray(c.command) ? c.command.map(String).join(" ") : typeof c.command === "string" ? c.command : "";
    const output = [c.stdout, c.stderr].filter((x): x is string => typeof x === "string" && x.length > 0).join("\n")
      || (typeof c.aggregated_output === "string" ? c.aggregated_output : "");
    events.push({
      ...base(ts), event: "PostToolUse", tool: "Bash",
      cwd: typeof c.cwd === "string" ? pathOf(c.cwd) : cwd,
      command: cmd ? scrub(cmd).slice(0, 512) : null,
      ok: typeof c.exit_code === "number" ? c.exit_code === 0 : null,
      output: output ? keepOutput(output, scrub) : null,
    });
  };
  const change = (ts: string, changes: unknown, ok: boolean) => {
    // A map keyed by path, or a list of entries that each name one.
    const files = Array.isArray(changes)
      ? changes.map((c) => (c as { path?: unknown })?.path).filter((x): x is string => typeof x === "string")
      : changes && typeof changes === "object" ? Object.keys(changes) : [];
    for (const file of files) {
      events.push({ ...base(ts), event: "PostToolUse", tool: "Edit", path: isAbsolute(file) ? file : join(cwd, file), ok });
    }
  };

  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let row: { timestamp?: string; type?: string; payload?: Record<string, unknown> };
    try { row = JSON.parse(line); } catch { continue; }
    const p = row.payload ?? {};
    const ts = row.timestamp;
    if (row.type === "session_meta") {
      session = typeof p.id === "string" ? p.id : session;
      cwd = typeof p.cwd === "string" ? pathOf(p.cwd) : cwd;
      continue;
    }
    if (row.type === "turn_context" && typeof p.cwd === "string") { cwd = pathOf(p.cwd); continue; }
    if (row.type !== "event_msg" || !ts) continue;

    if (p.type === "item_completed" && p.item && typeof p.item === "object") {
      const item = p.item as Record<string, unknown>;
      if (!once(item.id)) continue;
      if (item.type === "UserMessage") prompt(ts, textOf(item.content));
      else if (item.type === "CommandExecution") command(ts, item);
      else if (item.type === "FileChange") change(ts, item.changes, item.status !== "failed");
    } else if (p.type === "user_message" && typeof p.message === "string") {
      prompt(ts, p.message);
    } else if (p.type === "exec_command_end") {
      if (once(p.call_id)) command(ts, p);
    } else if (p.type === "patch_apply_end") {
      if (once(p.call_id)) change(ts, p.changes, typeof p.success === "boolean" ? p.success : true);
    } else if (p.type === "task_complete") {
      events.push({ ...base(ts), event: "Stop" });
    }
  }
  return events;
}

/** Newer Codex writes a command's directory as a `file://` URL. */
function pathOf(where: string): string {
  if (!where.startsWith("file://")) return where;
  try { return fileURLToPath(where); } catch { return where.slice(7); }
}

/** A message's or a tool result's text, from a string or a list of content parts. */
function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((c) => (typeof c === "string" ? c : typeof (c as { text?: unknown })?.text === "string" ? (c as { text: string }).text : ""))
    .filter(Boolean).join("\n");
}

/**
 * Where Cursor keeps a project's agent sessions:
 * `~/.cursor/projects/<path with / and _ as ->/agent-transcripts/<id>/<id>.jsonl`.
 * On Windows \ and : become - as well, a guess no real Cursor folder checked.
 */
export function cursorSessions(repo: string, root = join(cursorDir(), "projects")): Array<{ session: string; path: string }> {
  const dir = join(root, repo.replace(/^\/+/, "").replace(/[\\/:_]/g, "-"), "agent-transcripts");
  const out: Array<{ session: string; path: string }> = [];
  let ids: string[] = [];
  try { ids = readdirSync(dir); } catch { return out; }
  for (const id of ids) {
    const path = join(dir, id, `${id}.jsonl`);
    try { statSync(path); out.push({ session: id, path }); } catch { /* not a session folder */ }
  }
  return out;
}

/**
 * Whether a Cursor session plainly belongs to another folder.
 *
 * Cursor files a project's sessions under its path with / and _ made dashes,
 * so /x/my_app, /x/my-app and /x/my/app share one folder, and its session
 * files carry no working directory to tell them apart. The absolute paths the
 * agent touched can: a session whose every absolute path is outside this
 * repository is someone else's. One with none at all can't be told apart,
 * and is kept, as before.
 */
export function cursorElsewhere(path: string, repo: string, text?: string): boolean {
  const raw = readOr(path, text);
  if (raw === null) return false;
  const seen = [...raw.matchAll(/"(?:path|file_path|target_file|targetDirectory|workingDirectory)"\s*:\s*"(\/[^"]+)"/g)].map((m) => m[1]!);
  return seen.length > 0 && !seen.some((p) => within(p, repo));
}

/**
 * One Cursor session as capture events.
 *
 * Cursor's session files hold the conversation and the tool calls, and
 * nothing else: no times, no results, no working directory. So the file's
 * last change stands for the session's end and its events are placed just
 * before it in order, with no pass or fail. Approximate, and the rows say
 * which agent they came from.
 */
export function readCursorSession(path: string, session: string, repo: string,
  scrub: (text: string, cap?: number) => string, text?: string): CaptureEvent[] {
  const raw = readOr(path, text);
  if (raw === null) return [];
  let end = Date.now();
  try { end = statSync(path).mtimeMs; } catch { /* a kept copy: now will do */ }
  const lines = raw.split("\n").filter((l) => l.trim());
  const events: CaptureEvent[] = [];
  lines.forEach((line, i) => {
    let row: { role?: string; message?: { content?: unknown } };
    try { row = JSON.parse(line); } catch { return; }
    const ts = new Date(end - (lines.length - i) * 1000).toISOString();
    const base = {
      anvc_capture: 0 as const, ts, session_id: session, agent: "cursor", cwd: repo, repo: null,
      tool: null, path: null, bytes: null, command: null, prompt: null, ok: null,
    };
    const content = Array.isArray(row.message?.content) ? row.message!.content as Array<Record<string, unknown>> : [];
    if (row.role === "user") {
      const text = content.map((b) => (typeof b.text === "string" ? b.text : "")).join("\n");
      // Cursor wraps what the person typed in <user_query>, after a <timestamp>.
      const said = (/<user_query>\s*([\s\S]*?)\s*<\/user_query>/.exec(text)?.[1] ?? text).trim();
      if (said) events.push({ ...base, event: "UserPromptSubmit", prompt: scrub(said).slice(0, 8192) });
      return;
    }
    for (const block of content) {
      if (block.type !== "tool_use") continue;
      const call = toolCall(block.name, (block.input ?? {}) as Record<string, unknown>);
      if (!call.tool) continue;
      events.push({
        ...base, event: "PostToolUse", tool: call.tool,
        path: call.paths[0] ? (isAbsolute(call.paths[0]) ? call.paths[0] : join(repo, call.paths[0])) : null,
        command: call.command ? scrub(call.command).slice(0, 512) : null, bytes: call.bytes,
      });
    }
  });
  return events;
}

/**
 * A Cursor session's prompts that the raw log is missing.
 *
 * Cursor's CLI skips beforeSubmitPrompt and stop in print mode (confirmed by
 * Cursor staff for 2026.08.11, still true on 2026.09.26), so a `-p` session
 * leaves tool rows with no prompt. sessionEnd does fire, and the transcript
 * has the prompt. Nothing is returned when the log already holds a prompt for
 * the session, which is the case in the app and the interactive CLI. The rows
 * go just before the session's first captured row, in order.
 */
export function missingCursorPrompts(transcript: string, session: string, repo: string,
  rows: Array<{ session_id?: unknown; event?: unknown; ts?: unknown }>,
  scrub: (text: string, cap?: number) => string): CaptureEvent[] {
  const mine = rows.filter((r) => r.session_id === session);
  if (mine.some((r) => r.event === "UserPromptSubmit")) return [];
  const prompts = readCursorSession(transcript, session, repo, scrub).filter((e) => e.event === "UserPromptSubmit");
  const first = mine.map((r) => Date.parse(String(r.ts))).filter((t) => !Number.isNaN(t)).sort((a, b) => a - b)[0];
  return prompts.map((e, i) => ({
    ...e, repo,
    ts: first === undefined ? e.ts : new Date(first - (prompts.length - i)).toISOString(),
  }));
}

/**
 * Every transcript for a repository, oldest first.
 *
 * Nothing is written here. The caller decides what to do with the events,
 * because importing someone's entire session history into a shared log is not
 * a thing to do as a side effect of reading.
 */
/**
 * Which repository an event belongs to.
 *
 * The transcript stores the working directory, and `ingest` filters on the
 * repository — so leaving this null drops every event silently. Measured on
 * LoopIn: eleven events in, one record out of `toRecords`, and zero written,
 * with nothing saying why.
 *
 * A cwd inside the repository counts as the repository, because a session that
 * ran in a subdirectory is still that project's history.
 */
function repoOf(cwd: string, repo: string): string | null {
  if (!within(cwd, repo)) return null;
  // The nearest repository, not the outermost: a project cloned inside
  // another (a home folder under git, a vendored checkout) is its own, and a
  // prefix match imported every nested project's sessions into the outer one.
  // A folder that no longer exists can't be asked, and keeps the prefix match.
  if (cwd === repo || !existsSync(cwd)) return repo;
  let nearest = nearestRepo.get(cwd);
  if (nearest === undefined) nearestRepo.set(cwd, nearest = repoRoot(cwd));
  return nearest === null || isRepo(repo)(nearest) ? repo : null;
}
const nearestRepo = new Map<string, string | null>();

/**
 * The repository or a folder in it, through symlinks: git can name it
 * /private/var/... where the agent's session says /var/....
 */
const within = (path: string, repo: string): boolean =>
  path === repo || path.startsWith(`${repo}/`) || isRepo(repo)(path) || inRepo(repo)(path) !== null;

export function backfill(repo: string, opts: {
  root?: string;
  scrub?: (text: string, cap?: number) => string;
  /** Only sessions at or after this ISO time, for an incremental import. */
  since?: string;
  /** Where Codex keeps its sessions; ~/.codex/sessions by default. */
  codexRoot?: string;
  /** Where anvc keeps its own copies; ~/.anvc/transcripts by default. */
  keptRoot?: string;
  /** Where Cursor keeps its projects; ~/.cursor/projects by default. */
  cursorRoot?: string;
} = {}): BackfillResult {
  const dir = transcriptDir(repo, opts.root);
  // Redacted unless a caller brings its own: an import that forgets to pass
  // one must not put months of unscrubbed transcripts into the raw log.
  const scrub = opts.scrub ?? scrubSecrets;

  let names: string[] = [];
  try {
    names = readdirSync(dir).filter((n) => n.endsWith(".jsonl"));
  } catch { /* no Claude Code history here; Codex may still have some */ }

  const events: CaptureEvent[] = [];
  let files = 0;
  /** One file's events from `since` on, each given its repository; the file counts when any are this one's. */
  const take = (batch: CaptureEvent[]) => {
    const mine = batch
      .filter((e) => !opts.since || e.ts >= opts.since)
      .map((e) => ({ ...e, repo: repoOf(e.cwd, repo) }))
      // A session that wandered into another project is that project's
      // history, not this one's.
      .filter((e) => e.repo);
    if (!mine.length) return;
    files++;
    events.push(...mine);
  };
  for (const full of codexSessions(opts.codexRoot)) {
    const where = codexMeta(full).cwd;
    if (where && repoOf(where, repo)) take(readCodexSession(full, scrub));
  }
  // A Cursor session's events all name this repository as their directory.
  for (const { session, path } of cursorSessions(repo, opts.cursorRoot)) {
    if (!cursorElsewhere(path, repo)) take(readCursorSession(path, session, repo, scrub));
  }

  // Shared across files, which is the whole point: the duplicates are between
  // transcripts, not within one.
  const seen = new Set<string>();
  for (const name of names) take(readTranscript(join(dir, name), scrub, seen));

  // Copies anvc kept, for sessions the agent has since deleted. A session
  // already read from its original is skipped: Claude Code turns dedupe by
  // uuid anyway, and a Codex session is one file.
  const read = new Set(events.map((e) => e.session_id));
  for (const kept of keptSessions(repo, opts.keptRoot)) {
    if (read.has(kept.session)) continue;
    const text = readKept(kept.path);
    if (!text) continue;
    if (kept.agent === "cursor" && cursorElsewhere(kept.path, repo, text)) continue;
    take(kept.agent === "codex" ? readCodexSession(kept.path, scrub, text)
      : kept.agent === "cursor" ? readCursorSession(kept.path, kept.session, repo, scrub, text)
        : readTranscript(kept.path, scrub, seen, text).map((e) => ({ ...e, agent: kept.agent })));
  }

  events.sort((a, b) => a.ts.localeCompare(b.ts));
  return {
    events,
    sessions: new Set(events.map((e) => e.session_id).filter(Boolean)).size,
    files,
    from: events[0]?.ts ?? null,
    to: events.at(-1)?.ts ?? null,
  };
}
