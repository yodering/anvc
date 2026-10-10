/**
 * One search across everything anvc holds: every depth of every record, and
 * the private raw log.
 *
 * Keyword search, on purpose. The one benchmark available favours it, and
 * Claude Code and Cursor both dropped vector search. What makes it work for
 * errors is the signature: line numbers, hex addresses, ids and temp paths
 * are stripped from both the query and the text, so the same error from
 * another run, another day or another machine still matches.
 */
import type { Database } from "bun:sqlite";
import { ftsQuery, hitsById, type Hit } from "./query";
import { captureRows } from "./rawlog";

/** An error or command with the parts that change between runs taken out. */
export function signature(text: string): string {
  return text.toLowerCase()
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g, " ")
    .replace(/\b0x[0-9a-f]+\b/g, " ")
    .replace(/\b[0-9a-f]{12,}\b/g, " ")
    .replace(/(?:\/tmp|\/var\/folders|\/private\/var)\/\S+/g, " ")
    .replace(/:\d+(?::\d+)?\b/g, " ")
    .replace(/\b\d+(?:\.\d+)*(?:ms|s|m|h|kb|mb|gb|b)?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The words of a query worth matching: its signature, split, no punctuation-only tokens. */
export function terms(query: string): string[] {
  return [...new Set(signature(query).split(" ").map((t) => t.replace(/^[^\w/.-]+|[^\w/.-]+$/g, "")).filter((t) => t.length > 1))];
}

export type Depth = "goal" | "error" | "output" | "file";

export interface RecordHit extends Hit { matched: Depth[] }

const DATE = /\b\d{4}-\d{2}(?:-\d{2})?\b/g;

/**
 * The dates in a query, "2026-10-07" or "2026-10", and the query without
 * them. The signature strips every number, so a search for a day's work
 * matched nothing.
 */
export function datesIn(query: string): { rest: string; dates: string[] } {
  return { rest: query.replace(DATE, " "), dates: query.match(DATE) ?? [] };
}

/** A timestamp's day on this computer's calendar, as 2026-10-07. */
export function localDay(ts: string): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Whether a timestamp falls on one of the dates, on this computer's calendar. With no dates, every one does. */
export function onDates(ts: string, dates: string[]): boolean {
  return !dates.length || dates.some((date) => localDay(ts).startsWith(date));
}

/**
 * Records matching every term, best first: a match in the goal outranks one
 * in the output. A date in the query keeps the records made then, and a date
 * alone lists them, newest first.
 */
export function searchRecords(db: Database, query: string, limit = 10): RecordHit[] {
  const { rest, dates } = datesIn(query);
  const words = terms(rest);
  const match = ftsQuery(words.join(" "));
  if (!match && !dates.length) return [];
  const rows = (match
    ? db.prepare(`SELECT s.id AS id, s.prompt AS prompt, s.errors AS errors, s.detail AS detail, s.files AS files,
        bm25(search, 0, 10, 6, 2, 4) AS rank
      FROM search s WHERE search MATCH ? ORDER BY rank LIMIT ?`).all(match, dates.length ? 2000 : limit)
    : (db.prepare(`SELECT id, ts FROM records ORDER BY ts DESC`).all() as Array<{ id: string; ts: string }>)
      .filter((r) => onDates(r.ts, dates)).slice(0, limit)) as Array<Record<string, string>>;
  if (!rows.length) return [];
  const byId = new Map(hitsById(db, rows.map((r) => r.id!)).map((h) => [h.id, h]));
  const has = (text: string | undefined) => {
    const sig = signature(text ?? "");
    return words.some((w) => sig.includes(w));
  };
  return rows.flatMap((r) => {
    const hit = byId.get(r.id!);
    if (!hit) return [];
    const matched: Depth[] = [];
    if (has(r.prompt)) matched.push("goal");
    if (has(r.errors)) matched.push("error");
    if (has(r.files)) matched.push("file");
    if (has(r.detail)) matched.push("output");
    return onDates(hit.ts, dates) ? [{ ...hit, matched }] : [];
  }).slice(0, limit);
}

export interface RawHit {
  ts: string;
  session: string | null;
  agent: string;
  command: string | null;
  /** The line of output that matched, or the command when the command did. */
  line: string;
  ok: boolean | null;
  /** How many other times the same thing appears, collapsed into this one. */
  more: number;
}

/**
 * Commands and output in this repository's raw log matching every term, and
 * from the dates in the query if it names any, newest first, with repeats of
 * the same error collapsed.
 */
export function searchRaw(root: string, query: string, limit = 10, captureDir?: string): RawHit[] {
  const { rest, dates } = datesIn(query);
  const words = terms(rest);
  if (!words.length && !dates.length) return [];
  const found = new Map<string, RawHit>();
  for (const row of captureRows(root, captureDir)) {
    if ((!row.command && !row.output) || !onDates(row.ts, dates)) continue;
    const whole = signature(`${row.command ?? ""}\n${row.output ?? ""}`);
    if (!words.every((w) => whole.includes(w))) continue;
    const line = (row.output ?? "").split("\n").find((l) => words.some((w) => signature(l).includes(w)))?.trim()
      ?? row.command ?? "";
    const key = signature(`${row.command ?? ""}|${line}`);
    const seen = found.get(key);
    if (seen) {
      seen.more++;
      if (row.ts > seen.ts) Object.assign(seen, { ts: row.ts, session: row.session_id, ok: row.ok });
      continue;
    }
    found.set(key, {
      ts: row.ts, session: row.session_id, agent: row.agent ?? "claude-code",
      command: row.command, line: line.slice(0, 240), ok: row.ok, more: 0,
    });
  }
  return [...found.values()].sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, limit);
}

