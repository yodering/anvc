/**
 * Results: the values a project relies on, and whether each can still be trusted.
 *
 * A research project makes hundreds of numbers in files named v3, v4, v6.
 * Months and several compactions later, a number already in the paper can't
 * be traced: nobody remembers which run made it, whether it was the good run,
 * whether a later change made it stale, or whether it was final. Finding the
 * file is half of it. The other half is its standing.
 *
 * So a result records the value as it is used, where it lives (a file and a
 * key, fingerprinted), how it was made (command, settings), what it depends
 * on (files and folders, fingerprinted), why, and a status the person
 * controls: draft, current, locked, superseded or invalid. Whenever a result
 * is shown, the files it names are fingerprinted again, so "locked and
 * nothing it depends on changed" and "locked, but d_model.py changed" are
 * facts, not guesses. Only what a result depends on counts: in a project of
 * four parts, three changing doesn't make the fourth part's locked result
 * stale.
 *
 * Nothing is copied. A fingerprint is a hash, sampled for large files, and a
 * folder is summarised by its files' names and sizes.
 */
import { createHash } from "node:crypto";
import { closeSync, lstatSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { gitOrNull } from "./git";
import { marker } from "./localonly";
import { appendRecord, defaultTier, readRecords, tierOf, ulid, type CheckpointRecord, type ResultStatus, type Tier } from "./record";
import { headAnchor } from "./retire";
import { remoteOf } from "./query";
import { below, captureFiles, isRepo, readJson, readJsonl, realInside, samePath, stateRoot, writeJson } from "./rawlog";
import { stateHome } from "./version";
import { flags, onlyReads } from "./runs";
import { runsFiles } from "./runlog";

// ------------------------------------------------------------------ settings

/**
 * How much of this ANVC keeps. Off: nothing, and the result tool says so.
 * Results: what the agent records, checked whenever shown. A choice, like
 * everything else that changes what is kept: many projects have no data
 * worth tracking.
 */
export type DataMode = "off" | "results";
export const DATA_MODES: Record<DataMode, { label: string; what: string }> = {
  off: { label: "Off", what: "Don't keep track of results." },
  results: { label: "On", what: "Your agent records the numbers you rely on, with where they came from, and ANVC checks them whenever they're shown." },
};
export const DEFAULT_DATA_MODE: DataMode = "results";

const everywhereFile = () => join(stateHome(), "data.json");
const projectFile = (repo: string) => marker(repo, "data.json");
const readMode = (file: string | null): DataMode | null => {
  const mode = file ? readJson<{ mode?: unknown } | null>(file, null)?.mode : undefined;
  return typeof mode === "string" && Object.hasOwn(DATA_MODES, mode) ? mode as DataMode : null;
};

/** This project's choice, else the one for every project, else the default. Null is no project. */
export function dataMode(repo: string | null): { mode: DataMode; from: "project" | "everywhere" | "default" } {
  const project = repo ? readMode(projectFile(repo)) : null;
  if (project) return { mode: project, from: "project" };
  const everywhere = readMode(everywhereFile());
  if (everywhere) return { mode: everywhere, from: "everywhere" };
  return { mode: DEFAULT_DATA_MODE, from: "default" };
}

/** The choice for every project, whatever one project chose. */
export const everywhereDataMode = (): DataMode => readMode(everywhereFile()) ?? DEFAULT_DATA_MODE;

/** Drops this project's own choice, so it follows the one for every project. */
export function clearProjectDataMode(repo: string): void {
  const file = projectFile(repo);
  if (file) rmSync(file, { force: true });
}

/** Saves the choice for one project, or for every project when `repo` is null. */
export function setDataMode(repo: string | null, mode: DataMode): void {
  if (!Object.hasOwn(DATA_MODES, mode)) throw new Error(`mode must be one of ${Object.keys(DATA_MODES).join(", ")}`);
  const file = repo ? projectFile(repo) : everywhereFile();
  if (!file) throw new Error("not a git repository");
  writeJson(file, { mode });
}

// -------------------------------------------------------------- fingerprints

/** Files up to this size are hashed whole; larger ones are sampled. */
const FULL_HASH_BYTES = 64 * 1024 * 1024;
const SAMPLE_BYTES = 1024 * 1024;
/** A folder is summarised by at most this many of its files. */
const MAX_FOLDER_FILES = 5000;

export interface Fingerprint { hash: string; bytes: number }

/**
 * A file's or folder's fingerprint, or null when it isn't there.
 *
 * A file up to 64 MB is hashed whole. A larger one is sampled: its size and
 * three 1 MB slices, which catches any rewrite and almost any edit, and is
 * marked "sampled:" so nobody mistakes it for a full hash. A folder is the
 * hash of its files' paths, sizes and, for small files, contents.
 */
export function fingerprint(path: string, every = false): Fingerprint | null {
  let stat;
  try { stat = statSync(path); } catch { return null; }
  if (stat.isDirectory()) return folderPrint(path, every);
  // A file whose size and modification time are as they were keeps its
  // fingerprint, so showing a hundred results doesn't re-read their data.
  const cache = prints();
  const known = cache.get(path);
  if (known && known.bytes === stat.size && known.mtime === stat.mtimeMs) return { hash: known.hash, bytes: known.bytes };
  const print = hashFile(path, stat.size);
  cache.set(path, { ...print, mtime: stat.mtimeMs });
  savePrints();
  return print;
}

function hashFile(path: string, size: number): Fingerprint {
  if (size <= FULL_HASH_BYTES) {
    return { hash: `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`, bytes: size };
  }
  const h = createHash("sha256").update(String(size));
  const fd = openSync(path, "r");
  try {
    for (const at of [0, Math.floor(size / 2), size - SAMPLE_BYTES]) {
      const buf = Buffer.alloc(SAMPLE_BYTES);
      readSync(fd, buf, 0, SAMPLE_BYTES, at);
      h.update(buf);
    }
  } finally { closeSync(fd); }
  return { hash: `sampled:${h.digest("hex")}`, bytes: size };
}

type Print = { hash: string; bytes: number; mtime: number };
let cached: Map<string, Print> | null = null;
const printsFile = () => join(stateRoot(), "prints.json");
function prints(): Map<string, Print> {
  if (cached) return cached;
  try { cached = new Map(Object.entries(readJson<Record<string, Print>>(printsFile(), {}))); }
  catch { cached = new Map(); }
  return cached;
}
function savePrints(): void {
  if (!cached) return;
  // The newest few thousand; an old entry is only a hash to take again.
  const entries = [...cached.entries()].slice(-5000);
  try {
    mkdirSync(dirname(printsFile()), { recursive: true });
    writeFileSync(printsFile(), JSON.stringify(Object.fromEntries(entries)));
  } catch { /* hashed again next time */ }
}

/**
 * The files a folder's fingerprint covers, in a fixed order. Caches and
 * bytecode are left out: a result that depended on a folder was flagged as
 * changed when Python wrote __pycache__/*.pyc into it. `every` keeps them,
 * for a fingerprint taken before that, under the "folder:" name.
 */
function folderFiles(root: string, every = false): { files: Array<{ path: string; size: number; mtime: number }>; partial: boolean } {
  const files: Array<{ path: string; size: number; mtime: number }> = [];
  const base = samePath(root);
  const walk = (dir: string) => {
    let names: string[] = [];
    try { names = readdirSync(dir).sort(); } catch { return; }
    for (const name of names) {
      if (files.length >= MAX_FOLDER_FILES || name === ".git" || name === "node_modules") continue;
      const path = join(dir, name);
      let stat;
      try { stat = statSync(path); } catch { continue; }
      // A link out of the folder isn't followed: it can point anywhere on this computer.
      try { if (lstatSync(path).isSymbolicLink() && below(base, samePath(path)) === null) continue; } catch { continue; }
      if (stat.isDirectory()) { if (every || !skipDir(name)) walk(path); continue; }
      if (!every && /\.py[co]$|^\.DS_Store$/.test(name)) continue;
      files.push({ path, size: stat.size, mtime: stat.mtimeMs });
    }
  };
  walk(root);
  return { files, partial: files.length >= MAX_FOLDER_FILES };
}

function folderPrint(root: string, every = false): Fingerprint {
  const h = createHash("sha256");
  const { files, partial } = folderFiles(root, every);
  for (const f of files) {
    // With /, so a folder has one fingerprint on Windows and elsewhere.
    h.update(`${below(root, f.path)}\0${f.size}\0`);
    if (f.size <= 256 * 1024) h.update(readFileSync(f.path));
  }
  const name = every ? "folder" : "files";
  return { hash: `${partial ? `${name}-partial` : name}:${h.digest("hex")}`, bytes: files.reduce((n, f) => n + f.size, 0) };
}

/** Up to three files in a folder written after a time, newest first, to name what changed in it. */
function newerIn(root: string, since: number): string[] {
  return folderFiles(root).files.filter((f) => f.mtime > since).sort((a, b) => b.mtime - a.mtime).slice(0, 3).map((f) => below(root, f.path)!);
}

// ------------------------------------------------------------------- values

/**
 * JSON, and JSON as Python writes it: json.dump puts NaN and Infinity where a
 * float was one, which JSON doesn't allow, and a results file holding one
 * read as holding nothing, so every key in it was "couldn't find". They read
 * as null here.
 */
function parseJson(text: string): unknown {
  try { return JSON.parse(text); }
  catch { return JSON.parse(text.replace(/"(?:\\.|[^"\\])*"|-?\bInfinity\b|\bNaN\b/g, (m) => m[0] === '"' ? m : "null")); }
}

/** A file's text when it is no larger than `max` bytes, else null. */
function readSmall(path: string, max: number): string | null {
  try { return statSync(path).size > max ? null : readFileSync(path, "utf8"); } catch { return null; }
}

/**
 * A CSV or TSV file's rows, each cell trimmed, blank lines skipped.
 *
 * Quoted cells are read as RFC 4180 writes them, so a separator, a doubled
 * quote or a line break inside quotes stays in its cell. Split on every
 * comma, `"Results, final",0.882` moved each later value of its row one
 * column right. A quote inside an unquoted cell is kept as it is.
 */
function table(path: string, text: string): string[][] {
  const sep = /\.tsv$/i.test(path) ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  const endRow = () => {
    row.push(cell.trim());
    if (row.length > 1 || row[0]) rows.push(row);
    row = [];
    cell = "";
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c !== '"') cell += c;
      else if (text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = false;
    } else if (c === '"' && !cell.trim()) { cell = ""; quoted = true; }
    else if (c === sep) { row.push(cell.trim()); cell = ""; }
    else if (c === "\n" || c === "\r") endRow();
    else cell += c;
  }
  endRow();
  return rows;
}

/**
 * The data rows a CSV row key names: "name" is the rows whose first cell is
 * that; "benchmark=aftraj,horizon=3" the rows where each named column holds
 * its value.
 */
function rowsNamed(rows: string[][], name: string): string[][] {
  const header = rows[0] ?? [];
  const pairs = name.includes("=") ? name.split(",").map((p) => p.split("=")).map(([col, ...v]) => [header.indexOf(col!.trim()), v.join("=").trim()] as const) : null;
  // A first cell can hold "=" too, as a sweep's lr=0.1 does.
  if (!pairs || pairs.some(([col]) => col < 0)) return rows.slice(1).filter((r) => r[0] === name);
  return rows.slice(1).filter((r) => pairs.every(([col, v]) => r[col] === v));
}

/** The cell a "row/column" key names in a table whose first row is its header, or null. */
function cellAt(rows: string[][], key: string): string | null {
  // Either half can hold a slash: a row named by a file path, a column
  // named val/acc. values() writes such keys, so every split is tried.
  for (let at = key.indexOf("/"); at >= 0; at = key.indexOf("/", at + 1)) {
    const col = rows[0]?.indexOf(key.slice(at + 1)) ?? -1;
    const hits = col >= 0 ? rowsNamed(rows, key.slice(0, at)) : [];
    if (hits.length === 1 && hits[0]![col] !== undefined) return hits[0]![col]!;
  }
  return null;
}

/**
 * Each Markdown table in a text, as rows of cells with the header first. The
 * |---| line is dropped, and bold or code marks around a cell come off.
 */
export function markdownTables(text: string): string[][][] {
  const tables: string[][][] = [];
  let rows: string[][] = [];
  for (const line of [...text.split(/\r?\n/), ""]) {
    if (!/^\s*\|.*\|\s*$/.test(line)) {
      if (rows.length > 1) tables.push(rows);
      rows = [];
      continue;
    }
    const cells = line.trim().slice(1, -1).split("|").map((c) => c.trim().replace(/^[*_`]+|[*_`]+$/g, ""));
    if (!cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells);
  }
  return tables;
}

/**
 * The value at `key` in a file, as text, or null.
 *
 * JSON: a dotted path, "test.acc" or "runs.2.f1". CSV, TSV and Markdown tables: "row/column",
 * the row found by its first cell, or by several columns, as in
 * "benchmark=aftraj,horizon=3/auc". A key that fits more than one row reads
 * as nothing: the first of several rows sharing a first cell gave a number
 * from another row. Anything else: the first number on the first line
 * containing the key.
 */
export function readValue(path: string, key: string): string | null {
  const text = readSmall(path, 16 * 1024 * 1024);
  if (text === null) return null;
  if (/\.json$/i.test(path)) {
    try {
      let at: unknown = parseJson(text);
      for (const part of key.split(".")) {
        if (at === null || typeof at !== "object") return null;
        at = (at as Record<string, unknown>)[part];
      }
      return at === undefined || (typeof at === "object" && at !== null) ? null : String(at);
    } catch { return null; }
  }
  if (/\.(csv|tsv)$/i.test(path) && key.includes("/")) return cellAt(table(path, text), key);
  // A report's table read by the line search gave the row's first number: 252
  // from "| All | 252 | 0.05 |" where 0.05 was meant. A key that fits a cell
  // in more than one table reads as nothing, as one that fits two rows does.
  if (/\.(md|markdown)$/i.test(path) && key.includes("/")) {
    const hits = markdownTables(text).map((rows) => cellAt(rows, key)).filter((v) => v !== null);
    if (hits.length) return hits.length === 1 ? hits[0]! : null;
  }
  const line = text.split(/\r?\n/).find((l) => l.includes(key));
  const after = line ? line.slice(line.indexOf(key) + key.length) : "";
  return after.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?%?/i)?.[0] ?? null;
}

