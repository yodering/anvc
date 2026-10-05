/**
 * Knowing a newer anvc is out, pulling it, and which repositories need their
 * hooks brought up to date.
 */
import { expect, test } from "bun:test";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { anvcCommand, checkForUpdate, desktopFile, hooksBehind, HOOKS_REVISION, installs, newestTag, noteInstall, pullUpdate, readUpdate, updateLine, updateOffer, updatePlugin, version } from "../protocol/version";
import { writeJson } from "../protocol/rawlog";
import { git, setEnv, tmp } from "./helpers";

const ROOT = resolve(import.meta.dir, "..");

async function upstream() {
  const root = tmp("anvc-version-");
  const origin = join(root, "origin.git"), work = join(root, "work"), copy = join(root, "copy");
  git(root, "init", "-q", "--bare", "-b", "main", origin);
  git(root, "clone", "-q", origin, work);
  git(work, "checkout", "-q", "-b", "main");
  await writeFile(join(work, "package.json"), JSON.stringify({ version: "0.1.0" }));
  git(work, "add", "."); git(work, "commit", "-q", "-m", "First"); git(work, "push", "-q", "origin", "main");
  git(root, "clone", "-q", origin, copy);
  const release = async (subject: string) => {
    await writeFile(join(work, `${subject}.txt`), subject);
    git(work, "add", "."); git(work, "commit", "-q", "-m", subject); git(work, "push", "-q", "origin", "main");
  };
  return { copy, release };
}

test("a copy that fell behind says how far, and pulling brings it level", async () => {
  const { copy, release } = await upstream();
  expect(checkForUpdate(copy)).toMatchObject({ behind: 0 });
  await release("Show why under every attempt");
  await release("Read a Codex command's exit code");
  const state = checkForUpdate(copy);
  expect(state.behind).toBe(2);
  expect(state.changes).toEqual(["Read a Codex command's exit code", "Show why under every attempt"]);
  expect(updateLine(state)).toBe(`ANVC has 2 updates ready. Run: ${anvcCommand()} update`);
  const pulled = pullUpdate(copy);
  expect(pulled.changes).toHaveLength(2);
  expect(checkForUpdate(copy).behind).toBe(0);
});

test("a git pull since the last check brings the saved count level", async () => {
  const { copy, release } = await upstream();
  await release("Show why under every attempt");
  await release("Read a Codex command's exit code");
  expect(checkForUpdate(copy).behind).toBe(2);
  git(copy, "merge", "-q", "--ff-only", "@{u}~1");
  expect(readUpdate(copy)).toMatchObject({ behind: 1, changes: ["Read a Codex command's exit code"] });
  git(copy, "merge", "-q", "--ff-only", "@{u}");
  expect(updateLine(readUpdate(copy))).toBeNull();
});

test("compiled into the desktop app, it knows it is, whatever the system", async () => {
  const dir = tmp("anvc-compiled-");
  const entry = join(dir, "probe.ts"), out = join(dir, "probe");
  await writeFile(entry, `import { managedBy } from ${JSON.stringify(join(ROOT, "protocol", "version.ts"))};\nconsole.log(managedBy());\n`);
  const built = Bun.spawnSync(["bun", "build", "--compile", entry, "--outfile", out], { stdout: "pipe", stderr: "pipe" });
  expect(built.exitCode, built.stderr.toString()).toBe(0);
  // bun build adds the .exe on Windows, which is the name Tauri looks for.
  const ran = Bun.spawnSync([process.platform === "win32" ? `${out}.exe` : out], { stdout: "pipe", stderr: "pipe" });
  expect(ran.stdout.toString().trim()).toBe("desktop");
}, 60_000);

test("a repository set up by an older version is told its hooks are behind", () => {
  expect(hooksBehind("/never/set/up", "claude-code")).toBe(true);
  noteInstall("/some/repo", "codex");
  expect(installs().find((i) => i.repo === "/some/repo")?.hooks).toBe(HOOKS_REVISION);
  expect(hooksBehind("/some/repo", "codex")).toBe(false);
});

