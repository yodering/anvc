/**
 * Which anvc this is, whether a newer one is out, and whether each repository
 * has the hooks this version expects.
 *
 * anvc runs from the folder it was cloned into, and nothing told anyone when
 * that folder fell behind. A `git pull` alone was half an update: hook
 * scripts changed at once, but hooks added since setup ran were never
 * installed, so a repository could miss failure capture or session copies
 * with no sign anything was missing.
 *
 * Updates are never applied by themselves. Code that runs inside every agent
 * session pulling itself is how one bad push reaches everyone at once, so
 * anvc says an update is ready, and `anvc update` or the page's Update button
 * applies it.
 */
import pkg from "../package.json" with { type: "json" };
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { shellWord } from "./args";
import { gitOrNull } from "./git";
import { RELEASES, which } from "./desktop";
import { isRepo, readHead, readJson, samePath, writeJson } from "./rawlog";

/** Where this copy of anvc lives: the folder hooks and the MCP server run from. */
export const HOME = resolve(import.meta.dir, "..");

/**
 * This copy's command line, for commands and hooks that name it: protocol/cli.ts
 * in a clone, and dist/cli.js in the plugin. The plugin's work log and MCP
 * server are bundles of their own, so the one running isn't always the CLI.
 */
export const CLI = [join(HOME, "protocol", "cli.ts"), join(HOME, "dist", "cli.js")].find((p) => existsSync(p)) ?? Bun.main;

/** The setup script, in a clone. A plugin has none: its hooks come with it. */
export const SETUP = join(HOME, "scripts", "setup.ts");

/**
 * The revision of the hook set setup installs. Raised whenever setup adds,
 * removes or changes a hook, so a repository set up before can be told.
 * 4: PostToolUseFailure, SessionEnd, PostCompact and preCompact, stuck detection.
 * 5: ANVC's folder quoted in hook commands; the pre-push hook passes its remote.
 * 6: PreToolUse also on Bash, to give the writing rules for a git commit.
 * 7: PostToolUse also on WebFetch and WebSearch, to keep what they read as sources.
 * 8: SessionEnd, SubagentStart and SubagentStop captured, for Status.
 */
export const HOOKS_REVISION = 8;

/** Where the choices and lists for every project are kept: ~/.anvc. */
export const stateHome = (): string => process.env.ANVC_STATE_HOME ?? join(homedir(), ".anvc");

/** Each agent's own folder, where its settings for every project are kept. */
export const claudeDir = (): string => process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
export const codexDir = (): string => process.env.CODEX_HOME || join(homedir(), ".codex");
export const cursorDir = (): string => join(homedir(), ".cursor");

export function version(): string {
  // A clone has package.json; an installed plugin has only its manifest.
  for (const file of ["package.json", ".claude-plugin/plugin.json"]) {
    try { return (JSON.parse(readFileSync(join(HOME, file), "utf8")) as { version?: string }).version ?? BUILT; }
    catch { /* try the next */ }
  }
  // Compiled into the desktop app there is no file beside the code at all,
  // and this read "0.0.0".
  return BUILT;
}

/** The version this code was built at, carried inside any bundle made of it. */
const BUILT: string = pkg.version;

/**
 * How this copy is kept up to date: a git clone is pulled with `anvc update`;
 * a plugin is updated by the agent's own plugin manager, which anvc leaves to
 * it. Compiled into the desktop app, the code lives on Bun's virtual
 * filesystem, and the app is rebuilt rather than updated in place. That
 * filesystem is /$bunfs on Linux and macOS and somewhere else on Windows, so
 * Bun is asked instead of the path.
 */
export const managedBy = (): "git" | "plugin" | "desktop" =>
  Bun.isStandaloneExecutable ? "desktop" : existsSync(join(HOME, ".git")) ? "git" : "plugin";

/**
 * The `anvc` command. The plugin runs from a folder named for its version,
 * such as ~/.claude/plugins/cache/anvc/anvc/0.4.9, so every command that
 * named it stopped working at the next update. The launcher names no
 * version: it runs the command line written in ~/.anvc/cli, which each
 * session start and each setup point at the copy running them.
 *
 * It goes in ~/.local/bin when that's on the PATH, and otherwise where Bun
 * keeps the commands it installs. Bun's installer puts that folder on the
 * PATH on every system, and ANVC needs Bun, where macOS often has no
 * ~/.local/bin on it. On Windows it is anvc.cmd for cmd.exe and PowerShell,
 * and an sh script beside it for Git Bash, where Claude Code runs commands and
 * a .cmd isn't found by its bare name. ANVC_BIN_DIR moves it, which the tests
 * do.
 */