/** A written number: its value, how many decimals it was written with, and whether it was a percentage. */
function parseNumber(text: string): { n: number; decimals: number; percent: boolean } | null {
  const m = text.replace(/\u2212/g, "-").replace(/,(?=\d{3}\b)/g, "").match(/-?\d+(?:\.(\d+))?(?:e([-+]?\d+))?\s*(%)?/i);
  if (!m) return null;
  const n = Number(m[0].replace(/%$/, "").trim());
  // 1e-4 is written to four decimals, 3.2e-5 to six.
  const decimals = Math.max(0, (m[1]?.length ?? 0) - Number(m[2] ?? 0));
  return Number.isFinite(n) ? { n, decimals, percent: Boolean(m[3]) } : null;
}

/** Significant digits as written: 0.02 has one, 88.1 three. Trailing zeros count unless `bare`. */
export function significant(written: string, bare = false): number {
  const mantissa = (written.replace(/,(?=\d{3}\b)/g, "").match(/\d+(?:\.\d+)?/)?.[0] ?? "").replace(".", "").replace(/^0+/, "");
  return (bare ? mantissa.replace(/0+$/, "") : mantissa).length;
}

/**
 * Whether a value found in a file is the one written somewhere, allowing for
 * rounding to the written precision and for a fraction written as a percent:
 * 0.8812 is "88.1%", "0.881" and "88.12".
 *
 * A number written with one significant digit, like 0.02, matches only
 * itself and its roundings: read as a percent too, it would match every "2%"
 * in a download bar or a sentence. A % sign says it is a percent either way.
 */
