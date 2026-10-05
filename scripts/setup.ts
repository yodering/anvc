#!/usr/bin/env bun
/**
 * Gets a stranger from a clone to a working install.
 *
 * Everything this does was previously done by hand, which meant the tool only
 * worked on the machine it was written on: the MCP server had to be wired up
 * from nothing, the capture and injection hooks had to be pasted into settings,
 * and the git refspecs had to be configured or records silently never left the
 * repository.
 *
 *   bun run setup --repo /path/to/project --agent codex
 *
 * Idempotent: running it twice changes nothing the second time, and it never
 * overwrites a hook someone else installed.
 */
import { isLocalOnly } from "../protocol/localonly";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { below, samePath } from "../protocol/rawlog";
import { flag, has, shellWord } from "../protocol/args";
import { configureRemote, git, gitOrNull } from "../protocol/git";
import { addInstructions, INSTRUCTION_LINES, instructionsFile, instructionsOn } from "../protocol/instructions";
import { installPrePush, prePushOn } from "../protocol/prepush";
import { anvcCommand, GLOBAL, installLauncher, installs, noteInstall } from "../protocol/version";
import { AGENTS } from "../protocol/agents";
import { claudeHooks, codexHooks, cursorHooks, installedAgents, mergeCursorHooks, mergeHooks, planner, quoted, readJsonOrExit, removeOurs } from "./hookfiles";

const argv = process.argv.slice(2);
if (has(argv, "help")) {
  console.log(`anvc setup — connect ANVC to a repository and an agent

  --agent NAME      the coding agent you use: ${AGENTS.join(", ")}, or any other name;
                    several separated by commas, or all for every one installed
  --global          install for every repository the agent opens, instead of one;
                    turn it off in one with anvc off or the switch in the work log
  --repo DIR        the repository to record (default: the current directory)
  --remote NAME     git remote records travel through (default: origin)
  --no-hooks        skip writing hooks for Claude Code, Codex or Cursor
  --no-remote       leave git as it is: records stay here until anvc init
  --no-instructions skip adding the recording line to AGENTS.md or CLAUDE.md
  --plugin          Claude Code: add ANVC as a plugin in the project's
                    settings instead of writing hooks; it updates itself
  --pre-push        add a pre-push hook: one line on what a push shares, and a
                    stop if a record holds a credential. Runs after your own.
  --instructions    add the recording lines to AGENTS.md or CLAUDE.md, which
                    setup does anyway once --agent is named
  --dry-run         list what setup would change, and change nothing

Without --agent, --pre-push and --instructions change only what they name.
`);
  process.exit(0);
}

const here = resolve(import.meta.dir, "..");

// Once for every repository: a script of its own, since none of what follows
// (git remotes, one project's files) applies.
if (has(argv, "global")) {
  const run = Bun.spawnSync(["bun", resolve(import.meta.dir, "setup-global.ts"), ...argv.filter((a) => a !== "--global")], { stdout: "inherit", stderr: "inherit" });
  process.exit(run.exitCode ?? 1);
}

const repo = resolve(flag(argv, "repo", process.cwd()));
const { dry, say, plan, save, done } = planner(argv, (file) => below(repo, file) ?? file);
const remote = flag(argv, "remote", "origin");
// Asked for rather than assumed. Setup used to install Claude Code hooks into
// every repository, whatever agent worked there.
const agent = flag(argv, "agent", "").trim().toLowerCase();

// Several agents at once: each is set up in turn, as if named alone. `all`
// means whichever of the three are installed here.
if (agent === "all" || agent.includes(",")) {
  const list = agent === "all" ? installedAgents() : agent.split(",").map((a) => a.trim()).filter(Boolean);
  if (!list.length) { console.error("None of Claude Code, Codex or Cursor is installed here. Name one with --agent."); process.exit(2); }
  const rest = argv.filter((a, i) => a !== "--agent" && argv[i - 1] !== "--agent" && !a.startsWith("--agent="));
  let code = 0;
  for (const one of list) {
    const run = Bun.spawnSync(["bun", import.meta.path, ...rest, "--agent", one], { stdout: "inherit", stderr: "inherit" });
    code = Math.max(code, run.exitCode ?? 1);
  }
  process.exit(code);
}

