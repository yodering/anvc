/**
 * The files a command wrote and read, from what the command itself says.
 *
 * Watching the tree for changed files would blame a command for everything
 * written around it: an analysis that reads results/v6.json five minutes after
 * the run that wrote it would look like its author. So outputs are only what
 * a command names as one (a redirect, tee, or the value of a flag like --out,
 * --output-dir or -o) and inputs are the other existing files and folders it
 * names. Each is fingerprinted (protocol/results.ts), so a later reader can
 * tell whether it is still the file it was.
 *
 * A command that changes directory first is skipped for relative paths, as in
 * ingest: after a cd, this log doesn't know what they're relative to.
 */
import { existsSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { fingerprint } from "./results";
import { shellPaths } from "./shell-paths";
import { inRepo } from "./rawlog";

interface RunFile { path: string; hash: string; bytes: number }

/** Flags whose value is where a command writes. */
const OUTPUT_FLAGS = /^(-o|--out|--output|--outfile|--out-file|--output-file|--out-dir|--outdir|--output-dir|--output_dir|--save|--save-to|--save-dir|--save_dir|--dest|--results|--results-dir|--log-dir|--logdir|--run-dir|--checkpoint-dir)$/;

/** Words split the way a shell would, quotes kept together, operators on their own. */
export function words(command: string): string[] {
  return command.match(/"(?:\\.|[^"])*"|'[^']*'|&&|\|\||[;|<>]|[^\s;|<>]+/g)?.map((w) => w.replace(/^(["'])(.*)\1$/, "$2")) ?? [];
}

/**
 * Settings a command was run with: its --name value and --name=value flags.
 * What changed between v4 and v6 is usually one of these.
 */
export function flags(command: string): Record<string, string> {
  const out: Record<string, string> = {};
  const w = words(command);
  for (let i = 0; i < w.length && Object.keys(out).length < 30; i++) {
    const m = /^--([A-Za-z][\w.-]*)(?:=(.+))?$/.exec(w[i]!);
    if (!m) continue;
    const next = w[i + 1];
    if (m[2] !== undefined) out[m[1]!] = m[2].slice(0, 200);
    else if (next !== undefined && !next.startsWith("-") && !/^(&&|\|\||[;|<>])$/.test(next)) { out[m[1]!] = next.slice(0, 200); i++; }
    else out[m[1]!] = "true";
  }
  return out;
}

/** Programs whose output is what some file already said: a number they print was made elsewhere. */
const READERS = new Set(["cat", "bat", "head", "tail", "less", "more", "grep", "egrep", "fgrep", "rg", "ugrep", "ug", "ag", "ack", "ls", "tree", "find", "fd", "wc", "sed", "echo", "printf", "sort", "uniq", "cut", "tr", "column", "diff", "cmp", "jq", "yq", "file", "stat", "du", "df", "git", "gh", "curl", "wget"]);
/** Shell words after which the next word is the program. */
const KEYWORDS = new Set(["until", "while", "do", "then", "else", "elif", "if", "!", "{", "("]);
/** Programs that print nothing a result could come from, and wrappers around the real program. */
const QUIET = new Set(["cd", "pushd", "popd", "sleep", "done", "fi", "for", "[", "[[", "test", "true", "false", "export", "set", "mkdir", "rm", "cp", "mv", "touch", "pgrep", "pkill", "kill", "wait", "exit", "}", ")"]);
const PREFIXES = new Set(["sudo", "time", "env", "nice", "command", "exec", "xargs"]);

/**
 * Whether a command only reads: every program it runs is a reader like cat,
 * grep or git. What such a command prints was already in a file, so it
 * isn't where a number came from.
 */
export function onlyReads(command: string, readers: Set<string> = READERS): boolean {
  let read = false;
  for (const line of command.split("\n")) {
    let start = true;
    for (const w of words(line)) {
      if (/^(&&|\|\||[;|&])$/.test(w)) { start = true; continue; }
      if (!start || /^\w+=/.test(w) || PREFIXES.has(w) || KEYWORDS.has(w)) continue;
      start = false;
      const program = w.split("/").at(-1)!;
      if (QUIET.has(program)) continue;
      if (!readers.has(program)) return false;
      read = true;
    }
  }
  return read;
}