export function sameNumber(written: string, found: string): boolean {
  // 76% written from a count printed as 38/50. Two significant digits at
  // least: 50% is half of anything.
  const count = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(found);
  if (count) {
    if (/\d\s*\/\s*\d/.test(written)) return written.replace(/\s+/g, "") === found.replace(/\s+/g, "");
    return Number(count[2]) > 0 && significant(written, true) >= 2 && sameNumber(written, String(Number(count[1]) / Number(count[2])));
  }
  const w = parseNumber(written), f = parseNumber(found);
  if (!w || !f) return written.trim() === found.trim();
  const round = (x: number) => Number(x.toFixed(Math.min(w.decimals, 12)));
  const convert = w.percent || significant(written) > 1;
  const candidates = [f.n, convert ? f.n * 100 : NaN, convert && f.percent ? f.n / 100 : NaN];
  return candidates.some((c) => Number.isFinite(c) && Math.abs(round(c) - w.n) < 1e-9);
}

// ------------------------------------------------------------------ records

export interface ResultInput {
  name: string;
  value: string;
  status?: ResultStatus;
  part?: string;
  source?: { path: string; key?: string };
  command?: string;
  settings?: Record<string, string>;
  depends?: string[];
  derived_from?: string[];
  replaces?: string;
  used_in?: string[];
  why?: string;
  after_the_fact?: boolean;
}

export type Actor = { kind: "agent"; agent: string; session: string } | { kind: "person" };

/** The session a record by this actor is filed under. */
export const sessionOf = (actor: Actor): CheckpointRecord["session"] =>
  actor.kind === "agent" ? { agent: actor.agent, run_id: actor.session } : { agent: "person", run_id: "anvc-person" };

/** Writes a kept record by `actor` holding `body`: a goal, rule set, status item or tool note. */
export function appendKept(repo: string, body: Pick<CheckpointRecord, "objective" | "rule" | "status_item" | "tool_note" | "map" | "supersedes">, goal: string,
  why: string | undefined, actor: Actor, tier: Tier): { id: string; ref: string } {
  const record: CheckpointRecord = {
    anvc: 0,
    id: ulid(),
    anchor: headAnchor(repo),
    ...body,
    session: sessionOf(actor),
    intent: { goal: goal.slice(0, 200), ...(why?.trim() ? { why: why.trim().slice(0, 2000) } : {}) },
    outcome: { status: "kept" },
    ts: new Date().toISOString(),
  };
  const { ref } = appendRecord(repo, record, { tier });
  return { id: record.id, ref };
}

const inside = (repo: string, path: string): string => {
  const rel = below(repo, resolve(repo, path));
  if (!rel || !realInside(repo, rel)) throw new Error(`${path} is not inside the repository`);
  return rel;
};

/**
 * Records a result, fingerprinting what it names. Returns the record and what
 * ANVC found: whether the value is really at the source, and anything it
 * couldn't see.
 */
