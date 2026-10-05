/**
 * anvc built as a Claude Code plugin: self-contained, and carrying the same
 * hooks setup installs.
 */
import { expect, onTestFinished, test } from "bun:test";
import { existsSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { claudeHooks, quoted } from "../scripts/hookfiles";
import { repoRoot } from "../protocol/activity";
import { appendRecord, ulid, type CheckpointRecord } from "../protocol/record";
import { recordFile, type Running } from "../protocol/open";
import { readJson } from "../protocol/rawlog";
import { shellWord } from "../protocol/args";
import { pointerFile } from "../protocol/version";
import { gitRepo, runHook, tmp, uiFetch } from "./helpers";

const BUILD = resolve(import.meta.dir, "../scripts/build-plugin.ts");

test("the plugin carries every hook setup installs, and its bundled hooks run on their own", async () => {
  // Resolved, since the page names the plugin's folder the way it finds it (on macOS /var is /private/var).
  const out = realpathSync(tmp("anvc-plugin-"));
  const repo = gitRepo();
  expect(Bun.spawnSync(["bun", BUILD, out], { stdout: "pipe", stderr: "pipe" }).exitCode).toBe(0);
  const manifest = await Bun.file(join(out, ".claude-plugin/plugin.json")).json();
  expect(manifest.name).toBe("anvc");
  expect(manifest.mcpServers.anvc.args[0]).toBe("${CLAUDE_PLUGIN_ROOT}/dist/mcp.js");
  const hooks = (await Bun.file(join(out, "hooks/hooks.json")).json()).hooks as Record<string, unknown[]>;
  expect(Object.keys(hooks).sort()).toEqual(Object.keys(claudeHooks({ capture: "", inject: "", stop: "" })).sort());
  // /anvc:setup reads the settings from the bundled CLI, whose commands name
  // the bundle. Setup isn't in a plugin, so the agents it installs aren't
  // offered; the push check and the AGENTS.md lines are, both ways.
  const setup = await Bun.file(join(out, "commands/setup.md")).text();
  expect(setup).toContain('dist/cli.js" options --json');
  // Then it offers goals and writing rules drawn from the project's own files.
  for (const tool of ["`anvc_goal`", "`anvc_rule`", "don't invent any"]) expect(setup).toContain(tool);
  await Bun.write(join(repo, "AGENTS.md"), "# Rules\n");
  const cli = join(out, "dist/cli.js");
  const options = JSON.parse(Bun.spawnSync(["bun", cli, "options", "--json", "--repo", repo], { stdout: "pipe" }).stdout.toString());
  const setting = (key: string) => options.settings.find((s: { key: string }) => s.key === key);
  // The anvc command isn't on this PATH, so the commands start with the bundle's path.
  expect(options.cli).toBe(`bun ${shellWord(cli)}`);
  expect(setting("assist").set).toStartWith(`bun ${shellWord(cli)} assist <value>`);
  expect(options.settings.map((s: { key: string }) => s.key)).not.toContain("agents");
  for (const key of ["prepush", "instructions"]) {
    expect(setting(key).set, key).toStartWith(`bun ${shellWord(cli)} ${key === "prepush" ? "push-check" : "instructions"} <value>`);
  }
  // The setup skill fills in the commands it runs from the list.
  for (const step of ["`<cli> catch-up`", "`<cli> desktop install`", "`<value>`"]) expect(setup).toContain(step);
  expect(setup).not.toContain("setEverywhere");
  // After the settings, importing the earlier sessions is the next question, on its own.
  expect(setup).toContain("Next, if `earlier` is more than 0, ask one short question before anything else");
  expect(setup.indexOf("`<cli> catch-up`")).toBeLessThan(setup.indexOf("Then offer these"));
  expect(Bun.spawnSync(["bun", cli, "push-check", "on", "--repo", repo]).exitCode).toBe(0);
  // The hook runs the command line named in ~/.anvc/cli, which names the
  // bundle, since a plugin has no protocol/cli.ts.
  expect(await Bun.file(join(repo, ".git/hooks/pre-push")).text()).toContain(`cat ${quoted(pointerFile())}`);
  expect(await Bun.file(pointerFile()).text()).toBe(cli);
  expect(Bun.spawnSync(["bun", cli, "push-check", "off", "--repo", repo]).exitCode).toBe(0);
  expect(await Bun.file(join(repo, ".git/hooks/pre-push")).exists()).toBe(false);

  // Run a bundled hook from the built folder, as Claude Code would.
  appendRecord(repo, {
    anvc: 0, id: ulid(), anchor: { kind: "blob", oid: "a".repeat(40) }, session: { agent: "claude-code", run_id: "s" },
    intent: { goal: "Pool the redis connections", why: "ssl context is not copyable" },
    outcome: { status: "abandoned", recheck: null }, ts: new Date().toISOString(),
  } as CheckpointRecord);
  const p = Bun.spawnSync(["bun", join(out, "dist/inject.js"), "SessionStart"], {
    stdin: new TextEncoder().encode(JSON.stringify({ session_id: "p1", cwd: repo, source: "startup" })),
    stdout: "pipe", stderr: "pipe",
  });
  expect(JSON.parse(p.stdout.toString()).hookSpecificOutput.additionalContext).toContain("Pool the redis connections");
}, 60_000);

test("the plugin's /anvc:open starts the bundled work log, and it serves its page", async () => {
  const out = realpathSync(tmp("anvc-plugin-"));
  const repo = realpathSync(gitRepo({ commit: true }));
  expect(Bun.spawnSync(["bun", BUILD, out], { stdout: "pipe", stderr: "pipe" }).exitCode).toBe(0);
  const open = await Bun.file(join(out, "commands/open.md")).text();
  expect(open).toContain('dist/cli.js" open --repo');
  // /anvc:open --desktop works, and what the user typed never reaches the shell line.
  expect(open).toContain('argument-hint: "[--desktop] [--no-browser]"');
  expect(open).toContain("Arguments: $ARGUMENTS");
  expect(open.match(/```bash\n(.*)\n```/)![1]).not.toContain("$ARGUMENTS");
  expect(await Bun.file(join(out, "commands/init.md")).text()).not.toContain("$ARGUMENTS");
  // Run from somewhere else, as Claude Code does: the bundle finds its page from its own folder.
  const p = Bun.spawnSync(["bun", join(out, "dist/cli.js"), "open", "--no-browser", "--port", "7520-7539", "--repo", repo], { cwd: repo, stdout: "pipe", stderr: "pipe" });
  const kept = readJson<Running | null>(recordFile(repo), null);
  onTestFinished(() => { try { if (kept) process.kill(kept.pid); } catch { /* already gone */ } });
  expect(p.exitCode, p.stderr.toString()).toBe(0);
  const origin = `http://127.0.0.1:${kept!.port}`;
  expect(p.stdout.toString()).toContain(`${origin}/?t=${process.env.ANVC_UI_TOKEN}`);
  const page = await (await uiFetch(origin)).text();
  const js = page.match(/src="([^"]+\.js)"/)![1]!, css = page.match(/href="([^"]+\.css)"/)![1]!;
  expect(await (await uiFetch(new URL(js, `${origin}/`).href)).text()).toContain("Untitled attempt");
  expect(await (await uiFetch(new URL(css, `${origin}/`).href)).text()).toContain("--kept");
  // The page's commands run the plugin's CLI, since there's no clone to run `bun run anvc` in.
  const v = (await (await uiFetch(`${origin}/api/version`)).json()) as { managed: string; cli: string; repo: string };
  expect(v).toMatchObject({ managed: "plugin", cli: `bun ${shellWord(join(out, "dist/cli.js"))}`, repo: `--repo ${shellWord(repoRoot(repo)!)}` });
}, 60_000);

test("the plugin's hooks step aside where the project runs ANVC's own", async () => {
  const { rm, mkdir, writeFile } = await import("node:fs/promises");
  const project = gitRepo();
  const capture = tmp("anvc-shadow-cap-");
  const run = () => runHook("capture", "PostToolUse", { session_id: "s", cwd: project, tool_name: "Bash", tool_input: { command: "ls" }, tool_response: {} },
    { CLAUDE_PLUGIN_ROOT: "/plugin", CLAUDE_PROJECT_DIR: project, ANVC_CAPTURE_DIR: capture });
  const { readdirSync } = await import("node:fs");
  const rows = () => readdirSync(capture, { recursive: true }).filter((f) => String(f).endsWith(".jsonl")).length;
  run();
  expect(rows()).toBe(1);
  await rm(capture, { recursive: true, force: true });
  await mkdir(join(project, ".claude"), { recursive: true });
  await writeFile(join(project, ".claude", "settings.json"), JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: "command", command: 'bun "$CLAUDE_PROJECT_DIR"/emitters/claude-code/stop.ts Stop' }] }] } }));
  run();
  expect(existsSync(capture)).toBe(false);
});