// Printing "add this line to AGENTS.md" and stopping meant most people never
// added it, and an agent that is never told to record does not record. So the
// line goes into the file the agent already reads. Without Claude Code's hooks
// nothing hands dead ends over unasked, so other agents are told to ask.
const [ASK, LINE] = INSTRUCTION_LINES as [string, string];

// The pre-push check or the instruction lines alone, in a repository that is
// already set up, so each can be said yes to on its own.
if (!agent && (has(argv, "pre-push") || has(argv, "instructions"))) {
  if (!gitOrNull(repo, ["rev-parse", "--git-dir"])) {
    console.error(`not a git repository: ${repo}`);
    process.exit(1);
  }
  if (has(argv, "pre-push")) prePush();
  if (has(argv, "instructions")) say(instructed([ASK, LINE]) ?? `No AGENTS.md or CLAUDE.md here, and none was created. Add these lines to your agent's instructions:\n\n  ${ASK}\n  ${LINE}`);
  done();
  process.exit(0);
}

// In a terminal, with nothing named, the choices are asked rather than
// listed as flags: scripts/onboard.ts. Asking would change things, so not
// in a dry run.
if (!agent && !dry && process.stdin.isTTY && process.stdout.isTTY) {
  const run = Bun.spawnSync(["bun", resolve(import.meta.dir, "onboard.ts")], { stdin: "inherit", stdout: "inherit", stderr: "inherit" });
  process.exit(run.exitCode ?? 1);
}

if (!agent) {
  console.error(`Which coding agent do you use here? Run setup again with --agent:

  --agent claude-code   MCP tools, plus hooks that capture work and hand back dead ends
  --agent codex         MCP tools, plus the same hooks as Claude Code
  --agent cursor        MCP tools, plus hooks
  --agent <name>        any other agent that speaks MCP
  --agent all           every one of Claude Code, Codex and Cursor installed here
                        (or name several: --agent claude-code,codex)

Nothing was changed.`);
  process.exit(2);
}

if (!gitOrNull(repo, ["rev-parse", "--git-dir"])) {
  console.error(`not a git repository: ${repo}`);
  process.exit(1);
}

say(`anvc setup\n  repository: ${repo}\n  agent: ${agent}\n`);
if (dry) console.log(`Setup would change, in ${repo} for ${agent}:`);

// ---------------------------------------------------------------- 1. refspecs
// Without these a plain push leaves records behind and a plain clone fetches
// none of them, so a teammate sees an empty log and nothing says otherwise.
// That is most of why git notes never caught on.
// Installed for every repository already: this one's hooks would run twice.
const everywhere = installs().some((i) => i.repo === GLOBAL && i.agent === agent);
if (everywhere && !argv.includes("--no-hooks")) {
  say(`✓ ANVC is installed for ${agent} in every repository, so no hooks are added here`);
  argv.push("--no-hooks");
}

// Local only: records stay here, so git is left as it is.
if (isLocalOnly(repo)) {
  say("✓ local only: records stay on this computer, so git push and fetch are left as they are");
} else if (has(argv, "no-remote")) {
  say("✓ git left as it is: records stay here until you run anvc init");
} else {
  const { added, removed, changes } = configureRemote(repo, remote, dry);
  for (const change of changes) plan("git config", change);
  if (removed) say(`✓ git push now sends the current branch, not every local branch`);
  say(added
    ? `✓ git configured — records now travel with push and fetch (${added} refspec${added === 1 ? "" : "s"})`
    : `✓ git already configured`);
}

