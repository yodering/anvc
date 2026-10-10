/**
 * What ANVC tells an agent about the numbers in a project, and about the work
 * done there before ANVC was turned on.
 *
 * Results only reach the Results page when the agent records them with
 * anvc_result, and it was told to only where results were already in use or
 * the person had chosen them in setup. A research project turned on with the
 * defaults had neither, so its agent never heard, and its numbers stayed in
 * JSON and Markdown files with nothing saying where they came from. So the
 * agent is now told where numbers actually are: in files a command wrote, in
 * files it writes itself, and, the first time ANVC runs in a project that
 * already had work in it, in the files and sessions from before.
 */
import { appendFileSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { shellWord } from "./args";
import { backfill, sessionFiles } from "./backfill";
import { gitOrNull } from "./git";
import { ingest } from "./ingest";
import { keepSession, keptSessions } from "./keep";
import { plural } from "./activity";
import { marker } from "./localonly";
import { readHead, readJson, stateRoot, writeJson } from "./rawlog";
import { MANIFEST, sameNumber, skipDir } from "./results";
import { scrub } from "./scrub";
import { anvcCommand } from "./version";

/** Files that can hold results: data, notes and logs. Code and configuration can't. */
const DATA = /\.(json|jsonl|csv|tsv|md|txt|log)$/i;

/** A project's own documents, which quote numbers rather than produce them. */
const DOCS = /^(README|CHANGELOG|LICENSE|CONTRIBUTING|AGENTS|CLAUDE|CODE_OF_CONDUCT|SECURITY|NOTICE|TRADEMARKS|CLA)(\.|$)/i;

/**
 * Measured-looking numbers: a decimal or a percentage, not part of a dotted
 * version such as 0.4.4, which every package.json has.
 */
const MEASURED = /(?<![\d.])\d+\.\d+(?![\d.])|(?<![\d.])\d+(?:\.\d+)?%/g;

/**
 * Whether text holds at least three measured-looking numbers that aren't
 * `recorded` values. A report that only repeats recorded results asked for
 * them to be recorded again on every write.
 */
export function holdsNumbers(text: string, recorded: () => string[] = () => []): boolean {
  const found = text.match(MEASURED) ?? [];
  if (found.length < 3) return false;
  // Asked only now: reading every result on each tool call costs a hook more than this check.
  const known = recorded();
  return found.filter((n) => !known.some((v) => sameNumber(v, n))).length >= 3;
}

/** Whether a repository-relative path is a kind of file that can hold results. */
export function isDataPath(path: string): boolean {
  const folders = path.split(/[\\/]/);
  const name = folders.pop()!;
  return DATA.test(name) && !MANIFEST.test(name) && !DOCS.test(name) && !folders.some(skipDir);
}

/** Whether a file in the repository holds numbers worth recording. */
function fileHoldsNumbers(repo: string, path: string, recorded?: () => string[]): boolean {
  if (!isDataPath(path)) return false;
  const text = readHead(join(repo, path), 64 * 1024);
  return text !== null && holdsNumbers(text, recorded);
}

/**
 * Files in the repository that hold numbers, newest first: tracked, and new
 * ones git doesn't ignore. At most `limit`, reading at most 400 files.
 */
export function dataFiles(repo: string, limit: number): string[] {
  const listed = (gitOrNull(repo, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]) ?? "").split("\0").filter(isDataPath);
  const mtime = (p: string) => { try { return statSync(join(repo, p)).mtimeMs; } catch { return 0; } };
  const out: string[] = [];
  for (const path of listed.map((p) => ({ p, at: mtime(p) })).sort((a, b) => b.at - a.at).slice(0, 400).map(({ p }) => p)) {
    if (fileHoldsNumbers(repo, path)) out.push(path);
    if (out.length >= limit) break;
  }
  return out;
}

/** How an agent should say a number is recorded. */
export const RECORD_RESULT = "record it with anvc_result: the value, the file and the key it's under, the command that made it and what it depends on";

/** The line an agent gets when files it or a command just wrote hold numbers. */
export function dataLine(paths: string[]): string {
  const named = paths.slice(0, 3).map((p) => `\`${p}\``).join(", ");
  return `anvc: ${named}${paths.length > 3 ? ` and ${paths.length - 3} more` : ""} ${paths.length === 1 ? "holds" : "hold"} numbers. If one is a result someone will rely on, ${RECORD_RESULT}. Keep the file as it is; this records where the number came from.`;
}

/**
 * Files a command wrote, kept per session for the injection hook to look at.
 * Capture sees a command finish and inject doesn't, so capture notes them and
 * the next injection says so.
 */