export function recordResult(repo: string, given: ResultInput, actor: Actor): { id: string; ref: string; notes: string[] } {
  let input = given;
  const notes: string[] = [];
  // An agent can propose a lock; only the person sets one.
  let status: ResultStatus = input.status ?? "current";
  let proposedLock = false;
  if (status === "locked" && actor.kind === "agent") { status = "current"; proposedLock = true; }
  let source: NonNullable<CheckpointRecord["result"]>["source"];
  if (input.source?.path) {
    const path = inside(repo, input.source.path);
    const print = fingerprint(join(repo, path));
    if (!print) notes.push(`${path} isn't here, so ANVC couldn't fingerprint it or check the value.`);
    const read = print && input.source.key ? readValue(join(repo, path), input.source.key) : null;
    if (input.source.key && print) {
      if (read === null) notes.push(`Couldn't find ${input.source.key} in ${path}.`);
      else if (!sameNumber(input.value, read)) notes.push(`${path} → ${input.source.key} holds ${read}, not ${input.value}.`);
      else notes.push(`Checked: ${path} → ${input.source.key} holds ${read}.`);
    }
    source = { path, ...(input.source.key ? { key: input.source.key } : {}), ...(print ? { hash: print.hash, bytes: print.bytes } : {}), ...(read !== null ? { read } : {}) };
  }
  // The run that wrote the source, from the raw log, fills in what the agent
  // left out: the command, its settings, and the files it read.
  const made = input.source?.path ? producer(repo, inside(repo, input.source.path)) : null;
  if (made?.command && !input.command) {
    input = { ...input, command: made.command.split("\n")[0]!.slice(0, 1000) };
    notes.push(`Command taken from the log: ${input.command}`);
    if (!input.settings || !Object.keys(input.settings).length) {
      const found = flags(input.command!);
      if (Object.keys(found).length) input = { ...input, settings: found };
    }
  }
  if (made?.inputs?.length && !input.depends?.length) {
    input = { ...input, depends: made.inputs.map((f) => f.path).slice(0, 20) };
    notes.push(`Depends on, from what that command read: ${input.depends!.join(", ")}`);
  }
  const depends = (input.depends ?? []).map((p) => {
    const path = inside(repo, p);
    const print = fingerprint(join(repo, path));
    if (!print) notes.push(`${path} isn't here, so it can't be checked later.`);
    return { path, ...(print ? { hash: print.hash, bytes: print.bytes } : {}) };
  });
  const id = ulid();
  const record: CheckpointRecord = {
    anvc: 0,
    id,
    anchor: headAnchor(repo),
    result: {
      name: input.name.trim().slice(0, 120),
      value: input.value.trim().slice(0, 80),
      status,
      ...(input.part ? { part: input.part.trim().slice(0, 80) } : {}),
      ...(source ? { source } : {}),
      ...(input.command ? { command: input.command.slice(0, 1000) } : {}),
      ...(input.settings && Object.keys(input.settings).length ? { settings: input.settings } : {}),
      ...(depends.length ? { depends } : {}),
      ...(input.derived_from?.length ? { derived_from: input.derived_from } : {}),
      ...(input.replaces ? { replaces: input.replaces } : {}),
      ...(input.used_in?.length ? { used_in: input.used_in } : {}),
      ...(input.after_the_fact ? { after_the_fact: true } : {}),
    },
    session: sessionOf(actor),
    intent: { goal: `Result: ${input.name} = ${input.value}`.slice(0, 200), ...(input.why ? { why: input.why.slice(0, 4000) } : {}) },
    outcome: { status: "kept" },
    ts: new Date().toISOString(),
  };
  const { ref } = appendRecord(repo, record, { tier: defaultTier(repo) });
  if (proposedLock) {
    recordStatus(repo, id, "locked", "", actor);
    notes.push("Locking is the person's call, so this is saved as current with a lock proposed.");
  }
  return { id, ref, notes };
}

/** Changes a result's status: a new record, so the history stays. */
export function recordStatus(repo: string, of: string, status: ResultStatus, why: string, actor: Actor): { id: string; ref: string } {
  const target = listResults(repo).find((r) => r.id === of);
  if (!target) throw new Error(`no result ${of}`);
  // Confirming a result is checking it again, so what it names is
  // fingerprinted as it is now. A status change kept the first fingerprints,
  // and a result stayed flagged however often it was confirmed.
  const now = (path: string) => fingerprintInside(repo, path);
  const fresh = status === "current" || status === "locked";
  const source = fresh && target.source ? { ...target.source, ...(now(target.source.path) ?? {}) } : undefined;
  const depends = fresh && target.depends.length ? target.depends.map((d) => ({ path: d.path, ...(now(d.path) ?? {}) })) : undefined;
  const record: CheckpointRecord = {
    anvc: 0,
    id: ulid(),
    anchor: headAnchor(repo),
    result: { name: target.name, of, status, ...(source ? { source } : {}), ...(depends ? { depends } : {}) },
    session: sessionOf(actor),
    intent: { goal: `${status[0]!.toUpperCase()}${status.slice(1)}: ${target.name}`.slice(0, 200), ...(why ? { why: why.slice(0, 2000) } : {}) },
    outcome: { status: "kept" },
    ts: new Date().toISOString(),
  };
  const { ref } = appendRecord(repo, record, { tier: target.tier });
  return { id: record.id, ref };
}

// ---------------------------------------------------------------- the fold

export interface ResultView {
  id: string;
  name: string;
  value: string;
  status: ResultStatus;
  /** Who set the status now in force. */
  by: "person" | "agent";
  /** An agent asked for a status the person hasn't decided on (locked, or a change to a locked result). */
  proposed: { status: ResultStatus; why: string; ts: string } | null;
  part: string | null;
  ts: string;
  agent: string;
  session: string;
  tier: "private" | "shared";
  why: string | null;
  source: NonNullable<CheckpointRecord["result"]>["source"] | null;
  command: string | null;
  settings: Record<string, string>;
  depends: Array<{ path: string; hash?: string; bytes?: number }>;
  derived_from: string[];
  replaces: string | null;
  replaced_by: string | null;
  used_in: string[];
  after_the_fact: boolean;
  history: Array<{ ts: string; status: ResultStatus; by: "person" | "agent"; why: string | null; proposed: boolean }>;
}

/**
 * Every result, with the status now in force.
 *
 * The latest person's decision wins. An agent's change applies unless the
 * result is locked, and an agent can't lock: both stay proposals until the
 * person decides. A newer result that replaces an older one supersedes it,
 * unless the older one is locked; then both stand and the replacement waits.
 */