// ---------------------------------------------------------------- 2. hooks
// Capture writes events; inject reads records back to the agent. Both are
// merged into the project's own settings rather than the user's global file:
// global hooks once captured an unrelated repository, which is not a mistake
// worth repeating. Claude Code, Codex and Cursor get hooks; other agents get
// the MCP tools alone.
// As a plugin: the project names the ANVC marketplace and plugin in its
// committed settings, so everyone who opens it is asked to install ANVC, and
// Claude Code's plugin manager keeps it up to date. Hooks come with the
// plugin, so any written here the old way are removed, or they would run twice.
if (agent === "claude-code" && has(argv, "plugin")) {
  const shared = resolve(repo, ".claude", "settings.json");
  const settings = readJsonOrExit(shared);
  const markets = (settings.extraKnownMarketplaces ??= {}) as Record<string, unknown>;
  markets.anvc = { source: { source: "github", repo: "yodering/anvc" } };
  const enabled = (settings.enabledPlugins ??= {}) as Record<string, boolean>;
  enabled["anvc@anvc"] = true;
  let moved = 0;
  for (const file of [shared, resolve(repo, ".claude", "settings.local.json")]) {
    const data = file === shared ? settings : readJsonOrExit(file);
    if (!data?.hooks) continue;
    moved += removeOurs(data);
    if (file !== shared) save(file, data, "take out ANVC's hooks");
  }
  save(shared, settings, "add the ANVC plugin");
  say(`✓ ANVC added as a plugin in ${shared}${moved ? `; ${moved} hooks written the old way removed` : ""}.
  Commit that file: everyone who opens this project is then asked to install ANVC.
  In Claude Code: /plugin install anvc@anvc (it asks to trust the marketplace first).`);
}

if (agent === "claude-code" && !has(argv, "no-hooks") && !has(argv, "plugin")) {
  const dir = resolve(repo, ".claude");

  // Installing into ANVC's own checkout writes a file both of us commit, so it
  // must not name either machine's path. Claude Code expands
  // $CLAUDE_PROJECT_DIR in hook commands, and there that is ANVC itself.
  //
  // Any other repository needs the absolute path to wherever ANVC was cloned,
  // which is true of one machine only. So those hooks go in
  // settings.local.json, which is never committed: written into settings.json
  // they were committed with the project, and every teammate's hooks pointed at
  // a directory on someone else's disk.
  const own = samePath(repo) === samePath(here);
  const file = resolve(dir, own ? "settings.json" : "settings.local.json");
  const settings = readJsonOrExit(file);
  // Read before anything is written, so a corrupt one stops setup untouched.
  const shared = resolve(dir, "settings.json");
  const committed = own ? {} : readJsonOrExit(shared);
  const root = own ? `"$CLAUDE_PROJECT_DIR"` : quoted(here);
  const capture = `bun ${root}/emitters/claude-code/capture.ts`;
  const inject = `bun ${root}/emitters/claude-code/inject.ts`;
  const stop = `bun ${root}/emitters/claude-code/stop.ts`;
  const wanted = claudeHooks({ capture, inject, stop });

  const installed = mergeHooks(settings, wanted);
  const ours = {};
  mergeHooks(ours, wanted);

  if (own || !showInstead(".claude/settings.local.json", ours)) {
    save(file, settings, hooksWritten(installed));
    say(installed
      ? `✓ Claude Code hooks installed in ${file} (${installed} added or updated)`
      : `✓ Claude Code hooks already installed`);
  }

  if (!own) {
    // An earlier setup wrote these into settings.json. Left there, every hook
    // would run twice, and the committed copy still names this machine's path.
    // Only ours are removed; the file is otherwise untouched.
    const moved = removeOurs(committed);
    if (moved) {
      save(shared, committed, `take out ${moved} ANVC hook${moved === 1 ? "" : "s"}`);
      say(`✓ moved ${moved} ANVC hook${moved === 1 ? "" : "s"} out of ${shared}; commit that change`);
    }

    // Claude Code ignores settings.local.json when it creates the file, and not
    // when we do. Excluded locally rather than by editing a .gitignore the
    // project commits.
    excludeLocally(".claude/settings.local.json");
  }
}

