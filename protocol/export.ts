/**
 * Records as Markdown, one page a day: what agents tried, kept and gave up
 * on, readable without ANVC. Records live in git refs, which no editor or
 * file view shows, so an agent wrote dated logs by hand from run summaries.
 *
 * Private records are left out unless asked for: a page written into the
 * project is one commit away from leaving this computer.
 */
import { basename } from "node:path";
import { readRecords, tierOf, type CheckpointRecord } from "./record";
import { localDay, onDates } from "./search";

const time = (ts: string) => new Date(ts).toTimeString().slice(0, 5);
const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();
const list = (items: string[], most = 8) => items.slice(0, most).join(", ") + (items.length > most ? ` and ${items.length - most} more` : "");

/** One record as a section of the day's page, or null for one that isn't about work: a status item, a rule, a tool note, a map. */
function section(r: CheckpointRecord, tier: string): string | null {
  if (r.status_item || r.rule || r.tool_note || r.map) return null;
  const lines: string[] = [];
  if (r.result) {
    if (r.result.of) lines.push(`## ${time(r.ts)} Result ${r.result.name} marked ${r.result.status}`);
    else {
      lines.push(`## ${time(r.ts)} Result: ${r.result.name} = ${r.result.value ?? ""}`);
      if (r.result.source) lines.push(`From \`${r.result.source.path}\`${r.result.source.key ? `, at ${r.result.source.key}` : ""}.`);
      if (r.result.command) lines.push(`Made by \`${oneLine(r.result.command)}\`.`);
    }
  } else if (r.objective) {
    lines.push(`## ${time(r.ts)} Goal: ${r.objective.title} (${r.objective.status})`);
  } else if (r.retires) {
    lines.push(`## ${time(r.ts)} Retired ${r.retires.id}: ${r.retires.reason}`, oneLine(r.retires.evidence));
  } else {
    const title = r.intent.goal ?? (r.intent.prompt ? `(captured) ${oneLine(r.intent.prompt).slice(0, 120)}` : "(no goal)");
    lines.push(`## ${time(r.ts)} ${r.outcome.status === "abandoned" ? "✗ Abandoned" : "✓ Kept"}: ${oneLine(title)}`);
    const tests = r.outcome.tests;
    const files = r.delta?.files ?? [];
    for (const [label, value] of [
      ["Why", r.intent.why && oneLine(r.intent.why)],
      ["What happened", r.detail?.narrative && oneLine(r.detail.narrative)],
      ["Files", files.length ? list(files.map((f) => `\`${f}\``)) : null],
      ["Tests", tests ? `${tests.passed} passed, ${tests.failed} failed` : null],
      ["Evidence", r.evidence?.length ? list(r.evidence.map((e) => `${e.path ? `\`${e.path}${e.line ? `:${e.line}` : ""}\`` : e.commit ? `commit ${e.commit.slice(0, 12)}` : ""}${e.note ? ` (${oneLine(e.note)})` : ""}`.trim()), 5) : null],
      ["Ruled out", r.detail?.ruled_out?.length ? r.detail.ruled_out.map((x) => `${oneLine(x.approach)}, because ${oneLine(x.because)}`).join("; ") : null],
      ["Not checked", r.detail?.not_investigated?.length ? r.detail.not_investigated.map(oneLine).join("; ") : null],
      ["To check it's still true", r.outcome.recheck ? `\`${r.outcome.recheck}\`` : null],
    ] as const) if (value) lines.push(`- ${label}: ${value}`);
  }
  // A goal's change is one line; the rest say where they came from.
  if (!r.objective) lines.push(`\n<sub>${r.session.agent}, session ${r.session.run_id.slice(0, 8)}, ${tier}, id ${r.id}</sub>`);
  return lines.join("\n");
}

/**
 * Each day's page, oldest day first, for the days in `dates` ("2026-10-07",
 * "2026-10") or every day, and how many private records were left out.
 */
export function exportDays(repo: string, opts: { dates?: string[]; private?: boolean } = {}): { days: Array<{ day: string; page: string }>; leftOut: number } {
  let leftOut = 0;
  const kept = readRecords(repo)
    .filter(([, r]) => onDates(r.ts, opts.dates ?? []))
    .filter(([ref]) => {
      if (opts.private || tierOf(ref) !== "private") return true;
      leftOut++;
      return false;
    })
    .flatMap(([ref, r]) => {
      const text = section(r, tierOf(ref));
      return text ? [{ r, text }] : [];
    })
    .sort((a, b) => a.r.ts.localeCompare(b.r.ts));
  const days = [...Map.groupBy(kept, ({ r }) => localDay(r.ts))].map(([day, items]) => {
    const attempts = items.filter(({ r }) => !r.result && !r.objective && !r.retires);
    const abandoned = attempts.filter(({ r }) => r.outcome.status === "abandoned").length;
    const head = `# ${basename(repo)}, ${day}\n\n${attempts.length} attempt${attempts.length === 1 ? "" : "s"} recorded, ${abandoned} abandoned. Written by anvc export from the records in git; each was true when it was written.`;
    return { day, page: `${[head, ...items.map((i) => i.text)].join("\n\n")}\n` };
  });
  return { days, leftOut };
}
