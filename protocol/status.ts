/**
 * Status: what's being worked on here now, what was finished recently and
 * where it stands, and what's up next.
 *
 * The person asked their agent "what's built, what's in progress, what's
 * next?" about every twenty turns, because after a compaction the agent had
 * lost track. This keeps that answer current, for the Project page and for
 * the agent when a session starts and after compaction.
 *
 * Up next is the only list anyone writes. Its items are records
 * (`status_item` in protocol/record.ts), versioned like goals: a change points
 * at the first version with `of` and carries the item as it is after the
 * change, and the latest wins. An item can name the goal it serves; goals
 * themselves stay in protocol/goals.ts.
 *
 * The other two lists are read from what is already kept. In progress comes
 * from the capture log and the items marked doing, Done recently from kept
 * attempts, the commits that followed them, and items marked done.
 */
import type { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { AGENT_NAMES } from "./agents";
import { flag, textArg } from "./args";
import { repoRoot } from "./activity";
import { gitOrNull } from "./git";
import { allGoals, goalOf, readGoals } from "./goals";
import { fit, printable, remoteOf, withIndex } from "./query";
import { readPolicy } from "./policy";
import { captureRows, lastDays } from "./rawlog";
import { scrub } from "./scrub";
import { defaultTier, ITEM_STATES, readRecords, tierOf, ULID, type CheckpointRecord, type ItemState, type Tier } from "./record";
import { appendKept, type Actor } from "./results";

const ITEM_LABELS: Record<ItemState, string> = { next: "Up next", doing: "In progress", done: "Done", dropped: "Dropped" };

export interface Item {
  id: string;
  title: string;
  state: ItemState;
  goal: string | null;
  /** Its place in Up next, lowest first. */
  rank: number;
  added: string;
  /** When it last changed, and when it entered the state it's in. */
  ts: string;
  since: string;
  /** "person", or the agent that made the latest change, and that change's session. */
  by: string;
  session: string;
  /** The remote a fetched item came from. */
  from: string | null;
  tier: Tier;
}

/**
 * Every item as it is now. A change fetched from a remote applies only to an
 * item fetched from one, so whoever can push there can't rewrite this list.
 */
function readItems(records: Iterable<[string, CheckpointRecord]>): Item[] {
  const items = new Map<string, Item>();
  const changes = new Map<string, [string, CheckpointRecord]>();
  for (const [ref, r] of records) {
    const x = r.status_item;
    if (!x) continue;
    if (x.of) { changes.set(r.id, [ref, r]); continue; }
    const held = items.get(r.id);
    // The same record in both tiers is one item, and shared.
    if (held) { if (tierOf(ref) === "shared") held.tier = "shared"; continue; }
    items.set(r.id, {
      id: r.id, title: x.title, state: x.state, goal: x.goal ?? null, rank: x.rank ?? Date.parse(r.ts), added: r.ts,
      ts: r.ts, since: r.ts, by: r.session.agent, session: r.session.run_id, from: remoteOf(ref), tier: tierOf(ref),
    });
  }
  const ordered = [...changes.values()].sort(([, a], [, b]) => a.ts.localeCompare(b.ts) || a.id.localeCompare(b.id));
  for (const [ref, r] of ordered) {
    const x = r.status_item!;
    const item = items.get(x.of!);
    if (!item || (remoteOf(ref) && !item.from)) continue;
    Object.assign(item, {
      title: x.title, state: x.state, goal: x.goal ?? null, rank: x.rank ?? item.rank, ts: r.ts,
      since: x.state === item.state ? item.since : r.ts, by: r.session.agent, session: r.session.run_id,
    });
  }
  return [...items.values()];
}

export const listItems = (repo: string): Item[] => readItems(readRecords(repo));

/** Up next, in order. */
const upNext = (items: Item[]): Item[] =>
  items.filter((i) => i.state === "next").sort((a, b) => a.rank - b.rank || a.added.localeCompare(b.added));

const write = (repo: string, item: NonNullable<CheckpointRecord["status_item"]>, actor: Actor, tier: Tier): string =>
  appendKept(repo, { status_item: item }, `${ITEM_LABELS[item.state]}: ${item.title}`, undefined, actor, tier).id;

function title(text: string): string {
  const one = text.replace(/\s+/g, " ").trim();
  if (!one || one.length > 200) throw new Error("An item is one line, at most 200 characters.");
  return one;
}

const find = (repo: string, id: string): Item => listItems(repo).find((i) => i.id === id)!;

/** Adds an item, to Up next unless it says otherwise. */
export function addItem(repo: string, input: { title: string; state?: ItemState; goal?: string }, actor: Actor): Item {
  const text = title(input.title);
  if (input.goal) goalOf(repo, input.goal);
  return find(repo, write(repo, { title: text, state: input.state ?? "next", ...(input.goal ? { goal: input.goal } : {}) }, actor, defaultTier(repo)));
}

/**
 * Changes an item: its state, title or goal, or its place in Up next. A new
 * version each time, so the earlier ones stay. `goal: null` unlinks it.
 */
export function changeItem(repo: string, id: string, change: { title?: string; state?: ItemState; goal?: string | null; move?: "up" | "down" }, actor: Actor): Item {
  const items = listItems(repo);
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`no item ${id}`);
  const text = change.title === undefined ? item.title : title(change.title);
  const goal = change.goal === undefined ? item.goal : change.goal || null;
  if (goal && goal !== item.goal) goalOf(repo, goal);
  let rank = item.rank;
  if (change.move) {
    const list = upNext(items);
    const at = list.indexOf(item);
    if (at < 0) throw new Error("Only an item in Up next can be moved.");
    const to = change.move === "up" ? at - 1 : at + 1;
    if (to < 0 || to >= list.length) return item;
    // Between the two it now sits between, or one past the end.
    const [a, b] = change.move === "up" ? [list[to - 1], list[to]] : [list[to], list[to + 1]];
    rank = a && b ? (a.rank + b.rank) / 2 : a ? a.rank + 1 : b!.rank - 1;
  }
  const state = change.state ?? item.state;
  if (text === item.title && state === item.state && goal === item.goal && rank === item.rank) return item;
  write(repo, { title: text, state, ...(goal ? { goal } : {}), rank, of: id }, actor, item.tier);
  return find(repo, id);
}