// Codex reads hooks in Claude Code's layout, with the same event names and
// payload fields, so the same scripts serve it, told which agent is calling.
// Codex runs a project's hooks only once the project is trusted, and asks.
// Always absolute paths, and always kept out of commits, since they name this
// machine's copy of anvc.
if (agent === "codex" && !has(argv, "no-hooks")) {
  const file = resolve(repo, ".codex", "hooks.json");
  const settings = readJsonOrExit(file);
  const installed = mergeHooks(settings, codexHooks(here));
  const ours = {};
  mergeHooks(ours, codexHooks(here));
  if (!showInstead(".codex/hooks.json", ours)) {
    save(file, settings, hooksWritten(installed));
    say(installed
      ? `✓ Codex hooks installed in ${file} (${installed} added or updated). Codex asks to trust them the first time.`
      : `✓ Codex hooks already installed`);
    excludeLocally(".codex/hooks.json");
  }
}

// Cursor names its events differently and lists commands flat under each,
// but runs the same scripts, which recognise it from what it sends and answer
// in its format. Kept out of commits for the same reason as Codex's.
if (agent === "cursor" && !has(argv, "no-hooks")) {
  const file = resolve(repo, ".cursor", "hooks.json");
  const config = readJsonOrExit(file);
  const installed = mergeCursorHooks(config, cursorHooks(here));
  const ours = {};
  mergeCursorHooks(ours, cursorHooks(here));
  if (!showInstead(".cursor/hooks.json", ours)) {
    save(file, config, hooksWritten(installed));
    say(installed
      ? `✓ Cursor hooks installed in ${file} (${installed} added or updated)`
      : `✓ Cursor hooks already installed`);
    excludeLocally(".cursor/hooks.json");
  }
}

// An optional pre-push hook: one line saying which records a push shares,
// and a stop when one of them holds something shaped like a credential. Only
// with --pre-push, and never in place of a hook that is already there: that
// one moves aside and runs first, and its answer stands.
if (has(argv, "pre-push")) prePush();

function prePush(): void {
  if (dry) { if (!prePushOn(repo)) plan(".git/hooks/pre-push", "add the push check"); return; }
  try { say(`✓ ${installPrePush(repo)}`); } catch (error) { say(`✗ ${(error as Error).message}`); }
}

// The agents setup writes hooks for. Any other name still works, with the MCP
// server alone.
const known = (AGENTS as readonly string[]).includes(agent);
// Remembered, so `anvc update` can bring this repository's hooks up to date
// when a later version adds some.
if (!dry && known && !has(argv, "no-hooks") && !has(argv, "plugin")) noteInstall(repo, agent);

// ------------------------------------------------------- 3. instructions
const LINES = agent === "claude-code" ? [LINE] : [ASK, LINE];
let instructions = `Your agent records an attempt with anvc_checkpoint. Add ${LINES.length === 1 ? "this line" : "these lines"} to its instructions:\n\n${LINES.map((l) => `  ${l}`).join("\n")}`;
if (!has(argv, "no-instructions")) instructions = instructed(LINES) ?? instructions;

/** The lines added to AGENTS.md or CLAUDE.md, as setup says it; null when neither exists. */
function instructed(lines: string[]): string | null {
  if (dry) {
    const file = instructionsFile(repo);
    if (file && !instructionsOn(repo)) plan(basename(file), "add the recording lines");
    return null;
  }
  const done = addInstructions(repo, lines);
  if (!done) return null;
  return done.added
    ? `✓ added the recording line to ${done.file} (anvc instructions off removes it; --no-instructions skips this)`
    : `✓ ${done.file} already tells the agent to record attempts`;
}

// ---------------------------------------------------------------- 4. MCP
// Printed rather than written, except for Cursor: every agent stores this
// somewhere different, and guessing wrong would edit a file we were not asked
// to touch.
const server = {
  command: "bun",
  args: [`${here}/protocol/mcp.ts`],
  env: { ANVC_REPO: repo, ANVC_AGENT: agent },
};
const json = (path: string) => `Add this to ${path}:

${JSON.stringify({ mcpServers: { anvc: server } }, null, 2)}`;

