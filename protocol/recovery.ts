/**
 * What this session did before its context was compacted.
 *
 * Compaction keeps a summary and drops the tool results, and measured
 * elsewhere only about a sixth of stated constraints survive it. The agent
 * that has just been compacted is the one most likely to walk back into what
 * it already tried. The raw log still holds every command this session ran
 * and what failed, so the agent is handed that account right after: what it
 * recorded, what failed and how often, and which files it changed. Not a
 * summary of the summary; the events themselves, shortened.
 */
import type { Database } from "bun:sqlite";
import { editedFiles, sessionRows } from "./evidence";
import { errorLine, signature } from "./search";
import { onlyLooks } from "./runs";

export function recovery(db: Database | null, root: string, session: string): string | null {
  const rows = sessionRows(root, session, null);
  const records = db
    ? db.prepare(`SELECT intent, status FROM records WHERE run_id = ? AND TRIM(intent) != '' AND retires IS NULL AND result IS NULL ORDER BY ts`)
      .all(session) as Array<{ intent: string; status: string }>
    : [];

  // Failures grouped by what failed, so ten runs of one broken test read as
  // one line with a count.
  const failures = new Map<string, { command: string; times: number; last: string; ts: string }>();
  for (const r of rows) {
    if (r.tool !== "Bash" || r.ok !== false || !r.command || onlyLooks(r.command)) continue;
    const key = signature(r.command);
    const last = errorLine(r.output ?? "");
    const seen = failures.get(key);
    if (seen) Object.assign(seen, { times: seen.times + 1, last: last || seen.last, ts: r.ts });
    else failures.set(key, { command: r.command.split("\n")[0]!, times: 1, last, ts: r.ts });
  }
  const edited = editedFiles(rows, root);

  if (!records.length && !failures.size && !edited.length) return null;

  const lines = ["anvc — this session before compaction:"];
  for (const r of records.slice(-4)) {
    lines.push(`  ${r.status === "abandoned" ? "✗ abandoned" : "✓ kept"}: ${r.intent.replace(/\s+/g, " ").slice(0, 110)}`);
  }
  for (const f of [...failures.values()].sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 3)) {
    lines.push(`  failed${f.times > 1 ? ` ${f.times}×` : ""}: \`${f.command.slice(0, 80)}\`${f.last ? ` → ${f.last.slice(0, 100)}` : ""}`);
  }
  if (edited.length) {
    lines.push(`  changed: ${edited.slice(0, 5).join(", ")}${edited.length > 5 ? ` and ${edited.length - 5} more` : ""}`);
  }
  return lines.join("\n");
}
