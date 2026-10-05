/**
 * `anvc options`: every setting, with a command that sets each choice. An
 * agent runs those commands for the person, so each one has to exist, and
 * letting the agent do it must not send anything anywhere before it asks.
 */
import { expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { delimiter, join, resolve } from "node:path";
import { compactOptions, options, setupEverywhere, type CompactOptions, type CompactSetting } from "../protocol/options";
import { anvcCommand } from "../protocol/version";
import { transcriptDir } from "../protocol/backfill";
import { samePath } from "../protocol/rawlog";
import { git, gitRepo, tmp } from "./helpers";

const ROOT = resolve(import.meta.dir, "..");

/**
 * A project with a remote and an AGENTS.md, and a HOME of its own so nothing
 * reaches the real config. With `launcher`, the anvc command is on its PATH.
 */
function fixture(launcher = false) {
  const repo = gitRepo({ commit: true });
  git(repo, "remote", "add", "origin", "git@github.com:x/y.git");
  writeFileSync(join(repo, "AGENTS.md"), "# Instructions\n");
  const home = tmp("anvc-options-home-");
  const bin = join(home, "bin");
  const env = {
    ...process.env, HOME: home, CLAUDE_CONFIG_DIR: join(home, ".claude"), CODEX_HOME: join(home, ".codex"), ANVC_STATE_HOME: join(home, ".anvc"),
    ANVC_BIN_DIR: bin, ...(launcher ? { PATH: `${bin}${delimiter}${process.env.PATH}` } : {}),
  };
  // Run from outside the project, so every command has to name it.
  const sh = (command: string) => Bun.spawnSync(["sh", "-c", command], { cwd: home, env, stdout: "pipe", stderr: "pipe" });
  const read = (): CompactOptions => {
    const p = Bun.spawnSync(["bun", join(ROOT, "protocol/cli.ts"), "options", "--json", "--repo", repo], { cwd: home, env, stdout: "pipe", stderr: "pipe" });
    expect(p.exitCode).toBe(0);
    return JSON.parse(p.stdout.toString());
  };
  return { repo, home, env, sh, read };
}

// Skipped on Windows: these run the printed commands through sh.
const posix = test.skipIf(process.platform === "win32");

const values = (s: CompactSetting): string[] => (Array.isArray(s.choices) ? s.choices : Object.keys(s.choices));

/** The command that sets a choice, here or with --everywhere, as an agent fills in the setting's command. */
function command(s: CompactSetting, value: string, everywhere = false): string | null {
  if (typeof s.set !== "string") return everywhere ? null : s.set[value] ?? null;
  if (everywhere && !s.set.endsWith(" [--everywhere]")) return null;
  return s.set.replace(" [--everywhere]", everywhere ? " --everywhere" : "").replace("<value>", value);
}

test("anvc options lists every setting with its choices, the recommended one and a command that sets it", () => {
  const { read } = fixture();
  const o = read();
  expect(o.about).toContain('Ask the person before changing one with "asks": true.');
  expect(o.earlier).toBe(0);
  expect(o.settings.map((s) => s.key)).toEqual(["agents", "where", "folder", "assist", "results", "absorb", "sharing", "local", "push", "prepush", "instructions", "approvegoals"]);
  // Whatever can send records off this computer or change a committed file is marked, and says what it does.
  expect(o.settings.filter((s) => s.asks).map((s) => s.key)).toEqual(["absorb", "sharing", "local", "push", "prepush", "instructions"]);
  for (const s of o.settings) {
    expect(s.name, s.key).toBeTruthy();
    expect(Boolean(s.what), s.key).toBe(Boolean(s.asks));
    expect(values(s).length, s.key).toBeGreaterThanOrEqual(2);
    for (const r of [s.recommended].flat()) expect(values(s), s.key).toContain(r);
    expect(values(s).every((v) => command(s, v)), s.key).toBe(true);
  }
  expect(o.settings.find((s) => s.key === "assist")).toMatchObject({ choices: { auto: "Automatic" }, parts: { briefing: "on" } });
  expect(o.settings.find((s) => s.key === "assist")!.setPart).toMatch(/ assist set <part> <value> --repo \S+ \[--everywhere\]$/);
});

test("anvc options --json is a fraction of the full list", () => {
  const { repo } = fixture();
  const full = options(repo, repo);
  const compact = JSON.stringify(compactOptions(full, anvcCommand(), 0));
  // Measured in a project set up with the plugin: 24,070 characters before, 3,156 after.
  expect(compact.length).toBeLessThan(JSON.stringify(full, null, 2).length / 4);
  // No command line is repeated for every choice.
  expect(compact.split(anvcCommand()).length - 1).toBeLessThanOrEqual(full.settings.length + 2);
});

posix("with the anvc command on the PATH, every command options gives starts with it, and works", () => {
  const { sh, read } = fixture(true);
  const o = read();
  expect(o.cli).toBe("anvc");
  const assist = o.settings.find((s) => s.key === "assist")!;
  expect(assist.set).toStartWith("anvc assist <value>");
  expect(sh(command(assist, "start")!).exitCode).toBe(0);
  expect(read().settings.find((s) => s.key === "assist")!.here).toBe("start");
}, 60_000);

posix("every command anvc options gives runs", () => {
  const { repo, sh, read } = fixture();
  const parts = new Map(options(repo, repo).settings.flatMap((s) => s.parts ?? []).map((p) => [p.key, p.choices.map((c) => c.value)]));
  const commands = [...new Set(read().settings.flatMap((s) => [
    ...values(s).flatMap((v) => [command(s, v), command(s, v, true)]),
    ...Object.keys(s.parts ?? {}).flatMap((part) => parts.get(part)!.flatMap((v) => [false, true].map((everywhere) =>
      s.setPart && (!everywhere || s.setPart.endsWith(" [--everywhere]"))
        ? s.setPart.replace(" [--everywhere]", everywhere ? " --everywhere" : "").replace("<part>", part).replace("<value>", v) : null))),
  ]).filter((c): c is string => Boolean(c)))];
  expect(commands.length).toBeGreaterThan(20);
  const failed = commands.flatMap((command) => {
    const p = sh(command);
    const out = `${p.stdout}${p.stderr}`;
    return p.exitCode === 0 && !/usage:|anvc — checkpoint records/.test(out) ? [] : [`${command}\n${out}`];
  });
  expect(failed).toEqual([]);
  // Each switch's off runs after its on.
  const now = Object.fromEntries(read().settings.map((s) => [s.key, s.here]));
  expect(now).toMatchObject({ where: "everywhere", push: "off", prepush: "off", instructions: "off" });
}, 120_000);

posix("git push, the push check and the AGENTS.md lines turn off again, leaving things as they were", () => {
  const { repo, env, sh, read } = fixture();
  const hooks = join(repo, ".git/hooks");
  mkdirSync(hooks, { recursive: true });
  // A pre-push hook of the person's own, which the check wraps and gives back.
  writeFileSync(join(hooks, "pre-push"), "#!/bin/sh\nexit 0\n");
  const config = () => git(repo, "config", "--get-regexp", "^remote\\.origin\\.");
  const before = { config: config(), hook: readFileSync(join(hooks, "pre-push"), "utf8"), agents: readFileSync(join(repo, "AGENTS.md"), "utf8") };

  const text = Bun.spawnSync(["bun", join(ROOT, "protocol/cli.ts"), "options", "--repo", repo], { cwd: repo, env, stdout: "pipe" }).stdout.toString();
  expect(text).toContain("Off: bun");
  expect(text).toContain("init --off");
  expect(text).toMatch(/Change: bun \S+ push-check <on\|off>/);
  expect(text).toMatch(/Change: bun \S+ instructions <on\|off>/);

  const setting = (key: string) => read().settings.find((s) => s.key === key)!;
  const run = (key: string, value: string) => {
    const line = command(setting(key), value)!;
    expect(sh(line).exitCode, line).toBe(0);
    return setting(key);
  };
  for (const key of ["push", "prepush", "instructions"]) {
    expect(run(key, "on"), key).toMatchObject({ here: "on", chosen: true });
    expect(run(key, "off"), key).toMatchObject({ here: "off", chosen: false });
  }
  expect(config()).toBe(before.config);
  expect(readFileSync(join(hooks, "pre-push"), "utf8")).toBe(before.hook);
  expect(existsSync(join(hooks, "pre-push.before-anvc"))).toBe(false);
  expect(readFileSync(join(repo, "AGENTS.md"), "utf8")).toBe(before.agents);
}, 60_000);

posix("chosen tells a default from a choice", () => {
  const { sh, read } = fixture();
  const chosen = () => read().settings.filter((s) => s.chosen).map((s) => s.key).sort();
  // A new repository: every value is the default, so nothing reads as chosen.
  expect(chosen()).toEqual([]);
  const set = (key: string, value: string) => sh(command(read().settings.find((s) => s.key === key)!, value)!);
  set("assist", "start");
  set("sharing", "private-repo");
  expect(chosen()).toEqual(["assist", "sharing"]);
}, 60_000);

posix("with local only on, sharing and new records say local only overrides them", () => {
  const { repo, env, sh, read } = fixture();
  const sharing = () => read().settings.find((s) => s.key === "sharing")!;
  expect(sharing().overriddenBy).toBeUndefined();
  sh(command(read().settings.find((s) => s.key === "local")!, "on")!);
  expect(sharing().overriddenBy).toBe("local");
  const text = Bun.spawnSync(["bun", join(ROOT, "protocol/cli.ts"), "options", "--repo", repo], { cwd: repo, env, stdout: "pipe" }).stdout.toString();
  expect(text).toContain("Sharing: Team (Local only overrides this)");
  expect(text).toContain("New records: Shared (Local only overrides this)");
}, 60_000);

posix("letting the agent do it installs hooks and changes nothing that asks first", () => {
  const { repo, sh, read } = fixture();
  const asked = (o: CompactOptions) => Object.fromEntries(o.settings.filter((s) => s.asks).map((s) => [s.key, s.here]));
  const before = read();
  const setup = sh(["bun", join(ROOT, "scripts/setup.ts"), ...setupEverywhere(["claude-code", "codex", "cursor"])].join(" "));
  expect(setup.exitCode).toBe(0);
  const after = read();
  expect(after.settings.find((s) => s.key === "where")!.here).toBe("everywhere");
  expect(asked(after)).toEqual(asked(before));
  expect(asked(after)).toMatchObject({ push: "off", prepush: "off", instructions: "off" });
  expect(readFileSync(join(repo, "AGENTS.md"), "utf8")).toBe("# Instructions\n");
}, 60_000);

test("anvc options --json counts the sessions from before that catch-up would import", () => {
  const { repo, home, read } = fixture();
  const dir = transcriptDir(samePath(repo), join(home, ".claude", "projects"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "old.jsonl"), `${JSON.stringify({ type: "user", uuid: "u1", sessionId: "old", cwd: repo, timestamp: "2026-09-01T10:00:00.000Z", message: { role: "user", content: "x" } })}\n`);
  expect(read().earlier).toBe(1);
});