/** Programs that look for something: when one fails, it found nothing, or was asked wrongly. */
const LOOKUPS = new Set(["cat", "bat", "head", "tail", "less", "grep", "egrep", "fgrep", "rg", "ugrep", "ug", "ag", "ack", "ls", "tree", "find", "fd", "wc", "stat", "file", "which", "type", "du", "jq", "yq", "sort", "uniq", "cut", "column"]);

/**
 * Whether a command only looks for something, as grep and ls do. Its failure
 * is a search that found nothing or a mistyped pattern, which a new session
 * gained nothing from hearing about.
 */
export const onlyLooks = (command: string): boolean => onlyReads(command, LOOKUPS);

/**
 * The step of a compound command that did the work: in "wc -l a.jsonl; tail
 * a.log; python3 analyze.py a.jsonl", the analysis. The whole command when no
 * step stands out.
 */
export function mainStep(command: string): string {
  const steps = command.split(/\s*(?:&&|\|\||;|\||\n)\s*/).map((s) => s.trim()).filter(Boolean);
  for (const step of steps) {
    const first = words(step).find((w) => !/^\w+=/.test(w) && !PREFIXES.has(w) && !KEYWORDS.has(w));
    const program = first?.split("/").at(-1);
    if (program && !READERS.has(program) && !QUIET.has(program)) return step;
  }
  return command;
}

/** What a command wrote and read inside the repository, fingerprinted. At most twenty of each. */
export function runFiles(command: string, cwd: string, repo: string): { outputs: RunFile[]; inputs: RunFile[] } {
  const moved = /(^|[;&|]\s*)cd\s/.test(command);
  const toRepo = inRepo(repo);
  const place = (p: string): string | null => {
    if (!p || p.startsWith("-") || /[*?$`]/.test(p) || /^\d+$/.test(p)) return null;
    if (moved && !isAbsolute(p)) return null;
    return toRepo(resolve(cwd, p));
  };
  const outputs = new Set<string>();
  const inputs = new Set<string>();
  for (const { path, kind } of shellPaths(command)) {
    const rel = place(path);
    if (rel) (kind === "write" ? outputs : inputs).add(rel);
  }
  const w = words(command);
  for (let i = 0; i < w.length; i++) {
    const [flag, inline] = w[i]!.split(/=(.*)/s, 2) as [string, string | undefined];
    if (OUTPUT_FLAGS.test(flag)) {
      const rel = place(inline ?? w[i + 1] ?? "");
      if (rel) outputs.add(rel);
      if (inline === undefined) i++;
      continue;
    }
    // Anything else that names an existing file or folder in the repository
    // is something the command read.
    const value = inline ?? w[i]!;
    if (!/[./]/.test(value)) continue;
    const rel = place(value);
    if (rel && !outputs.has(rel)) inputs.add(rel);
  }
  // Folders count as outputs only: a run's output directory is worth a
  // fingerprint, and walking every folder a command names (ls src/, grep -r)
  // would cost every command.
  const print = (rel: string, folders: boolean): RunFile | null => {
    const abs = resolve(repo, rel);
    if (rel === "." || rel.startsWith(".git") || !existsSync(abs)) return null;
    try { if (!folders && statSync(abs).isDirectory()) return null; } catch { return null; }
    const f = fingerprint(abs);
    return f ? { path: rel, hash: f.hash, bytes: f.bytes } : null;
  };
  const out = [...outputs].slice(0, 20).map((p) => print(p, true)).filter((f): f is RunFile => f !== null);
  const written = new Set(out.map((f) => f.path));
  const inp = [...inputs].filter((p) => !written.has(p)).slice(0, 20).map((p) => print(p, false)).filter((f): f is RunFile => f !== null);
  return { outputs: out, inputs: inp };
}