const LAUNCHER_MARK = "anvc-launcher";
const LAUNCHERS = process.platform === "win32" ? ["anvc.cmd", "anvc"] : ["anvc"];

/** The file that names the command line the launcher runs. */
export const pointerFile = (): string => join(stateHome(), "cli");

/**
 * The folder the launcher goes in: ~/.local/bin if it's on the PATH, else
 * Bun's if it's there and on the PATH. With neither, the launcher still goes
 * in ~/.local/bin, or Bun's folder on Windows, and commands name the command
 * line by its path.
 */
export function binDir(): string {
  const [local, bun] = binDirs();
  if (!bun) return local!;
  const path = new Set((process.env.PATH ?? "").split(delimiter).filter(Boolean).map((d) => samePath(d)));
  if (path.has(samePath(local!))) return local!;
  if (existsSync(bun) && path.has(samePath(bun))) return bun;
  return process.platform === "win32" ? bun : local!;
}

/** The folders the launcher can be in: ~/.local/bin and Bun's, or ANVC_BIN_DIR alone. */
const binDirs = (): string[] => process.env.ANVC_BIN_DIR ? [process.env.ANVC_BIN_DIR]
  : [join(homedir(), ".local", "bin"), join(process.env.BUN_INSTALL || join(homedir(), ".bun"), "bin")];

/** Whether a file is the launcher ANVC wrote, and not another program called anvc. */
const ours = (file: string): boolean => readHead(file, 512)?.includes(LAUNCHER_MARK) ?? false;

function launcherScript(name: string, pointer: string): string {
  const missing = `anvc: the ANVC command line named in ${pointer} isn't there. Start a new agent session, and it's named again.`;
  // cmd.exe reads & | < > ^ in an echo as its own, so each gets a caret.
  return name.endsWith(".cmd")
    ? [`@echo off`, `rem ${LAUNCHER_MARK}: runs the ANVC command line named in the file below, which ANVC keeps current.`, `setlocal`,
      `set /p ANVC_CLI=<"${pointer}"`, `if exist "%ANVC_CLI%" goto run`, `echo ${missing.replace(/[&|<>^]/g, "^$&")} 1>&2`, `exit /b 1`,
      `:run`, `bun "%ANVC_CLI%" %*`, ``].join("\r\n")
    : [`#!/bin/sh`, `# ${LAUNCHER_MARK}: runs the ANVC command line named in the file below, which ANVC keeps current.`,
      `cli=$(cat ${shellWord(pointer)} 2>/dev/null)`, `if [ ! -f "$cli" ]; then`, `  echo ${shellWord(missing)} >&2`, `  exit 1`, `fi`, `exec bun "$cli" "$@"`, ``].join("\n");
}

/**
 * Points the launcher at this copy's command line. Session starts call it, so
 * after an update the launcher runs the new version.
 */
export function notePointer(): void {
  // Compiled into the desktop app, there is no command line to point at.
  if (managedBy() === "desktop") return;
  try {
    const file = pointerFile();
    if (readHead(file, 4096) === CLI) return;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, CLI);
  } catch { /* the launcher runs the copy it ran before */ }
}

/**
 * Puts the launcher in binDir(), and points it at this copy. Setup, `anvc
 * options` and each session start call this. Writing it took 0.5 ms, and a
 * call that finds it current 0.013 ms. An `anvc` on the PATH that ANVC didn't
 * write is left alone, and then no launcher is added. Returns the launcher's
 * path and whether it was written, or would be in a dry run, or null when
 * there is no launcher.
 */
export function installLauncher(dry = false): { file: string; changed: boolean } | null {
  if (managedBy() === "desktop") return null;
  if (!dry) notePointer();
  try {
    const dir = binDir();
    const found = which("anvc");
    if (found && !ours(found)) return null;
    const files = LAUNCHERS.map((name) => ({ file: join(dir, name), script: launcherScript(name, pointerFile()) }));
    if (files.some((f) => existsSync(f.file) && !ours(f.file))) return null;
    const stale = files.filter((f) => !existsSync(f.file) || readFileSync(f.file, "utf8") !== f.script);
    if (stale.length && !dry) {
      mkdirSync(dir, { recursive: true });
      for (const f of stale) writeFileSync(f.file, f.script, { mode: 0o755 });
    }
    return { file: files[0]!.file, changed: stale.length > 0 };
  } catch { return null; }
}

