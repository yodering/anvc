/**
 * The anvc command: setup puts a launcher on the PATH, and it runs whichever
 * copy of ANVC a session start or setup named last, so an update doesn't
 * leave commands naming a version that's gone.
 */
import { expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { delimiter, join, resolve } from "node:path";
import { shellWord } from "../protocol/args";
import { anvcCommand, CLI, installLauncher, launcherOnPath, pointerFile } from "../protocol/version";
import { gitRepo, runHook, setEnv, tmp } from "./helpers";

const WINDOWS = process.platform === "win32";
const NAME = WINDOWS ? "anvc.cmd" : "anvc";
const VERSION = resolve(import.meta.dir, "../protocol/version.ts");

/** A bin folder and a state folder of the test's own, with the bin folder first on the PATH. */
function place(onPath = true) {
  const bin = tmp("anvc-bin-");
  const state = tmp("anvc-state-home-");
  setEnv({ ANVC_BIN_DIR: bin, ANVC_STATE_HOME: state, PATH: onPath ? `${bin}${delimiter}${process.env.PATH}` : process.env.PATH });
  return { bin, state };
}

/** Runs the launcher the way a terminal does. */
const launch = (file: string, ...args: string[]) => {
  const p = Bun.spawnSync(WINDOWS ? ["cmd", "/c", file, ...args] : [file, ...args], { stdout: "pipe", stderr: "pipe" });
  return { code: p.exitCode, out: `${p.stdout}${p.stderr}` };
};

test("setup puts the anvc command on the PATH, and commands are printed with it from then on", () => {
  const { bin } = place();
  expect(launcherOnPath()).toBe(false);
  expect(anvcCommand()).toBe(`bun ${shellWord(CLI)}`);

  expect(installLauncher()).toEqual({ file: join(bin, NAME), changed: true });
  expect(readFileSync(pointerFile(), "utf8")).toBe(CLI);
  expect(launcherOnPath()).toBe(true);
  expect(anvcCommand()).toBe("anvc");
  // Running it again changes nothing.
  expect(installLauncher()).toEqual({ file: join(bin, NAME), changed: false });

  const run = launch(join(bin, NAME), "help");
  expect(run.code).toBe(0);
  expect(run.out).toContain("checkpoint records");
  // On the PATH, the help names no path.
  expect(run.out).not.toContain("isn't on your PATH");
}, 30_000);

test("the launcher runs the copy a session start named last, and says so when that copy is gone", () => {
  const { bin, state } = place();
  installLauncher();
  // An update: the next version's session start names its own command line.
  const next = join(tmp("anvc-next-"), "cli.js");
  writeFileSync(next, `console.log("the next version", process.argv.slice(2).join(" "));\n`);
  writeFileSync(pointerFile(), next);
  expect(launch(join(bin, NAME), "folders").out).toContain("the next version folders");

  // A session start of this copy names this one again.
  runHook("inject", "SessionStart", { hook_event_name: "SessionStart", session_id: "s1", cwd: gitRepo(), source: "startup" }, { ANVC_STATE_HOME: state });
  expect(readFileSync(pointerFile(), "utf8")).toBe(CLI);

  writeFileSync(pointerFile(), join(bin, "gone.js"));
  const gone = launch(join(bin, NAME), "folders");
  expect(gone.code).toBe(1);
  expect(gone.out).toContain("isn't there. Start a new agent session");
}, 30_000);

test("a session start adds the launcher when it's missing, and leaves someone else's in its place", () => {
  const { bin, state } = place();
  const start = () => runHook("inject", "SessionStart", { hook_event_name: "SessionStart", session_id: "s1", cwd: gitRepo(), source: "startup" }, { ANVC_STATE_HOME: state });
  start();
  expect(readFileSync(join(bin, NAME), "utf8")).toContain("anvc-launcher");
  expect(readFileSync(pointerFile(), "utf8")).toBe(CLI);

  writeFileSync(join(bin, NAME), "theirs\n");
  start();
  expect(readFileSync(join(bin, NAME), "utf8")).toBe("theirs\n");
}, 30_000);

test("an anvc that ANVC didn't write is left alone", () => {
  // Someone else's anvc earlier on the PATH: no launcher, and the full command.
  const theirs = tmp("anvc-theirs-");
  const { bin } = place();
  setEnv({ PATH: `${theirs}${delimiter}${process.env.PATH}` });
  const foreign = join(theirs, NAME);
  writeFileSync(foreign, WINDOWS ? "@echo theirs\r\n" : "#!/bin/sh\necho theirs\n");
  chmodSync(foreign, 0o755);
  expect(installLauncher()).toBeNull();
  expect(existsSync(join(bin, NAME))).toBe(false);
  expect(anvcCommand()).toBe(`bun ${shellWord(CLI)}`);

  // And a file of that name already in the launcher's folder.
  const other = place(false);
  writeFileSync(join(other.bin, NAME), "theirs\n");
  expect(installLauncher()).toBeNull();
  expect(readFileSync(join(other.bin, NAME), "utf8")).toBe("theirs\n");
});

test("off the PATH, the launcher is still written, and commands keep naming the command line by its path", () => {
  const { bin } = place(false);
  expect(installLauncher()?.file).toBe(join(bin, NAME));
  expect(launcherOnPath()).toBe(false);
  expect(anvcCommand()).toBe(`bun ${shellWord(CLI)}`);
});

test("the launcher goes in ~/.local/bin on the PATH, else in Bun's folder on the PATH", () => {
  const home = tmp("anvc-bin-home-");
  const local = join(home, ".local", "bin");
  const bun = join(home, ".bun", "bin");
  mkdirSync(bun, { recursive: true });
  // Bun reads the home folder once, as it starts.
  const { ANVC_BIN_DIR: _bin, BUN_INSTALL: _bun, ...env } = process.env;
  const at = (code: string, ...dirs: string[]) => Bun.spawnSync([process.execPath, "-e",
    `import { binDir, installLauncher, launcherOnPath } from ${JSON.stringify(VERSION)}; process.stdout.write(String(${code}));`], {
    env: { ...env, HOME: home, USERPROFILE: home, PATH: dirs.join(delimiter) }, stdout: "pipe", stderr: "pipe",
  }).stdout.toString();
  expect(at("binDir()", bun, local)).toBe(local);
  // macOS often has Bun's folder on the PATH and no ~/.local/bin.
  expect(at("binDir()", bun)).toBe(bun);
  expect(at("binDir()")).toBe(WINDOWS ? bun : local);
  // One put in Bun's folder still counts once ~/.local/bin joins the PATH.
  expect(at("installLauncher()?.file", bun)).toBe(join(bun, NAME));
  expect(at("[binDir(), launcherOnPath()]", bun, local)).toBe(`${local},true`);
  rmSync(bun, { recursive: true });
  expect(at("binDir()", bun)).toBe(WINDOWS ? bun : local);
});

test.if(WINDOWS)("on Windows, Git Bash, where Claude Code runs commands, finds the anvc command too", () => {
  const { bin } = place();
  const bash = join(process.env.ProgramFiles ?? "C:\\Program Files", "Git", "bin", "bash.exe");
  const run = () => { const p = Bun.spawnSync([bash, "-c", "anvc help"], { stdout: "pipe", stderr: "pipe" }); return `${p.stdout}${p.stderr}`; };
  installLauncher();
  // anvc.cmd alone isn't found there.
  rmSync(join(bin, "anvc"));
  expect(run()).toContain("command not found");
  installLauncher();
  expect(readFileSync(join(bin, "anvc"), "utf8")).toStartWith("#!/bin/sh");
  expect(run()).toContain("checkpoint records");
}, 30_000);