export function listResults(repo: string): ResultView[] {
  const all = readRecords(repo);
  const roots = new Map<string, ResultView>();
  const updates: Array<{ record: CheckpointRecord; person: boolean }> = [];
  for (const [ref, r] of all) {
    if (!r.result) continue;
    // The person is whoever works here. A fetched record that says "person"
    // was written by anyone who can push to that remote, so it counts as an
    // agent's: its lock is a proposal.
    const person = !remoteOf(ref) && r.session.agent === "person";
    if (r.result.of) { updates.push({ record: r, person }); continue; }
    const x = r.result;
    // A result that arrives locked is one nobody here locked.
    const lock = x.status === "locked" && !person ? { status: x.status, why: r.intent.why ?? "", ts: r.ts } : null;
    roots.set(r.id, {
      id: r.id, name: x.name, value: x.value ?? "", status: lock ? "current" : x.status, by: person ? "person" : "agent", proposed: lock,
      part: x.part ?? null, ts: r.ts, agent: r.session.agent, session: r.session.run_id, tier: tierOf(ref),
      why: r.intent.why ?? null, source: x.source ?? null, command: x.command ?? null, settings: x.settings ?? {},
      depends: x.depends ?? [], derived_from: x.derived_from ?? [], replaces: x.replaces ?? null, replaced_by: null,
      used_in: x.used_in ?? [], after_the_fact: Boolean(x.after_the_fact),
      history: [{ ts: r.ts, status: x.status, by: person ? "person" : "agent", why: r.intent.why ?? null, proposed: Boolean(lock) }],
    });
  }
  updates.sort((a, b) => a.record.ts.localeCompare(b.record.ts));
  for (const { record, person } of updates) {
    const view = roots.get(record.result!.of!);
    if (!view) continue;
    const status = record.result!.status;
    const why = record.intent.why ?? null;
    // An agent can't lock, and can't change a locked result.
    const proposal = !person && (status === "locked" || view.status === "locked");
    view.history.push({ ts: record.ts, status, by: person ? "person" : "agent", why, proposed: proposal });
    if (proposal) { view.proposed = { status, why: why ?? "", ts: record.ts }; continue; }
    if (record.result!.source) view.source = record.result!.source;
    if (record.result!.depends) view.depends = record.result!.depends;
    view.status = status;
    view.by = person ? "person" : "agent";
    if (why) view.why = why;
    view.proposed = null;
  }
  for (const view of roots.values()) {
    if (!view.replaces) continue;
    const older = roots.get(view.replaces);
    if (!older || view.status === "invalid") continue;
    older.replaced_by = view.id;
    if (older.status !== "locked" && older.status !== "invalid") older.status = "superseded";
  }
  return [...roots.values()].sort((a, b) => b.ts.localeCompare(a.ts));
}

// ---------------------------------------------------------------- checking

export type FileState = "same" | "changed" | "missing" | "unknown";

export interface ResultCheck {
  source: { state: FileState; now: string | null } | null;
  /** For a folder that changed: the files in it written since the result, when there are any. */
  depends: Array<{ path: string; state: FileState; newer?: string[] }>;
  derived: Array<{ id: string; name: string; status: ResultStatus | "missing" }>;
  /** Something it relies on is different from when it was recorded. */
  stale: boolean;
}

/** A path's fingerprint, or null when it's missing or links out of the repository, which is never read. */
const fingerprintInside = (repo: string, path: string, every = false): Fingerprint | null => {
  const real = realInside(repo, path);
  return real ? fingerprint(real, every) : null;
};

/**
 * A path a record names, checked again now. One that links out of the
 * repository counts as missing. A folder fingerprinted before caches were
 * left out is checked the way it was taken, so an update flags nothing.
 */
const stateOf = (repo: string, path: string, hash?: string): FileState => {
  if (!hash) return "unknown";
  const now = fingerprintInside(repo, path, hash.startsWith("folder"));
  return !now ? "missing" : now.hash === hash ? "same" : "changed";
};

/** Fingerprints what a result names again, now. */
export function checkResult(repo: string, view: ResultView, all?: ResultView[]): ResultCheck {
  const real = view.source && realInside(repo, view.source.path);
  const source = view.source
    ? { state: stateOf(repo, view.source.path, view.source.hash), now: view.source.key && real ? readValue(real, view.source.key) : null }
    : null;
  const depends = view.depends.map((d) => {
    const state = stateOf(repo, d.path, d.hash);
    const real = state === "changed" && realInside(repo, d.path);
    const newer = real && statSync(real).isDirectory() ? newerIn(real, Date.parse(view.ts)) : [];
    return { path: d.path, state, ...(newer.length ? { newer } : {}) };
  });
  const everyone = all ?? listResults(repo);
  const derived = view.derived_from.map((id) => {
    const from = everyone.find((r) => r.id === id);
    return { id, name: from?.name ?? id, status: from?.status ?? "missing" as const };
  });
  // A source read by its key is stale when the value there is, not when the
  // file is: adding a key to a results file flagged every result read from it.
  const sourceStale = Boolean(source && (source.state === "missing"
    || (source.state === "changed" && (!view.source?.key || source.now === null || !sameNumber(view.value, source.now)))));
  // A superseded or invalid result is history, and isn't flagged for what changed after it.
  const live = view.status !== "superseded" && view.status !== "invalid";
  const stale = live && (sourceStale
    || depends.some((d) => d.state === "changed" || d.state === "missing")
    || derived.some((d) => d.status === "invalid" || d.status === "superseded" || d.status === "missing"));
  return { source, depends, derived, stale };
}

// ------------------------------------------------------------------ saying it

const day = (ts: string) => new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** What changed in the settings from one version to the next: "lr 3e-4 → 1e-4". */
function settingsChanges(before: Record<string, string>, after: Record<string, string>): string[] {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return keys.flatMap((k) => before[k] === after[k] ? []
    : before[k] === undefined ? [`${k}=${after[k]}`]
    : after[k] === undefined ? [`no ${k}`]
    : [`${k} ${before[k]} → ${after[k]}`]);
}

/**
 * One result, as an agent reads it: the value, its standing, where it lives,
 * and what changed since, as facts. What to do follows from those, and is
 * said plainly where it matters: a locked result with nothing changed is not
 * to be re-run.
 */