/**
 * Whether `anvc` on the PATH is a launcher ANVC wrote, in either of its
 * folders. It can be in the one binDir() doesn't choose: one written to Bun's
 * folder stays there after ~/.local/bin joins the PATH, and it works the same.
 */
export function launcherOnPath(): boolean {
  const found = which("anvc");
  return found !== null && binDirs().some((d) => samePath(d) === samePath(dirname(found))) && ours(found);
}

/**
 * The command that starts ANVC, for every command shown to a person or an
 * agent: `anvc` while the launcher is on the PATH, else this copy's command
 * line by its path. The desktop app has none of its own, so there the
 * command runs in the clone it was built from.
 */
export const anvcCommand = (): string =>
  launcherOnPath() ? "anvc" : managedBy() === "desktop" ? "bun run anvc" : `bun ${shellWord(CLI)}`;

export interface Install { repo: string; agent: string; hooks: number; ts: string }

/** The repository name an install for every repository is kept under. */
export const GLOBAL = "*";

const installsFile = () => join(stateHome(), "installs.json");

export const installs = (): Install[] => readJson<Install[]>(installsFile(), []);

/** Every entry but this repository's for this agent, and `add`, written back. */
function writeInstalls(repo: string, agent: string, add?: Install): void {
  const same = isRepo(repo);
  const list = installs().filter((i) => !(i.agent === agent && same(i.repo)));
  writeJson(installsFile(), add ? [...list, add] : list);
}

/** Setup calls this, so `anvc update` knows every repository to bring up to date. */
export function noteInstall(repo: string, agent: string): void {
  try { writeInstalls(repo, agent, { repo, agent, hooks: HOOKS_REVISION, ts: new Date().toISOString() }); }
  catch { /* an update will then not know this repository; setup still worked */ }
}

/** Drops a repository's entry, once a global install has taken its hooks' place. */
export function forgetInstall(repo: string, agent: string): void {
  try { writeInstalls(repo, agent); } catch { /* setup still worked */ }
}

/**
 * Whether a repository's hooks for an agent are older than this version
 * expects. A repository with hooks but no entry was set up before entries
 * were kept, which is older than anything that keeps them.
 */
export function hooksBehind(repo: string, agent: string): boolean {
  // Installed for every repository, the global entry is the one that counts.
  // Setup keeps the path it was given, and a hook asks with git's, which on
  // Windows is C:/x where setup kept C:\x.
  const same = isRepo(repo);
  const entry = installs().find((i) => i.agent === agent && same(i.repo))
    ?? installs().find((i) => i.repo === GLOBAL && i.agent === agent);
  return !entry || entry.hooks < HOOKS_REVISION;
}

interface UpdateState {
  checked: string;
  /** Commits the remote has that this folder does not. */
  behind: number;
  /** Their subjects, newest first. */
  changes: string[];
  /** For the plugin, which has no commits to count: the newest released version. */
  latest?: string;
  error?: string;
}

const updateFile = () => join(stateHome(), "update.json");

export function readUpdate(home = HOME): UpdateState | null {
  let state = readJson<UpdateState | null>(updateFile(), null);
  if (!state) return null;
  // The count is saved once a day, so a git pull since left it saying updates
  // were ready that were already here. Counting against the remote branch as
  // last fetched needs no network.
  if (state.behind) {
    const left = Number(gitOrNull(home, ["rev-list", "--count", "HEAD..@{u}"]));
    if (Number.isInteger(left) && left < state.behind) state = { ...state, behind: left, changes: state.changes.slice(0, left) };
  }
  return state;
}

/** The newest version among `git ls-remote --tags` lines, such as "…\trefs/tags/v0.4.4". */
export function newestTag(lsRemote: string): string | null {
  const versions = [...lsRemote.matchAll(/refs\/tags\/v(\d+\.\d+\.\d+)$/gm)].map((m) => m[1]!);
  return versions.sort((a, b) => Bun.semver.order(b, a))[0] ?? null;
}

/**
 * Asks the remote this folder was cloned from whether it has moved on. The
 * plugin has no clone, and Claude Code doesn't update it unasked, so people
 * stayed on the version they installed without knowing; it asks the public
 * repository for its newest release tag instead, which sends nothing of theirs.
 */
