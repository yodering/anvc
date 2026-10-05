#!/usr/bin/env bun
/**
 * Installs ANVC once for an agent, for every repository it opens.
 *
 *   bun run setup --global --agent claude-code,codex,cursor
 *
 * Setup per repository meant nobody had ANVC in the next project they cloned,
 * the way nobody would use git if every clone needed its own install. Each
 * agent reads hooks from the person's own config as well as the project's:
 * Claude Code's user settings (the plugin), ~/.codex/hooks.json and
 * ~/.cursor/hooks.json.
 *
 * Setup used to avoid exactly this, because global hooks once captured an
 * unrelated repository. What changed: every raw-log reader keeps to the exact
 * repository it serves, the MCP server refuses to guess one, and each folder
 * has a switch (anvc off, or the work log) that stops everything there.
 *
 * All three agents run project hooks and user hooks side by side, so ANVC's
 * hooks in a repository set up earlier are taken out, or every event there
 * would be captured twice.
 *
 * `anvc uninstall --everywhere` takes it out again (protocol/uninstall.ts).
 */
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { flag } from "../protocol/args";
import { AGENTS } from "../protocol/agents";
import { anvcCommand, claudeDir, codexDir, cursorDir, GLOBAL, installLauncher, installs, noteInstall, forgetInstall } from "../protocol/version";
import { codexHooks, cursorHooks, dropServer, installedAgents, mergeCursorHooks, mergeHooks, planner, readJsonOrExit, removeOurs } from "./hookfiles";

const argv = process.argv.slice(2);
const here = resolve(import.meta.dir, "..");
const named = flag(argv, "agent", "").trim().toLowerCase();
const agents = named === "all" ? installedAgents() : named.split(",").map((a) => a.trim()).filter(Boolean);

if (!agents.length || agents.some((a) => !(AGENTS as readonly string[]).includes(a))) {
  console.error(`Which agents should ANVC run in, in every repository?

  bun run setup --global --agent claude-code,codex,cursor
  bun run setup --global --agent all        every one of them installed here

Nothing was changed.`);
  process.exit(2);
}

const { dry, say, plan, save, done } = planner(argv);

say("ANVC setup for every repository\n");
if (dry) console.log("Setup would change, for every repository:");

for (const agent of agents) {
  if (agent === "claude-code") {
    // The plugin, enabled for the person rather than one project: it brings
    // its hooks and MCP server, and Claude Code's plugin manager updates it.
    const file = join(claudeDir(), "settings.json");
    const settings = readJsonOrExit(file);
    ((settings.extraKnownMarketplaces ??= {}) as Record<string, unknown>).anvc = { source: { source: "github", repo: "yodering/anvc" } };
    ((settings.enabledPlugins ??= {}) as Record<string, boolean>)["anvc@anvc"] = true;
    // Hooks written into user settings by hand would run beside the plugin's.
    const old = removeOurs(settings);
    save(file, settings, `enable the ANVC plugin${old ? `, and take out ${old} older ANVC hooks` : ""}`);
    say(`✓ Claude Code: ANVC plugin enabled in ${file}${old ? ` (${old} older ANVC hooks removed)` : ""}
  In Claude Code, run once: /plugin install anvc@anvc`);
  }

  if (agent === "codex") {
    const file = join(codexDir(), "hooks.json");
    const settings = readJsonOrExit(file);
    const added = mergeHooks(settings, codexHooks(here));
    save(file, settings, `write ${added} ANVC hooks`);
    say(`✓ Codex: hooks ${added ? "installed" : "already"} in ${file}
  Codex asks you to review them once (/hooks). If the MCP server isn't registered yet:
  codex mcp add anvc --env ANVC_AGENT=codex -- bun ${here}/protocol/mcp.ts`);
  }

  if (agent === "cursor") {
    const dir = cursorDir();
    const hooksFile = join(dir, "hooks.json");
    const hooks = readJsonOrExit(hooksFile);
    const added = mergeCursorHooks(hooks, cursorHooks(here));
    save(hooksFile, hooks, `write ${added} ANVC hooks`);
    // Cursor fills ${workspaceFolder} with the project it opened. Left
    // unfilled, the server says it can't tell which repository this is and
    // does nothing, rather than guess.
    const mcpFile = join(dir, "mcp.json");
    const mcp = readJsonOrExit(mcpFile);
    ((mcp.mcpServers ??= {}) as Record<string, unknown>).anvc = {
      command: "bun",
      args: [`${here}/protocol/mcp.ts`],
      env: { ANVC_REPO: "${workspaceFolder}", ANVC_AGENT: "cursor" },
    };
    save(mcpFile, mcp, "add the anvc MCP server");
    say(`✓ Cursor: hooks ${added ? "installed" : "already"} in ${hooksFile}, MCP server in ${mcpFile}`);
  }

  // Repositories set up one at a time before: their ANVC hooks come out, so
  // nothing runs twice. Their records, settings and switches stay.
  let cleaned = 0;
  for (const install of installs().filter((i) => i.agent === agent && i.repo !== GLOBAL)) {
    const files = agent === "claude-code" ? [join(install.repo, ".claude", "settings.local.json")]
      : agent === "codex" ? [join(install.repo, ".codex", "hooks.json")]
      : [join(install.repo, ".cursor", "hooks.json"), join(install.repo, ".cursor", "mcp.json")];
    for (const file of files.filter(existsSync)) {
      const data = readJsonOrExit(file);
      if (removeOurs(data) + Number(dropServer(data))) { save(file, data, "take out ANVC's own entries, so nothing runs twice"); cleaned++; }
    }
    if (!dry) forgetInstall(install.repo, agent);
  }
  if (cleaned) say(`  Took ANVC's own hooks out of ${cleaned} file${cleaned === 1 ? "" : "s"} in repositories set up one by one, so nothing runs twice.`);
  if (!dry) noteInstall(GLOBAL, agent);
}

const launcher = installLauncher(dry);
if (launcher?.changed) dry ? plan(launcher.file, "add a launcher that runs ANVC from any folder") : say(`✓ Added ${launcher.file}, which runs ANVC from any folder`);
const cli = anvcCommand();

done();
say(`
ANVC now runs in every git repository these agents open. To turn it off in one:
  ${cli} off --repo /path/to/project     or the switch at the top of the work log

Records stay on this computer. To share a repository's records with git push, run
this once in it:  ${cli} init --repo /path/to/project

Start a new agent session for this to take effect.`);