export function describe(view: ResultView, check: ResultCheck, all: ResultView[] = []): string {
  const status = /^(locked|invalid)$/.test(view.status) ? view.status.toUpperCase() : view.status;
  const lines = [`- ${view.name} = ${view.value}${view.part ? ` [${view.part}]` : ""} · ${status}`
    + `${view.status === "locked" ? ` by the person, ${day(view.history.findLast((h) => h.status === "locked" && !h.proposed)?.ts ?? view.ts)}` : `, recorded ${day(view.ts)}`}`
    + ` · id ${view.id}`];
  if (view.source) {
    const where = `${view.source.path}${view.source.key ? ` → ${view.source.key}` : ""}`;
    const state = check.source?.state === "same" ? "unchanged since"
      : check.source?.state === "changed" ? `changed since${check.source.now === null ? "" : sameNumber(view.value, check.source.now) ? `, still holds ${check.source.now}` : `, now holds ${check.source.now}`}`
        : check.source?.state === "missing" ? "not on this computer" : "not fingerprinted";
    lines.push(`  from: ${where} (${state})`);
  }
  if (view.command) lines.push(`  made by: ${view.command}${Object.keys(view.settings).length ? ` · ${Object.entries(view.settings).map(([k, v]) => `${k}=${v}`).join(", ")}` : ""}`);
  if (check.depends.length) {
    lines.push(`  depends on: ${check.depends.map((d) => `${d.path} ${d.state === "same" ? "unchanged" : d.state === "changed" ? `CHANGED${d.newer ? ` (newer: ${d.newer.join(", ")})` : ""}` : d.state === "missing" ? "missing" : "?"}`).join(", ")}`);
  }
  if (check.derived.length) lines.push(`  computed from: ${check.derived.map((d) => `${d.name} (${d.status})`).join(", ")}`);
  if (view.why) lines.push(`  why: ${view.why.replace(/\s+/g, " ").slice(0, 240)}`);
  // The versions on either side, with what changed: the chronology an agent
  // needs before it re-runs something that was already tried.
  const byId = (id: string | null) => (id ? all.find((r) => r.id === id) : undefined);
  const older = byId(view.replaces);
  if (older) {
    const changed = settingsChanges(older.settings, view.settings);
    lines.push(`  replaces ${older.value} from ${day(older.ts)}${changed.length ? ` (${changed.join(", ")})` : ""}${older.why ? `; that one: ${older.why}` : ""}`);
  } else if (view.replaces) lines.push(`  replaces ${view.replaces}`);
  const newer = byId(view.replaced_by);
  if (newer) lines.push(`  replaced by ${newer.value} from ${day(newer.ts)} (id ${newer.id})`);
  else if (view.replaced_by) lines.push(`  replaced by ${view.replaced_by}`);
  if (view.used_in.length) lines.push(`  used in: ${view.used_in.join("; ")}`);
  if (view.status === "locked") {
    lines.push(check.stale
      ? "  Locked, but something it depends on changed since. Ask the person before re-running or replacing it."
      : "  Locked and nothing it depends on changed. Don't re-run it.");
  } else if (view.status === "invalid") {
    lines.push("  Invalid: don't use this value.");
  } else if (check.stale) {
    lines.push("  Something it depends on changed since it was recorded.");
  }
  if (view.proposed) lines.push(`  The agent proposed marking it ${view.proposed.status}; waiting for the person.`);
  return lines.join("\n");
}

// ------------------------------------------------------------------ the log

interface LogRow { ts: string; command?: string; output?: string; repo?: string; session_id?: string; outputs?: Array<{ path: string; hash: string }>; inputs?: Array<{ path: string; hash: string }> }

/** This repository's command rows from the raw log and from `anvc run`, oldest first. */
function logRows(repo: string): LogRow[] {
  const here = isRepo(repo);
  return [...captureFiles(repo), ...runsFiles(repo)].flatMap((file) => readJsonl<LogRow>(file))
    .filter((row) => here(row.repo) && row.command)
    .sort((a, b) => a.ts.localeCompare(b.ts));
}

/** The last command that named `path` as an output, from the raw log. */
function producer(repo: string, path: string): LogRow | null {
  return logRows(repo).filter((r) => r.outputs?.some((o) => o.path === path)).at(-1) ?? null;
}

/** Each numeric cell of a table, keyed "row/column" so readValue finds that cell and no other. */
function tableValues(rows: string[][]): Array<{ key: string; value: string }> {
  const out: Array<{ key: string; value: string }> = [];
  const header = rows[0] ?? [];
  const data = rows.slice(1, 5000);
  // Each row by the fewest leading columns that tell it from every other,
  // so readValue finds that row and no other.
  const lead = (r: string[], n: number) => r.slice(0, n).join("\u0000");
  const counts: Array<Map<string, string[][]>> = [];
  for (const row of data) {
    let name: string | null = null;
    for (let n = 1; n <= header.length && name === null; n++) {
      const c = counts[n] ??= Map.groupBy(data, (r) => lead(r, n));
      if (c.get(lead(row, n))!.length !== 1) continue;
      // Columns or cells holding "," or "=" would make a name that can't be read back apart.
      if (n > 1 && [...header.slice(0, n), ...row.slice(0, n)].some((v) => /[,=]/.test(v))) break;
      name = n === 1 ? row[0]! : header.slice(0, n).map((h, i) => `${h}=${row[i]}`).join(",");
    }
    if (name !== null) row.forEach((cell, i) => { if (i > 0 && /^-?\d/.test(cell)) out.push({ key: `${name}/${header[i] ?? i}`, value: cell }); });
  }
  return out;
}

/** Every value in a small data file, with the key that finds it again (see readValue). */
function values(path: string): Array<{ key: string; value: string }> {
  const text = readSmall(path, 4 * 1024 * 1024);
  if (text === null) return [];
  const out: Array<{ key: string; value: string }> = [];
  const walk = (at: unknown, key: string) => {
    if (out.length > 20000) return;
    if (at !== null && typeof at === "object") {
      for (const [k, v] of Object.entries(at as Record<string, unknown>)) walk(v, key ? `${key}.${k}` : k);
    } else if (typeof at === "number" || (typeof at === "string" && /^-?\d/.test(at))) out.push({ key, value: String(at) });
  };
  if (/\.json$/i.test(path)) { try { walk(parseJson(text), ""); } catch { /* not JSON after all */ } return out; }
  if (/\.jsonl$/i.test(path)) {
    text.split("\n").slice(0, 5000).forEach((line, i) => { try { walk(parseJson(line), `line ${i + 1}`); } catch { /* skipped */ } });
    // A field on more than 100 lines is one per example, such as each
    // prediction's probability. A three-digit number turns up among them by
    // chance, and was offered as where a result came from.
    const field = (key: string) => key.replace(/^line \d+\.?/, "");
    const lines = Map.groupBy(out, (v) => field(v.key));
    return out.filter((v) => lines.get(field(v.key))!.length <= 100);
  }
  if (/\.(csv|tsv)$/i.test(path)) return tableValues(table(path, text));
  if (/\.(md|markdown)$/i.test(path)) {
    // A key two tables share reads as nothing (see readValue), so it isn't offered.
    const all = markdownTables(text).flatMap(tableValues);
    const count = Map.groupBy(all, (v) => v.key);
    return all.filter((v) => count.get(v.key)!.length === 1);
  }
  if (/\.(txt|log|out|yaml|yml|tex)$/i.test(path)) {
    for (const line of text.split(/\r?\n/).slice(0, 20000)) {
      for (const m of line.matchAll(/-?\d+(?:\.\d+)?(?:e-?\d+)?%?/gi)) {
        const label = line.slice(0, m.index).replace(/[\s:=|,]+$/, "").slice(-60).trim();
        if (label) out.push({ key: label, value: m[0] });
      }
    }
  }
  return out;
}

