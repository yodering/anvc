/**
 * What the last session in this repository left behind, for the next one.
 *
 * Records only cover work an agent chose to save. Switch from Claude Code to
 * Codex mid-task and the half-done attempt, its last error and the files it
 * touched stay behind in the first agent's session, which the second never
 * reads. The hooks already capture those, so the next session is handed a
 * short note built from them: no copy of anything, just what happened and a
 * pointer to the session file for anyone who needs more.
 *
 * Private by construction: read from the local capture log and git status,
 * shown to an agent on this machine, never written into a record.
 */
import type { Database } from "bun:sqlite";
import { AGENT_NAMES } from "./agents";
import { gitOrNull } from "./git";
import { captureRows, lastDays, samePath } from "./rawlog";
import { errorLine } from "./search";
import { onlyLooks } from "./runs";
import { editedFiles } from "./evidence";
import type { CaptureEvent } from "./ingest";


/** Capture rows for one repository from the last few days' files, oldest first. */
function recent(root: string, dir: string | undefined, since: number): CaptureEvent[] {
  const mentions = [...new Set([root, samePath(root)])].map((p) => JSON.stringify(p));
  return captureRows(root, dir, lastDays(3), mentions).filter((row) => Date.parse(row.ts) >= since).sort((a, b) => a.ts.localeCompare(b.ts));
}

const ago = (ms: number) => {
  const m = Math.round(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return `${h} hour${h === 1 ? "" : "s"} ago`;
};

export function handoff(root: string, current: string, opts: { db?: Database; captureDir?: string } = {}): string | null {
  const now = Date.now();
  // A session in the last day still counts as the one before this.
  const rows = recent(root, opts.captureDir, now - 24 * 3_600_000).filter((r) => r.session_id && r.session_id !== current);
  if (!rows.length) return null;

  // The session that was active last.
  const last = rows.at(-1)!;
  const session = last.session_id!;
  const mine = rows.filter((r) => r.session_id === session);
  const agent = AGENT_NAMES[last.agent ?? "claude-code"] ?? last.agent ?? "An agent";

  const edited = editedFiles(mine, root);
  const failed = mine.filter((r) => r.tool === "Bash" && r.ok === false && !onlyLooks(r.command ?? "")).at(-1);
  const record = opts.db?.prepare(`SELECT intent, status FROM records WHERE run_id = ? AND TRIM(intent) != '' AND result IS NULL ORDER BY ts DESC LIMIT 1`)
    .get(session) as { intent: string; status: string } | null | undefined;

  // Nothing to hand over: a session that only read and ran passing commands.
  if (!edited.length && !failed && !record) return null;

  const dirty = new Set((gitOrNull(root, ["status", "--porcelain"]) ?? "").split("\n")
    .map((l) => l.slice(3).trim()).filter(Boolean));
  const open = edited.filter((f) => dirty.has(f)).length;

  const lines = [`Before this session, ${agent} worked in this repository (${ago(now - Date.parse(last.ts))}).`];
  lines.push(record
    ? `  Last recorded: "${record.intent.replace(/\s+/g, " ").slice(0, 120)}" (${record.status})`
    : "  It recorded nothing, so this is all that is known.");
  if (edited.length) {
    const shown = edited.slice(0, 4).join(", ") + (edited.length > 4 ? ` and ${edited.length - 4} more` : "");
    lines.push(`  Changed: ${shown}${open ? `; ${open === edited.length ? "all" : open} still uncommitted` : ""}`);
  }
  if (failed?.command) {
    const why = errorLine(failed.output ?? "");
    lines.push(`  Last failure: \`${failed.command.slice(0, 100)}\`${why ? ` → ${why.slice(0, 120)}` : ""}`);
  }
  const transcript = mine.map((r) => r.transcript).filter(Boolean).at(-1);
  if (transcript) lines.push(`  Its full session, if you need more: ${transcript}`);
  return lines.join("\n");
}

/**
 * Repository files a session edited, from the capture log.
 *
 * The same answer for every agent, without reading its session file, whose
 * format each agent keeps to itself.
 */
export const capturedEdits = (root: string, session: string): string[] =>
  editedFiles(recent(root, undefined, Date.now() - 2 * 86_400_000).filter((r) => r.session_id === session), root);