/**
 * Records whose errors or output look like this error line.
 *
 * Looser than `searchRecords`, which needs every word: a real error carries
 * a few words of its own each run (a source file, a column, a count), so
 * this asks for most of the distinctive words rather than all of them.
 */
export function similarErrors(db: Database, line: string, limit = 3): RecordHit[] {
  const words = terms(line).filter((w) => w.length > 2);
  if (words.length < 2) return [];
  const match = words.map((w) => `"${w.replace(/"/g, '""')}"`).join(" OR ");
  const rows = db.prepare(`SELECT s.id AS id, s.errors AS errors, s.detail AS detail FROM search s
    WHERE search MATCH ? ORDER BY bm25(search, 0, 1, 8, 4, 0) LIMIT 20`)
    .all(`{errors detail} : (${match})`) as Array<Record<string, string>>;
  const close = rows.filter((r) => {
    const sig = signature(`${r.errors ?? ""}\n${r.detail ?? ""}`);
    return words.filter((w) => sig.includes(w)).length / words.length >= 0.6;
  }).slice(0, limit);
  if (!close.length) return [];
  const byId = new Map(hitsById(db, close.map((r) => r.id!)).map((h) => [h.id, h]));
  return close.flatMap((r) => {
    const hit = byId.get(r.id!);
    return hit ? [{ ...hit, matched: ["error" as Depth] }] : [];
  });
}

/**
 * The line of a command's output that says what went wrong.
 *
 * The last line was used, and test runners end with a summary: in a live run
 * `bun test` ended "Ran 1 test across 1 file.", which matched nothing, while
 * the lines that mattered were "Expected: 3" and "Received: 6" above it. So
 * the last lines that read like an error win, and the last line only when
 * none does.
 */
export function errorLine(output: string): string {
  const lines = output.split("\n").map((l) => l.trim()).filter(Boolean);
  const shaped = /\b(error|exception|failed|fail:|expected|received|cannot|could not|not found|no such|denied|refused|timed? ?out|traceback|panic|fatal|undefined is not|assert)/i;
  const noise = /^(ran \d+ tests?|\d+ (pass|fail)|\d+ expect\(\) calls|exit code \d+$)/i;
  // The last few error lines together, since one alone ("Received: 6") says
  // too little to match on and runners split an error across lines.
  const errors = lines.filter((l) => shaped.test(l) && !noise.test(l)).slice(-3);
  return (errors.length ? errors.join(" ") : lines.at(-1) ?? "").slice(0, 300);
}