// ------------------------------------------------------------------ finding

export interface Whence {
  results: ResultView[];
  /** The value found in a file a command wrote, with that command and whether the file changed since. */
  files: Array<{ path: string; key: string; found: string; command: string; ts: string; changed: boolean }>;
  /** Commands whose output printed the number, oldest first: the first is usually where it came from. */
  /**
   * With `beside`, whether the printed line (`beside: true`) or only the
   * same output (`same_run: true`) also holds another number from its line.
   */
  outputs: Array<{ ts: string; command: string; line: string; session: string; beside?: boolean; same_run?: boolean; score?: number }>;
  /**
   * Commands that only repeated it: they read files (cat, grep, git), or
   * printed a line an earlier command had already printed.
   */
  reads: Array<{ ts: string; command: string; line: string; session: string; again?: boolean }>;
  /**
   * The value in other data files, ones no logged command named as an output:
   * a script that writes its own results. With what is known of each: when it
   * last changed, the command that finished just after, the commit it is in.
   */
  elsewhere: Array<{ path: string; key: string; found: string; modified: string; before?: { command: string; ts: string }; commit?: string; score?: number }>;
}

/**
 * For a number in a document: the other numbers on its line, which a print
 * of the same table row holds too, and when the document last changed, after
 * which nothing printed can be where it came from.
 */
export interface WhenceContext { beside?: string[]; words?: string[]; before?: number }

/** Whether a printed line holds the number as written: a count whole, a value to its written precision. */
function matcher(text: string): (line: string) => boolean {
  const pair = text.match(/(\d+)\s*\/\s*(\d+)/);
  if (pair) {
    const at = new RegExp(`(?<![\\d.])${pair[1]}\\s*/\\s*${pair[2]}(?![\\d.])`);
    return (line) => at.test(line);
  }
  const written = text.match(/-?[\d.,]+(?:e[-+]?\d+)?\s*%?/i)?.[0] ?? text;
  return (line) => (line.replace(/\u2212/g, "-").match(NUMBERS) ?? []).some((n) => sameNumber(written, n));
}

/** What whence reads once, kept so a document check can ask about many numbers. */
export interface WhenceScope { results?: ResultView[]; rows?: LogRow[]; data?: DataFile[]; values?: Map<string, Array<{ key: string; value: string }>> }

interface DataFile { path: string; values: Array<{ key: string; value: string }>; mtime: number }

/** Folders of dependencies, builds and caches, never a project's results. */
const SKIP_DIRS = new Set(["node_modules", "vendor", "venv", "env", "__pycache__", "site-packages", "dist", "build", "target", "coverage"]);
export const skipDir = (name: string): boolean => name.startsWith(".") || SKIP_DIRS.has(name);
const DATA_FILE = /\.(json|jsonl|csv|tsv|log|out|txt|ya?ml)$/i;
/** Manifests and lockfiles: full of version numbers, never results. */
export const MANIFEST = /^(package(-lock)?\.json|bun\.lockb?|yarn\.lock|pnpm-lock\.yaml|[jt]sconfig.*\.json|composer\.(json|lock)|Pipfile\.lock|poetry\.lock|requirements.*\.txt|\.?[\w-]*rc\.json)$/i;
const PLAIN_NUMBER = /^-?\d+(?:\.\d+)?(?:e[-+]?\d+)?%?$/i;

/**
 * The numbers in the repository's data files. Capped at 2,000 files, 4 MB
 * each and 96 MB in all, so a query stays under a few seconds anywhere.
 */
function dataFiles(repo: string): DataFile[] {
  const out: DataFile[] = [];
  let bytes = 0;
  const walk = (dir: string, depth: number) => {
    let entries: import("node:fs").Dirent[];
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (out.length >= 2000 || bytes > 96 * 1024 * 1024) return;
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        if (depth < 8 && !skipDir(e.name)) walk(abs, depth + 1);
        continue;
      }
      if (!e.isFile() || !DATA_FILE.test(e.name) || MANIFEST.test(e.name)) continue;
      let st: import("node:fs").Stats;
      try { st = statSync(abs); } catch { continue; }
      if (!st.size || st.size > 4 * 1024 * 1024) continue;
      bytes += st.size;
      out.push({ path: below(repo, abs)!, values: values(abs).filter((v) => PLAIN_NUMBER.test(v.value)), mtime: st.mtimeMs });
    }
  };
  walk(repo, 0);
  return out;
}

/** Numbers as printed, a count like 38/50 taken whole. */
const NUMBERS = /\d+\s*\/\s*\d+|-?\d+(?:\.\d+)?(?:e[-+]?\d+)?%?/gi;