// ------------------------------------------------------------- in progress

/** A session whose log has been quiet this long is over, as in protocol/autosave.ts. */
const LIVE_MS = 30 * 60_000;

export interface Working {
  title: string | null;
  /** Where the title came from: an item marked doing, the task a subagent was given, or the last thing the person asked. */
  source: "item" | "task" | "goal" | "prompt" | null;
  item: string | null;
  goal: string | null;
  /** The agent, "You" for an item the person marked. */
  agent: string;
  /** A subagent's type, for a subagent. */
  subagent: string | null;
  session: string;
  since: string;
  /** False for an item marked doing whose session isn't running. */
  live: boolean;
  /** The remote a fetched item came from. */
  from: string | null;
}

/** Whoever can push to a remote can write "person" there, so a fetched item is never the person's. */
const agentName = (agent: string | undefined, from: string | null = null): string =>
  agent === "person" ? (from ? "Someone" : "You") : AGENT_NAMES[agent ?? "claude-code"] ?? agent ?? "An agent";

/**
 * What the agent's harness puts in the prompt stream: a subagent's report, a
 * task notification, a slash command's wrapper, or a pasted image with no
 * words. None of it says what the person asked for.
 */
const INSERTED = /^(<[a-z][\w-]*[\s>]|\[Request interrupted|(\[Image #\d+\]\s*)+$)/i;

/** A prompt's first line, as a title. */
function firstLine(text: string): string {
  const line = printable(text.split("\n").find((l) => l.trim()) ?? "").trim();
  return line.length > 120 ? `${line.slice(0, 119)}…` : line;
}

const fromItem = (i: Item): Omit<Working, "agent" | "live"> =>
  ({ title: i.title, source: "item", item: i.id, goal: i.goal, subagent: null, session: i.session, since: i.since, from: i.from });

/**
 * What each session and subagent is on now. A session is running when its
 * log has a row in the last 30 minutes and no SessionEnd after it; a subagent
 * when its session is, it has a SubagentStart and no SubagentStop, and, when
 * its own tool calls carry its id, one of them is that recent too. What it's
 * on is the item it marked doing, else the task it was given, else the goal
 * it recorded since the person last asked it something, else that request. Items marked doing whose session isn't running
 * are listed after, as the agent or person left them.
 *
 * Only the last two days of the log are read, so a session older than that
 * reads as starting two days ago. Only Claude Code's hooks report subagents.
 */
function working(root: string, items: Item[], now: number, db?: Database): Working[] {
  const rows = captureRows(root, undefined, lastDays(2, now)).filter((r) => r.session_id).sort((a, b) => a.ts.localeCompare(b.ts));
  const doing = items.filter((i) => i.state === "doing").sort((a, b) => b.since.localeCompare(a.since));
  const out: Working[] = [];
  const said = new Set<string>();
  const delegations = readPolicy(root).fields.delegations !== "off";
  const sessions = [...Map.groupBy(rows, (r) => r.session_id!)].sort(([, a], [, b]) => b.at(-1)!.ts.localeCompare(a.at(-1)!.ts));
  for (const [session, all] of sessions) {
    // A resumed session starts again after its end.
    const list = all.slice(all.findLastIndex((r) => r.event === "SessionEnd") + 1);
    const last = list.at(-1);
    if (!last || now - Date.parse(last.ts) > LIVE_MS) continue;
    const agent = agentName(last.agent);
    const mine = doing.filter((i) => i.session === session && !i.from);
    for (const i of mine) { said.add(i.id); out.push({ ...fromItem(i), agent, live: true }); }
    if (!mine.length) {
      const asked = list.findLast((r) => r.prompt && !INSERTED.test(r.prompt.trimStart()));
      // A goal the agent wrote since the prompt names the work better than
      // the prompt does, which is often dictated and cut off mid-sentence.
      const goal = asked && db ? (db.prepare(`SELECT intent FROM records WHERE run_id = ? AND ts > ? AND intent_source = 'authored' AND result IS NULL
        ORDER BY ts DESC LIMIT 1`).get(session, asked.ts) as { intent: string } | null)?.intent : undefined;
      out.push({
        title: goal ? firstLine(goal) : asked ? firstLine(asked.prompt!) : null, source: goal ? "goal" : asked ? "prompt" : null, item: null, goal: null,
        agent, subagent: null, session, since: asked?.ts ?? list[0]!.ts, live: true, from: null,
      });
    }
    const stopped = new Set(list.filter((r) => r.event === "SubagentStop").map((r) => r.agent_id));
    const claimed = new Set(list.map((r) => r.tool_use_id).filter((id): id is string => Boolean(id)));
    for (const start of list.filter((r) => r.event === "SubagentStart" && r.agent_id && !stopped.has(r.agent_id))) {
      // An interrupted subagent never sends its stop; its own calls going quiet say it's over.
      const own = list.filter((r) => r.agent_id === start.agent_id);
      if (own.length > 1 && now - Date.parse(own.at(-1)!.ts) > LIVE_MS) continue;
      // The parent's call may not have been in its session file yet when the
      // subagent started, so a start captured without its task looks again.
      let task = start.delegated ?? null;
      if (!task && start.transcript && delegations) {
        const found = taskGiven(start.transcript, start.agent_type ?? null, claimed);
        if (found) { claimed.add(found.id); task = scrub(found.task).slice(0, 200); }
      }
      out.push({
        title: task, source: task ? "task" : null, item: null, goal: null,
        agent, subagent: start.agent_type ?? "general-purpose", session, since: start.ts, live: true, from: null,
      });
    }
  }
  for (const i of doing) if (!said.has(i.id)) out.push({ ...fromItem(i), agent: agentName(i.by, i.from), live: false });
  return out;
}

/**
 * The task a starting subagent was given, from its parent's Claude Code
 * session file: SubagentStart names the subagent's type and nothing else.
 * Taken from the latest message that started subagents, the first call of
 * that type not already `claimed` by an earlier start, so subagents started
 * together each get their own. Whether the message is in the file by the
 * time SubagentStart fires was not checked against a live session, so
 * working() looks again for a start that was captured without its task.
 */
export function taskGiven(transcript: string, type: string | null, claimed: Set<string>): { id: string; task: string } | null {
  let text = "";
  try { text = readFileSync(transcript, "utf8"); } catch { return null; }
  let calls: Array<{ id: string; task: string; type: string }> = [];
  let message = "";
  for (const line of text.split("\n")) {
    // Not "subagent_type": a call that takes the default type leaves it out.
    if (!/"name":\s*"(?:Task|Agent)"/.test(line)) continue;
    let entry: { type?: string; uuid?: string; message?: { id?: string; content?: unknown } };
    try { entry = JSON.parse(line); } catch { continue; }
    if (entry.type !== "assistant" || !Array.isArray(entry.message?.content)) continue;
    const found = (entry.message.content as Array<Record<string, any>>)
      .filter((b) => b?.type === "tool_use" && (b.name === "Task" || b.name === "Agent") && typeof b.input?.description === "string")
      .map((b) => ({ id: String(b.id), task: String(b.input.description), type: String(b.input.subagent_type ?? "general-purpose") }));
    if (!found.length) continue;
    // One message is written as several lines, one per block, under one id.
    const id = String(entry.message.id ?? entry.uuid);
    if (id !== message) { calls = []; message = id; }
    calls.push(...found);
  }
  const call = calls.find((c) => (!type || c.type === type) && !claimed.has(c.id));
  return call ? { id: call.id, task: call.task } : null;
}

// ----------------------------------------------------------- done recently

/** Where finished work is: see standing(). */
type Stand = "uncommitted" | "local" | "main" | "pushed" | "released" | "unknown";
const STAND_LABELS: Record<Stand, string> = {
  uncommitted: "Not committed", local: "Only on this computer", main: "In main", pushed: "Pushed", released: "Released", unknown: "Commit not found",
};

export interface Finished {
  id: string;
  title: string;
  ts: string;
  kind: "attempt" | "item";
  /** For an attempt. An item names no files, so nothing is said about it. */
  stands: Stand | null;
  commit: string | null;
  /** The first tag that contains the commit. */
  tag: string | null;
  goal: string | null;
  agent: string;
  from: string | null;
}

const DONE = 10;
const HOUR = 3_600_000;
/** How soon after its commit an attempt is recorded, when the agent committed first. */
const RECORDED_AFTER = 10 * 60_000;

/**
 * Where a kept attempt's work stands. The record says which files it wrote
 * and when, and its commit is a guess from those. First, HEAD when it was
 * recorded or a commit before it, if one touched those files in the ten
 * minutes before (the agent committed, then recorded). An hour took the
 * previous piece of work on the same files for this one, and called it
 * released when it wasn't. Else the first commit to those
 * files on any branch, tag or remote in the six hours after (it recorded, then
 * committed), the window protocol/drift.ts uses.
 *
 * With a commit: released if a tag contains it, pushed if a remote branch
 * does, in main if main or master does, and only on this computer otherwise.
 * Without one, it's not committed if its files are changed in the working
 * tree now, and unknown if they aren't. An unrelated commit to the same files
 * inside the window is taken for the work, a later edit to them reads as the
 * work not being committed, and a record that names no files is unknown.
 */
function standing(root: string, r: { ts: string; anchor_kind: string; anchor_oid: string }, files: string[], here: boolean): Pick<Finished, "stands" | "commit" | "tag"> {
  const at = Date.parse(r.ts);
  if (!files.length || Number.isNaN(at)) return { stands: "unknown", commit: null, tag: null };
  const iso = (ms: number) => new Date(ms).toISOString();
  const before = r.anchor_kind === "commit"
    ? gitOrNull(root, ["log", "-1", "--format=%H", `--since=${iso(at - RECORDED_AFTER)}`, r.anchor_oid, "--", ...files]) : null;
  const commit = before || gitOrNull(root, ["log", "--format=%H", `--since=${iso(at - 60_000)}`, `--until=${iso(at + 6 * HOUR)}`,
    "--branches", "--tags", "--remotes", "--", ...files])?.split("\n").filter(Boolean).at(-1);
  if (!commit) {
    const changed = here && gitOrNull(root, ["status", "--porcelain", "--", ...files]);
    return { stands: changed ? "uncommitted" : "unknown", commit: null, tag: null };
  }
  const refs = (gitOrNull(root, ["for-each-ref", `--contains=${commit}`, "--sort=creatordate", "--format=%(refname)", "refs/heads", "refs/remotes", "refs/tags"]) ?? "")
    .split("\n").filter(Boolean);
  const tag = refs.find((ref) => ref.startsWith("refs/tags/"));
  const stands: Stand = tag ? "released"
    : refs.some((ref) => ref.startsWith("refs/remotes/") && !ref.endsWith("/HEAD")) ? "pushed"
    : refs.includes("refs/heads/main") || refs.includes("refs/heads/master") ? "main" : "local";
  return { stands, commit: commit.slice(0, 12), tag: tag?.slice("refs/tags/".length) ?? null };
}

type AttemptRow = { id: string; ref: string; ts: string; intent: string; agent: string; anchor_kind: string; anchor_oid: string; serves: string | null };

/**
 * The last ten kept attempts with a goal and items marked done, newest first.
 * A record that only writes a map is left out, and one that also wrote files
 * is the work the map came with.
 */
function finished(db: Database, root: string, items: Item[]): Finished[] {
  const attempts = (db.prepare(`SELECT id, ref, ts, intent, agent, anchor_kind, anchor_oid, serves FROM records
    WHERE status = 'kept' AND intent_source = 'authored' AND TRIM(intent) != '' AND result IS NULL AND retires IS NULL AND retired IS NULL
      AND (id NOT IN (SELECT id FROM maps) OR id IN (SELECT id FROM files WHERE kind = 'write'))
    ORDER BY ts DESC LIMIT ?`).all(DONE) as AttemptRow[]).map((r) => ({ ...r, kind: "attempt" as const }));
  const done = items.filter((i) => i.state === "done").map((i) => ({ ...i, ts: i.since, kind: "item" as const }));
  const files = db.prepare(`SELECT path FROM files WHERE id = ? AND kind = 'write'`);
  // Three git calls per attempt on every read; cache by record id and HEAD if the page gets slow.
  return [...attempts, ...done].sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, DONE).map((f): Finished => f.kind === "item"
      ? { id: f.id, title: f.title, ts: f.ts, kind: "item", stands: null, commit: null, tag: null, goal: f.goal, agent: agentName(f.by), from: f.from }
      : {
        id: f.id, title: printable(f.intent.replace(/\s+/g, " ").trim()), ts: f.ts, kind: "attempt",
        ...standing(root, f, (files.all(f.id) as Array<{ path: string }>).map((p) => p.path), !remoteOf(f.ref)),
        goal: f.serves, agent: agentName(f.agent), from: remoteOf(f.ref),
      });
}

// ------------------------------------------------------------------ status

export interface Status {
  now: Working[];
  done: Finished[];
  next: Item[];
  /** Titles of the goals items and attempts link to, by id. */
  goals: Record<string, string>;
}

/**
 * The three lists for a repository, read from its main checkout's records and
 * log, and from `index` when the caller has already built one.
 */
export function readStatus(repo: string, index?: { db: Database; records: Map<string, CheckpointRecord> }): Status {
  const now = Date.now();
  const root = repoRoot(repo) ?? repo;
  const read = (db: Database, records: Map<string, CheckpointRecord>): Status => {
    const items = readItems(records);
    return {
      now: working(root, items, now, db),
      done: finished(db, root, items),
      next: upNext(items),
      goals: Object.fromEntries(allGoals(readGoals(db)).map((g) => [g.id, g.from ? `"${g.title}" (from ${g.from})` : g.title])),
    };
  };
  return index ? read(index.db, index.records) : withIndex(root, read);
}

/** Items marked doing in this session, for the reminder when it stops (emitters/claude-code/stop.ts). */
export const openItems = (repo: string, session: string): Item[] =>
  listItems(repo).filter((i) => i.state === "doing" && i.session === session);

function ago(ts: string, now: number): string {
  const m = Math.round((now - Date.parse(ts)) / 60_000);
  if (Number.isNaN(m)) return "at a time not recorded";
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

/** Text written elsewhere is quoted and says where it came from; a prompt is the person's words, quoted. */
const quote = (text: string, from: string | null) => (from ? `"${printable(text)}" (from ${from})` : printable(text));

function lines(s: Status, session: string | null, now: number): { now: string[]; done: string[]; next: string[] } {
  const goal = (id: string | null) => (id && s.goals[id] ? ` (for ${printable(s.goals[id]!)})` : "");
  return {
    now: s.now.map((w) => {
      const title = w.source === "prompt" ? `"${w.title}"` : w.title ?? "no task stated";
      const item = w.item ? `${goal(w.goal)}, item ${w.item}` : "";
      if (!w.live) return `- ${quote(title, w.from)}${item}, marked in progress ${ago(w.since, now)}${w.from ? "" : ` by ${w.agent === "You" ? "the person" : printable(w.agent)}`}`;
      const who = w.subagent ? `${w.subagent} subagent${w.session === session ? " of this session" : ` of ${w.agent}`}`
        : w.session === session ? "this session" : w.agent;
      return `- ${who}, started ${ago(w.since, now)}: ${printable(title)}${item}`;
    }),
    done: s.done.map((f) => {
      const where = f.stands === null ? "marked done" : f.stands === "released" && f.tag ? `released in ${f.tag}` : STAND_LABELS[f.stands].toLowerCase();
      return `- ${ago(f.ts, now)}: ${quote(f.title, f.from)}${goal(f.goal)} (${where})`;
    }),
    next: s.next.map((i) => `- ${quote(i.title, i.from)}${goal(i.goal)}, id ${i.id}`),
  };
}

/** The three lists in full, for anvc_status and `anvc status`. */
export function statusText(s: Status, session: string | null = null): string {
  const l = lines(s, session, Date.now());
  return [
    "In progress", ...(l.now.length ? l.now : ["  Nothing is running here now."]),
    "", "Done recently", ...(l.done.length ? l.done : ["  Nothing finished yet."]),
    "", "Up next", ...(l.next.length ? l.next : ["  Nothing queued."]),
  ].join("\n");
}

/**
 * What an agent starts with, and starts with again after compaction: a few
 * lines of each list, inside `max` characters. A line that doesn't fit is
 * left out whole, and the block says there is more. Null when all three are empty.
 */
export function statusBrief(s: Status, session: string, max: number): string | null {
  if (!s.now.length && !s.done.length && !s.next.length) return null;
  const l = lines(s, session, Date.now());
  const head = "anvc: this project's status. When the person asks for something you won't start now, add it with anvc_status_item. "
    + "Mark an item doing when you start it and done when it's finished.";
  const more = "anvc_status has the full lists.";
  const out = [head];
  let size = head.length + more.length + 2;
  let cut = false;
  for (const [name, list, cap] of [["In progress:", l.now, 4], ["Done recently:", l.done, 4], ["Up next:", l.next, 5]] as const) {
    const kept = fit(list.slice(0, cap), max - size - name.length - 1);
    if (kept.length) { out.push(name, ...kept); size += [name, ...kept].join("\n").length + 1; }
    cut ||= kept.length < list.length;
  }
  return [...out, ...(cut ? [more] : [])].join("\n");
}

// ------------------------------------------------------------ for the agent

/**
 * Said by every tool that only records. A request that calls nothing but an
 * ANVC tool re-reads the whole context for it: on this machine's sessions,
 * 85 such requests were half of what ANVC cost.
 */
export const ALONGSIDE = "If you have another tool call to make, make this one in the same response. It needs no turn of its own.";

export const STATUS_TOOLS = [
  {
    name: "anvc_status",
    description:
      "This project's status in three lists: what each session and subagent here is working on now and since when, "
      + "what was done recently and where it stands (not committed, only on this computer, in main, pushed, released), and what's up next. "
      + "Call it when you start, after compaction, or when you've lost track of what's built and what's left.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "anvc_status_item",
    description:
      "Add an item to Up next, or change one. Add one when the person asks for something you won't start right away. "
      + "Mark an item doing when you start it, so the person sees what you're on, done when it's finished, and dropped if it's no longer wanted. "
      + ALONGSIDE,
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "To change an item: its id, from anvc_status. Leave it out to add one." },
        title: { type: "string", description: "To add: what was asked for, in one line under 200 characters. To change: a new title." },
        state: { type: "string", enum: [...ITEM_STATES], description: "next: not started. doing: you're on it. done: finished. dropped: no longer wanted. A new item starts as next." },
        goal: { type: "string", description: "The id of the goal it's for, from anvc_goals." },
      },
    },
  },
];

/** Answers anvc_status and anvc_status_item. */
export function statusTool(repo: string, name: string, args: Record<string, unknown>, actor: Actor): string {
  const session = actor.kind === "agent" ? actor.session : null;
  if (name === "anvc_status") return statusText(readStatus(repo), session);
  const text = (key: string) => textArg(args, key);
  const state = text("state") as ItemState | undefined;
  if (state && !ITEM_STATES.includes(state)) return `state must be one of ${ITEM_STATES.join(", ")}.`;
  try {
    const id = text("id");
    if (!id) {
      if (!text("title")) return "Give a title to add an item, or an id to change one.";
      const item = addItem(repo, { title: text("title")!, state, goal: text("goal") }, actor);
      return `Added ${item.title} (${ITEM_LABELS[item.state]}), id ${item.id}.`;
    }
    if (!state && !text("title") && !text("goal")) return "Give a state, a title or a goal to change.";
    const item = changeItem(repo, id, { state, title: text("title"), goal: text("goal") }, actor);
    return `${item.title} is ${ITEM_LABELS[item.state]}.`;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

const USAGE = `usage: anvc status add "<title>" [--goal <id>]
       anvc status <id> <${ITEM_STATES.join("|")}|up|down> [--title "..."]`;

/** `anvc status` and its item commands. Returns the exit code. */
export function statusCommand(repo: string, positional: string[], argv: string[]): number {
  const [first, second] = positional;
  const person: Actor = { kind: "person" };
  try {
    if (!first) { console.log(statusText(readStatus(repo))); return 0; }
    if (first === "add" && second) {
      const item = addItem(repo, { title: positional.slice(1).join(" "), goal: flag(argv, "goal") }, person);
      console.log(`Added ${item.title} to Up next, id ${item.id}.`);
      return 0;
    }
    const move = second === "up" || second === "down" ? second : undefined;
    const state = ITEM_STATES.includes(second as ItemState) ? second as ItemState : undefined;
    if (ULID.test(first) && (move || state || flag(argv, "title"))) {
      const item = changeItem(repo, first, { state, move, title: flag(argv, "title"), ...(flag(argv, "goal") !== undefined ? { goal: flag(argv, "goal") } : {}) }, person);
      console.log(`${item.title} is ${ITEM_LABELS[item.state]}.`);
      return 0;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
  console.error(USAGE);
  return 2;
}