export function checkForUpdate(home = HOME): UpdateState {
  const checked = new Date().toISOString();
  if (managedBy() === "plugin") {
    const tags = Bun.spawnSync(["git", "ls-remote", "--tags", "--refs", `https://github.com/${RELEASES}.git`], {
      stdout: "pipe", stderr: "ignore", env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }, windowsHide: true,
    });
    const latest = tags.success ? newestTag(tags.stdout.toString()) : null;
    return save(latest ? { checked, behind: 0, changes: [], latest } : { checked, behind: 0, changes: [], error: "couldn't reach the anvc repository" });
  }
  const upstream = gitOrNull(home, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
  if (!upstream) return save({ checked, behind: 0, changes: [], error: "this copy of anvc has no remote branch to compare with" });
  const [remote] = upstream.split("/");
  const fetched = Bun.spawnSync(["git", "-C", home, "fetch", "--quiet", remote!], {
    stdout: "ignore", stderr: "pipe", env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }, windowsHide: true,
  });
  if (!fetched.success) return save({ checked, behind: 0, changes: [], error: "couldn't reach the anvc repository" });
  const subjects = (gitOrNull(home, ["log", "--format=%s", "HEAD..@{u}"]) ?? "").split("\n").filter(Boolean);
  return save({ checked, behind: subjects.length, changes: subjects.slice(0, 20) });
}

export function save(state: UpdateState): UpdateState {
  try { writeJson(updateFile(), state); } catch { /* checked again next time */ }
  return state;
}

/**
 * Starts a check in the background when the last one is a day old. Hooks call
 * this; they must never wait on the network, so the check runs detached and
 * its answer is read on a later turn.
 */
export function checkDaily(): void {
  if (process.env.ANVC_NO_UPDATE_NOTICE || managedBy() === "desktop") return;
  try {
    const file = updateFile();
    if (existsSync(file) && Date.now() - statSync(file).mtimeMs < 86_400_000) return;
    // Written first, so turns in the next few seconds do not start a second.
    save({ ...(readUpdate() ?? { behind: 0, changes: [] }), checked: new Date().toISOString() });
    // No shell: the folder anvc was cloned into can have any name.
    spawn("bun", [CLI, "update", "--check"], { detached: true, stdio: "ignore", windowsHide: true })
      .on("error", () => { /* no check today */ }).unref();
  } catch { /* no check today */ }
}

/** One plain line about updates, or null when there is nothing to say. */
export function updateLine(state: UpdateState | null): string | null {
  if (state?.latest && Bun.semver.order(state.latest, version()) > 0) {
    return `ANVC ${state.latest} is out, and this is ${version()}. To update, run in a terminal: claude plugin marketplace update anvc && claude plugin update anvc@anvc, then start a new session.`;
  }
  if (!state || !state.behind) return null;
  return `ANVC has ${state.behind} update${state.behind === 1 ? "" : "s"} ready. Run: ${anvcCommand()} update`;
}

/** Where the desktop app says which version it is, each time it starts. */
export const desktopFile = () => join(stateHome(), "desktop.json");

/**
 * What an agent is told at a session start once a newer ANVC is out: to ask
 * the person whether to update, the desktop app included, since nobody
 * remembers to reinstall an app. Once per release for the computer, so four
 * open sessions don't each ask.
 */
export function updateOffer(state: UpdateState | null): { text: string; said: () => void } | null {
  const latest = state?.latest;
  if (!latest) return null;
  const file = join(stateHome(), "update-offer.json");
  if (readJson<{ offered?: string }>(file, {}).offered === latest) return null;
  const desktop = readJson<{ version?: string }>(desktopFile(), {}).version;
  const steps = [
    Bun.semver.order(latest, version()) > 0 ? "`claude plugin marketplace update anvc && claude plugin update anvc@anvc`, after which they start a new session" : null,
    desktop && Bun.semver.order(latest, desktop) > 0 ? `\`${anvcCommand()} desktop install\` for the desktop app, which is ${desktop}` : null,
  ].filter(Boolean);
  if (!steps.length) return null;
  return {
    text: `anvc: ANVC ${latest} is out. Ask the person whether to update, and if they say yes, run ${steps.join(", and ")}.`,
    said: () => { try { writeJson(file, { offered: latest }); } catch { /* asked again next time */ } },
  };
}

/**
 * Pulls a copy of anvc forward. Fast-forward only: a copy with local commits
 * or edits is left alone and says why, rather than merged into.
 */