/** A progress bar or download line: its percentages aren't results. */
const PROGRESS = /\d%\s*\||[█▏▎▍▌▋▊▉━]|\[[=#>\s-]{5,}\]|\b(it\/s|s\/it)\b|^\s*(Downloading|Downloaded|Fetching|Resolving|Installing|Collecting)\b/;

/**
 * Where a value came from: recorded results holding it, or named like it,
 * then commands whose output printed it. "88.1%" finds 0.8812.
 */
export function whence(repo: string, text: string, limit = 8, scope: WhenceScope = {}, context: WhenceContext = {}): Whence {
  text = text.replace(/\u2212/g, "-");
  const results = scope.results ??= listResults(repo);
  const number = parseNumber(text);
  const words = text.toLowerCase().split(/\W+/).filter((w) => w.length > 2 && !/^\d+$/.test(w));
  // The number as written, without the words around it.
  const written = text.match(/-?[\d.,]+(?:e[-+]?\d+)?\s*%?/i)?.[0] ?? text;
  const byValue = number ? results.filter((r) => sameNumber(written, r.value) || sameNumber(r.value, text)) : [];
  const byName = words.length ? results.filter((r) => words.every((w) => `${r.name} ${r.part ?? ""}`.toLowerCase().includes(w))) : [];
  const found = [...new Map([...byValue, ...byName].map((r) => [r.id, r])).values()].slice(0, limit);

  const outputs: Whence["outputs"] = [];
  const reads: Whence["reads"] = [];
  const files: Whence["files"] = [];
  const elsewhere: Whence["elsewhere"] = [];
  // "38/50" is a count, not the number 38: matched as written, and only as a
  // whole number pair, so "45/50" in a table doesn't count as "5/50".
  const pair = text.match(/(\d+)\s*\/\s*(\d+)/);
  const fraction = pair ? `${pair[1]}/${pair[2]}` : null;
  // Words beside the number narrow it down: "8/10 units" keeps only prints
  // that mention units, in the line or the command.
  const labels = text.replace(/-?[\d.,]+(?:e-?\d+)?\s*%?|\d+\s*\/\s*\d+/gi, " ").toLowerCase().split(/[^a-z0-9_]+/).filter((w) => w.length > 1);
  if (number) {
    const exact = matcher(text);
    const holds = (line: string) => !PROGRESS.test(line) && exact(line);
    // Neighbours as evidence: a printed line with two of them (or the one
    // there is), or an output with all of them. 0/10 alone is in every table.
    const neighbours = (context.beside ?? []).map(matcher);
    const beside = (line: string) => neighbours.filter((m) => m(line)).length >= Math.min(2, neighbours.length);
    const sameRun = (lines: string[]) => neighbours.every((m) => lines.some(m));
    // Which printed line is this row: the one with the most of its neighbours
    // and of the words around it ("lines as shipped").
    const around = (context.words ?? []).map((w) => w.toLowerCase());
    const score = (line: string) => {
      const l = line.toLowerCase();
      return neighbours.filter((m) => m(line)).length * 2 + around.filter((w) => l.includes(w)).length + (labels.length && inLine(line) ? 1 : 0);
    };
    const about = (line: string, command: string) => labels.every((w) => `${line} ${command}`.toLowerCase().includes(w));
    const inLine = (line: string) => labels.every((w) => line.toLowerCase().includes(w));
    const all = scope.rows ??= logRows(repo);
    const rows = all.filter((r) => r.output);
    // Inside the files commands wrote: the latest writer of each.
    const writers = new Map<string, LogRow & { hash: string }>();
    for (const row of all) for (const o of row.outputs ?? []) writers.set(o.path, { ...row, hash: o.hash });
    for (const [path, row] of writers) {
      if (files.length >= limit) break;
      if (fraction) continue;
      const real = realInside(repo, path);
      if (!real) continue;
      // Read once per document: each number read every file again, and a
      // claims table of 165 numbers took 44 s.
      const cache = scope.values ??= new Map();
      if (!cache.has(real)) cache.set(real, values(real));
      for (const { key, value } of cache.get(real)!) {
        if (!sameNumber(written, value)) continue;
        const now = fingerprint(real);
        files.push({ path, key, found: value, command: row.command!.split("\n")[0]!.slice(0, 600), ts: row.ts, changed: !now || now.hash !== row.hash });
        if (files.length >= limit) break;
      }
    }
    // Other data files, when the number is specific enough to find there:
    // 0.5 is in every config, 0.8812 isn't. Words beside it must be in the key.
    if (!fraction && (significant(written) >= 3 || (labels.length && significant(written) >= 2))) {
      for (const file of scope.data ??= dataFiles(repo)) {
        if (elsewhere.length >= limit) break;
        if (writers.has(file.path)) continue;
        const matches = file.values.filter((v) => sameNumber(written, v.value) && labels.every((w) => v.key.toLowerCase().includes(w) || file.path.toLowerCase().includes(w)));
        if (!matches.length) continue;
        // The key whose name shares most words with the text around the number.
        const named = (v: { key: string }) => (context.words ?? []).filter((w) => `${file.path} ${v.key}`.toLowerCase().includes(w.toLowerCase())).length;
        const hit = matches.reduce((best, v) => named(v) > named(best) ? v : best);
        const next = all.find((r) => Date.parse(r.ts) >= file.mtime && !onlyReads(r.command!));
        const commit = gitOrNull(repo, ["log", "-1", "--format=%h %s", "--", file.path]);
        elsewhere.push({
          path: file.path, key: hit.key, found: hit.value, modified: new Date(file.mtime).toISOString(),
          ...(next && Date.parse(next.ts) - file.mtime < 10 * 60_000 ? { before: { command: next.command!.split("\n")[0]!.slice(0, 600), ts: next.ts } } : {}),
          ...(commit ? { commit: commit.slice(0, 120) } : {}),
          ...(context.words ? { score: named(hit) } : {}),
        });
      }
    }
    const needle = (fraction ?? written).trim();
    const flat = (t: string) => t.replace(/\s+/g, " ").trim();
    const printed: Array<{ line: string; command: string }> = [];
    for (const row of rows) {
      if (context.before !== undefined && Date.parse(row.ts) > context.before + 60_000) break;
      // A command that names the number was looking for it, not making it:
      // a grep through the log printed it back.
      // ANVC's own lookups print numbers back too.
      if (row.command!.includes(needle) || /\bwhence\b|anvc_results|\b(anvc|cli\.ts)\s+check\b/.test(row.command!)) continue;
      const lines = row.output!.split("\n");
      // The words beside the number, in the printed line itself, pick the row.
      const candidates = lines.filter((l) => holds(l) && about(l, row.command!));
      if (!candidates.length) continue;
      const hit = candidates.reduce((best, l) => score(l) > score(best) ? l : best);
      // A whole line printed before by some other command, printed again: a
      // script that read the log back. Only the whole line: a rerun prints the
      // same table, and its first columns often match.
      const body = new Set(lines.map(flat));
      const again = printed.some((p) => p.command !== row.command && /[a-z]{2}/i.test(p.line) && p.line.length >= 12 && body.has(p.line));
      printed.push({ line: flat(hit), command: row.command! });
      const list = again || onlyReads(row.command!) ? reads : outputs;
      if (list.length >= limit) continue;
      const command = row.command!.split("\n")[0]!.slice(0, 600) + (row.command!.includes("\n") ? " …" : "");
      const near = neighbours.length || around.length ? { beside: neighbours.length > 0 && beside(hit), same_run: neighbours.length > 0 && sameRun(lines), score: score(hit) } : {};
      list.push({ ts: row.ts, command, line: hit.trim().slice(0, 200), session: row.session_id ?? "", ...near, ...(list === reads && again ? { again: true } : {}) });
      if (outputs.length >= limit && reads.length >= limit) break;
    }
  }
  return { results: found, files, outputs, reads, elsewhere };
}