// Codex keeps MCP servers in one global file, so naming this repository there
// would file every project's records here. Without ANVC_REPO the server records
// into the repository Codex was started in.
const register: Record<string, string> = {
  "claude-code": `Register the MCP server, from ${repo}:

  claude mcp add-json anvc '${JSON.stringify(server)}'`,
  codex: `Register the MCP server once, for every repository:

  codex mcp add anvc --env ANVC_AGENT=codex -- bun ${quoted(`${here}/protocol/mcp.ts`)}`,
  cursor: agent === "cursor" ? (everywhere ? "✓ The MCP server is installed for every repository" : cursorMcp()) : "",
};

// Cursor reads MCP servers from the same folder as its hooks, so this one
// place is known and setup writes it. Other servers in the file are kept.
function cursorMcp(): string {
  if (showInstead(".cursor/mcp.json", { mcpServers: { anvc: server } })) return "";
  const file = resolve(repo, ".cursor", "mcp.json");
  let config: { mcpServers?: Record<string, unknown> } = {};
  if (existsSync(file)) {
    try { config = JSON.parse(readFileSync(file, "utf8")); } catch { return json(file); }
  }
  const already = JSON.stringify(config.mcpServers?.anvc) === JSON.stringify(server);
  (config.mcpServers ??= {}).anvc = server;
  save(file, config, "add the anvc MCP server");
  excludeLocally(".cursor/mcp.json");
  return `✓ MCP server ${already ? "already in" : "added to"} ${file}
  If Cursor shows the server as off, turn it on in its MCP settings.`;
}

const launcher = installLauncher(dry);
if (launcher?.changed) dry ? plan(launcher.file, "add a launcher that runs ANVC from any folder") : say(`✓ Added ${launcher.file}, which runs ANVC from any folder`);
const cli = anvcCommand();
const at = shellWord(repo);

say(`
${agent === "claude-code" && has(argv, "plugin") ? "The plugin brings the MCP server; there is nothing to register." : register[agent] ?? json("your agent's MCP configuration")}

Then:

  ${cli} open --repo ${at}
                                  the work log, in your browser
  ${cli} stats --repo ${at}
                                  how much has been recorded here
  ${cli} failed --repo ${at}
                                  attempts that errored
  ${cli} tiers --repo ${at}
                                  what is private, and what git push will share

${instructions}
${known ? "" : `
Without hooks, nothing hands dead ends to the agent unasked and nothing
reminds it to checkpoint. The instruction lines are what does that here.
`}`);
done();

function hooksWritten(n: number): string {
  return `write ${n} ANVC hook${n === 1 ? "" : "s"}`;
}

/** Whether the project commits this file. */
function tracked(relative: string): boolean {
  return gitOrNull(repo, ["ls-files", "--error-unmatch", "--", relative]) !== null;
}

/**
 * True, after printing what to add, when the project commits this file.
 * Excluding a file git already tracks does nothing, so this machine's paths
 * written into it went out with the next commit.
 */
function showInstead(relative: string, ours: unknown): boolean {
  if (!tracked(relative)) return false;
  say(`✗ ${relative} is committed in this project, so setup didn't write this machine's paths into it. To add them yourself:\n\n${JSON.stringify(ours, null, 2)}\n`);
  return true;
}

/** Keeps a file with this machine's paths out of the project's commits. */
function excludeLocally(relative: string): void {
  if (tracked(relative) || gitOrNull(repo, ["check-ignore", "-q", relative]) !== null) return;
  // .git/info/exclude, or a full path in a worktree.
  const where = git(repo, ["rev-parse", "--git-path", "info/exclude"]);
  if (dry) { plan(where, `add ${relative}`); return; }
  const exclude = resolve(repo, where);
  mkdirSync(resolve(exclude, ".."), { recursive: true });
  const before = existsSync(exclude) ? readFileSync(exclude, "utf8") : "";
  writeFileSync(exclude, `${before}${before && !before.endsWith("\n") ? "\n" : ""}${relative}\n`);
  say(`✓ ${relative} added to .git/info/exclude, so it is never committed`);
}