export function pullUpdate(home = HOME): { changes: string[]; depsChanged: boolean; error?: string } {
  const before = gitOrNull(home, ["rev-parse", "HEAD"]) ?? "";
  const lock = () => gitOrNull(home, ["rev-parse", "HEAD:bun.lock"]) ?? "";
  const lockBefore = lock();
  const pull = Bun.spawnSync(["git", "-C", home, "pull", "--ff-only", "--quiet"], {
    stdout: "pipe", stderr: "pipe", env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }, windowsHide: true,
  });
  if (!pull.success) return { changes: [], depsChanged: false, error: pull.stderr.toString().trim().split("\n").at(-1) ?? "pull failed" };
  const after = gitOrNull(home, ["rev-parse", "HEAD"]) ?? "";
  const changes = before === after ? [] : (gitOrNull(home, ["log", "--format=%s", `${before}..${after}`]) ?? "").split("\n").filter(Boolean);
  return { changes, depsChanged: lock() !== lockBefore };
}

/**
 * Updates the Claude Code plugin with Claude Code's own commands: refresh the
 * marketplace, then install what it lists now. Null when the plugin isn't
 * installed or Claude Code isn't found.
 */
export function updatePlugin(): { from: string; to: string } | { error: string } | null {
  // Started from a desktop launcher, PATH can miss where Claude Code installs itself.
  const bin = Bun.which("claude", { PATH: `${process.env.PATH ?? ""}${delimiter}${join(homedir(), ".local", "bin")}` });
  if (!bin) return null;
  const claude = (...args: string[]) => Bun.spawnSync([bin, "plugin", ...args], { stdout: "pipe", stderr: "pipe", windowsHide: true });
  const installed = (): string | null => {
    try {
      const list = JSON.parse(claude("list", "--json").stdout.toString()) as { installed?: Array<{ id: string; version: string }> };
      return list.installed?.find((p) => p.id === "anvc@anvc")?.version ?? null;
    } catch { return null; }
  };
  const from = installed();
  if (!from) return null;
  for (const args of [["marketplace", "update", "anvc"], ["update", "anvc@anvc"]]) {
    const run = claude(...args);
    if (!run.success) return { error: run.stderr.toString().trim().split("\n").at(-1) || `claude plugin ${args.join(" ")} failed` };
  }
  return { from, to: installed() ?? from };
}

/**
 * Brings ANVC up to date wherever it's installed here: the clone this runs
 * from, pulled and set up again wherever it was set up, and the Claude Code
 * plugin. `anvc update` and the page's Update button both run this.
 */
export function update(): { ok: boolean; changed: boolean; lines: string[] } {
  const lines: string[] = [];
  let changed = false;
  if (managedBy() === "git") {
    const { changes, depsChanged, error } = pullUpdate();
    if (error) return { ok: false, changed, lines: [`Couldn't update ${HOME}:`, `  ${error}`, "If you changed files there, commit or stash them first."] };
    changed = changes.length > 0;
    lines.push(changed
      ? `Updated to ${version()} with ${changes.length} change${changes.length === 1 ? "" : "s"}:\n${changes.slice(0, 15).map((c) => `  ${c}`).join("\n")}`
      : `anvc ${version()} is already up to date.`);
    if (depsChanged) {
      lines.push("Dependencies changed; installed them.");
      Bun.spawnSync(["bun", "install"], { cwd: HOME, stdout: "ignore", stderr: "ignore", windowsHide: true });
    }
    // Set up again wherever it was set up, so hooks added since are there.
    const places = installs().filter((i) => i.repo === GLOBAL || existsSync(i.repo));
    for (const i of places) {
      const run = Bun.spawnSync(["bun", SETUP,
        ...(i.repo === GLOBAL ? ["--global"] : ["--repo", i.repo, "--no-instructions"]), "--agent", i.agent], { stdout: "pipe", stderr: "pipe", windowsHide: true });
      lines.push(`${run.success ? "✓" : "✗"} ${i.repo === GLOBAL ? "every repository" : i.repo} (${i.agent})`);
    }
    if (!places.length) lines.push("No repositories are recorded as set up yet; run setup in each one to bring its hooks up to date.");
    save({ checked: new Date().toISOString(), behind: 0, changes: [] });
  }
  const plugin = updatePlugin();
  if (plugin && "error" in plugin) return { ok: false, changed, lines: [...lines, `Couldn't update the Claude Code plugin: ${plugin.error}`] };
  if (plugin) {
    changed ||= plugin.to !== plugin.from;
    lines.push(plugin.to !== plugin.from ? `Updated the Claude Code plugin from ${plugin.from} to ${plugin.to}.` : `The Claude Code plugin is up to date (${plugin.from}).`);
  }
  if (!lines.length) lines.push("The ANVC plugin isn't installed in Claude Code, so there's nothing here to update.");
  if (changed) lines.push("Restart your agents so they use the new version.");
  return { ok: true, changed, lines };
}