const writtenFile = (session: string) => join(stateRoot(), `${session.replace(/[^\w.-]/g, "-")}.written`);

export function noteWritten(session: string, paths: string[]): void {
  if (!paths.length) return;
  try { mkdirSync(stateRoot(), { recursive: true }); appendFileSync(writtenFile(session), `${paths.join("\n")}\n`); } catch { /* a reminder lost */ }
}

/**
 * The files a command wrote in this session that hold numbers, with a
 * folder it wrote looked into, as repository-relative paths. `said` leaves
 * out those already spoken about.
 */
export function writtenData(repo: string, session: string, said: (path: string) => boolean, recorded?: () => string[]): string[] {
  let paths: string[] = [];
  try { paths = readFileSync(writtenFile(session), "utf8").split("\n").filter(Boolean); } catch { return []; }
  const out = new Set<string>();
  for (const path of new Set(paths)) {
    let inside: string[] = [path];
    try { if (statSync(join(repo, path)).isDirectory()) inside = readdirSync(join(repo, path)).slice(0, 50).map((n) => `${path}/${n}`); } catch { continue; }
    for (const p of inside) if (!said(p) && fileHoldsNumbers(repo, p, recorded)) out.add(p);
  }
  return [...out];
}

/**
 * What the agent is told the first time ANVC runs in a project that already
 * had agent sessions or files that hold numbers, and nothing recorded yet. Null
 * once it was said, or when there's nothing from before. `said` marks it, so
 * an offer left out for length is made another time.
 */
export function catchUpOffer(repo: string, session: string, records: number): { text: string; said: () => void } | null {
  const file = marker(repo, "catch-up.json");
  if (!file || records > 0 || readJson<{ offered?: string } | null>(file, null)?.offered) return null;
  const said = () => { try { writeJson(file, { offered: new Date().toISOString() }); } catch { /* said again next time */ } };
  const sessions = sessionFiles(repo).filter((s) => s.session !== session).length;
  const files = dataFiles(repo, 4);
  if (!sessions && !files.length) { said(); return null; }
  const named = files.map((p) => `\`${p}\``).join(", ");
  const how = "with anvc_result naming each one's file and key";
  const batch = "Record the numbers several to a call, and from a subagent if you can start one, so this conversation stays short.";
  // The sessions come first, in a question of their own: offered as one of
  // three next steps, the import was passed over and the log stayed empty.
  const text = sessions
    ? `anvc is on in this repository, and ${plural(sessions, "earlier agent session")} here ${sessions === 1 ? "isn't" : "aren't"} in it yet. `
      + `In your next reply, first ask the user one short question: whether to import ${sessions === 1 ? "it" : "them"} as private records, such as "Import the ${sessions === 1 ? "earlier session" : `${sessions} earlier sessions`} into ANVC?". `
      + `Recommend yes, and on a yes run \`${anvcCommand()} catch-up --repo ${shellWord(repo)}\`. Don't run it without one.`
      + (files.length ? ` Files here also hold numbers, such as ${named}. After that, offer separately to record the ones the user relies on, ${how}. ${batch}` : "")
    : `anvc is on in this repository, and work happened here before it was: files that hold numbers, such as ${named}. ANVC has none of it yet. `
      + `Ask the user whether to bring in the numbers they rely on, ${how}. Do nothing without a yes. ${batch}`;
  return { said, text };
}

/** Sessions on disk for this repository that ANVC has no copy of: the ones from before it was on, which catch-up imports. */
export function earlierSessions(repo: string): number {
  const kept = new Set(keptSessions(repo).map((k) => k.session));
  return sessionFiles(repo).filter((s) => !kept.has(s.session)).length;
}

/**
 * `anvc catch-up`: everything ANVC can take in by itself from before it was
 * on. Past sessions become private records and are copied, so they outlive
 * the agent deleting its own. The numbers in the project's files need the
 * agent, which knows which of them are results, so those are listed.
 */
export function catchUp(repo: string): { sessions: number; written: number; skipped: number; failed: string[]; kept: number; files: string[] } {
  const found = backfill(repo, { scrub });
  const done = found.events.length ? ingest(repo, found.events) : { written: 0, skipped: 0, failed: [] };
  let kept = 0;
  for (const s of sessionFiles(repo)) if (keepSession(repo, s.agent, s.session, s.path, { force: true })) kept++;
  return { sessions: found.sessions, written: done.written, skipped: done.skipped, failed: done.failed, kept, files: dataFiles(repo, 20) };
}