// Skipped on Windows: a Windows file name can't hold a quote.
test.skipIf(process.platform === "win32")("the daily check starts without a shell, whatever the folder anvc is in is called", async () => {
  const dir = tmp("anvc-daily-");
  // A name a shell would run part of.
  const home = join(dir, 'anvc"$(touch ran)"');
  mkdirSync(join(home, "protocol"), { recursive: true });
  mkdirSync(join(home, ".git"));
  for (const file of ["version.ts", "args.ts", "git.ts", "rawlog.ts", "desktop.ts"]) copyFileSync(join(ROOT, "protocol", file), join(home, "protocol", file));
  copyFileSync(join(ROOT, "package.json"), join(home, "package.json"));
  const env: Record<string, string | undefined> = { ...process.env, ANVC_STATE_HOME: join(dir, "state") };
  delete env.ANVC_NO_UPDATE_NOTICE;
  Bun.spawnSync(["bun", "-e", `import { checkDaily } from ${JSON.stringify(join(home, "protocol", "version.ts"))}; checkDaily();`], { cwd: dir, env });
  expect(existsSync(join(dir, "state", "update.json"))).toBe(true);
  // The check runs in the background, where a shell would have run the name by now.
  await Bun.sleep(1000);
  expect(existsSync(join(dir, "ran"))).toBe(false);
});

// Skipped on Windows: the stand-in for Claude Code is a sh script.
test.skipIf(process.platform === "win32")("the plugin is updated through Claude Code's own commands", async () => {
  const bin = tmp("anvc-claude-");
  const calls = join(bin, "calls");
  // A stand-in for Claude Code, whose plugin goes from 0.1.0 to 0.2.0 when updated.
  await writeFile(join(bin, "claude"), `#!/bin/sh
echo "$*" >> "${calls}"
case "$*" in
  "plugin list --json") v=0.1.0; [ -f "${bin}/updated" ] && v=0.2.0; echo '{"installed":[{"id":"anvc@anvc","version":"'$v'"}]}' ;;
  "plugin update anvc@anvc") touch "${bin}/updated" ;;
esac
`, { mode: 0o755 });
  setEnv({ PATH: `${bin}:${process.env.PATH}` });
  expect(updatePlugin()).toEqual({ from: "0.1.0", to: "0.2.0" });
  expect(readFileSync(calls, "utf8").trim().split("\n"))
    .toEqual(["plugin list --json", "plugin marketplace update anvc", "plugin update anvc@anvc", "plugin list --json"]);
});

test("the plugin is told when a newer release is out, and not when it's on it", () => {
  // What git ls-remote --tags --refs prints: hashes, then the tags, in any order.
  const listed = ["v0.3.3", "v0.4.10", "v0.4.4", "v0.4.9", "latest"].map((t, i) => `${String(i).repeat(40)}\trefs/tags/${t}`).join("\n");
  expect(newestTag(listed)).toBe("0.4.10");
  expect(newestTag("")).toBeNull();
  const state = (latest: string) => ({ checked: new Date().toISOString(), behind: 0, changes: [], latest });
  expect(updateLine(state("99.0.0"))).toBe(`ANVC 99.0.0 is out, and this is ${version()}. To update, run in a terminal: claude plugin marketplace update anvc && claude plugin update anvc@anvc, then start a new session.`);
  expect(updateLine(state(version()))).toBeNull();
  expect(updateLine(state("0.0.1"))).toBeNull();
});

test("a newer release is offered to the agent once per computer, the desktop app with it when it's behind", () => {
  setEnv({ ANVC_STATE_HOME: tmp("anvc-offer-") });
  const out = (latest: string) => ({ checked: "", behind: 0, changes: [], latest });
  expect(updateOffer(out(version()))).toBeNull();
  writeJson(desktopFile(), { version: "0.1.0" });
  const offer = updateOffer(out("99.0.0"))!;
  expect(offer.text).toStartWith("anvc: ANVC 99.0.0 is out. Ask the person whether to update, and if they say yes, run `claude plugin marketplace update anvc && claude plugin update anvc@anvc`");
  expect(offer.text).toContain("desktop install` for the desktop app, which is 0.1.0.");
  offer.said();
  expect(updateOffer(out("99.0.0"))).toBeNull();
  expect(updateOffer(out("99.0.1"))).not.toBeNull();
});
