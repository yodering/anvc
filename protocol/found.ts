/**
 * Git repositories on this computer that ANVC hasn't run in, and what each
 * needs for it to run there.
 *
 * The Folders page lists them below the folders ANVC knows, so a person can
 * see where it isn't yet and set it up. They're looked for where the person
 * keeps projects: the folders holding the repositories ANVC already knows,
 * and any folder added on the page.
 *
 * What one needs depends on how ANVC is installed. Installed for every
 * project, an agent opening it is enough, so it has only its switch.
 * Installed one project at a time, setup has to run there.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { AGENT_NAMES, AGENTS, installedAgents } from "./agents";
import { shellWord } from "./args";
import { folderOn } from "./folders";
import { setupEverywhere, setupProject } from "./options";
import { isRepo, readJson, samePath, writeJson } from "./rawlog";
import { tilde } from "./tools";
import { anvcCommand, claudeDir, GLOBAL, installs, stateHome } from "./version";

/**
 * How far a search goes: two levels below each folder, and it stops at 200
 * repositories or two seconds, whichever comes first.
 */
const LIMITS = { depth: 2, repos: 200, ms: 2000 };

const addedFile = () => join(stateHome(), "search-folders.json");

/** Folders the person added on the Folders page. */
const addedFolders = (): string[] => readJson<string[]>(addedFile(), []);

/** Adds a folder to look in, `~` being the home folder, and returns it as kept. */
export function addFolder(given: string): string {
  const path = given.trim().replace(/^~(?=[\\/]|$)/, homedir());
  if (!isAbsolute(path)) throw new Error("Give the folder's full path, such as ~/code");
  const dir = samePath(path);
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) throw new Error(`There's no folder at ${given.trim()}`);
  const list = addedFolders();
  if (!list.includes(dir)) writeJson(addedFile(), [...list, dir]);
  return dir;
}

/** Where to look: the folders the person added, then each folder holding one ANVC knows. */
export function searchFolders(known: string[]): string[] {
  // Never the whole disk, for a repository at the top of it.
  const parents = known.map((r) => dirname(samePath(r))).filter((d) => dirname(d) !== d);
  return [...new Set([...addedFolders(), ...parents])];
}

/**
 * Git repositories in these folders. A repository is a folder holding .git,
 * and its own folders aren't searched. Hidden folders and node_modules are
 * skipped, and a symlink is never followed, so the search can't leave the
 * folders it was given. Nearer folders are searched first, so a limit cuts
 * the deepest; `stopped` says one was reached.
 */
export function findRepos(roots: string[], limits = LIMITS): { repos: string[]; stopped: boolean } {
  const until = Date.now() + limits.ms;
  const repos: string[] = [];
  let level = roots.map(samePath);
  let stopped = false;
  for (let depth = 0; depth <= limits.depth && level.length && !stopped; depth++) {
    const next: string[] = [];
    for (const dir of level) {
      if (Date.now() > until) { stopped = true; break; }
      if (existsSync(join(dir, ".git"))) {
        if (repos.includes(dir)) continue;
        if (repos.length === limits.repos) { stopped = true; break; }
        repos.push(dir);
        continue;
      }
      if (depth === limits.depth) continue;
      try {
        // A Dirent for a symlink is never a directory.
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") next.push(join(dir, entry.name));
        }
      } catch { /* unreadable: skipped */ }
    }
    level = next;
  }
  return { repos: repos.sort(), stopped };
}

/** Whether a Claude Code settings file turns the ANVC plugin on. */
const pluginOn = (file: string) => readJson<{ enabledPlugins?: Record<string, unknown> } | null>(file, null)?.enabledPlugins?.["anvc@anvc"] === true;

/** The agents ANVC is installed for in every project: setup --global, or the Claude Code plugin enabled for the person. */
function everywhereAgents(): string[] {
  const agents = new Set(installs().filter((i) => i.repo === GLOBAL).map((i) => i.agent));
  if (pluginOn(join(claudeDir(), "settings.json"))) agents.add("claude-code");
  return [...agents];
}

/**
 * The agents whose ANVC hooks run in this repository: set up for every
 * project or for this one, or the Claude Code plugin turned on for the person
 * or the project and installed.
 */
export function connectedAgents(repo: string): string[] {
  const here = isRepo(repo);
  const agents = new Set(installs().filter((i) => i.repo === GLOBAL || here(i.repo)).map((i) => i.agent));
  const installed = readJson<{ plugins?: Record<string, unknown> } | null>(join(claudeDir(), "plugins", "installed_plugins.json"), null)?.plugins?.["anvc@anvc"];
  if (installed && [join(claudeDir(), "settings.json"), join(repo, ".claude", "settings.json"), join(repo, ".claude", "settings.local.json")].some(pluginOn)) agents.add("claude-code");
  return AGENTS.filter((a) => agents.has(a));
}

/** The agents setup connects: the ones set up one project at a time, else every one installed here. */
export function setupAgents(): string[] {
  const connected = [...new Set(installs().filter((i) => i.repo !== GLOBAL).map((i) => i.agent))];
  if (connected.length) return connected;
  const here = installedAgents();
  return here.length ? [...here] : ["claude-code"];
}

export interface FoundRepo {
  repo: string;
  on: boolean;
  /** Covered by an install for every project, set up here on its own, or neither. */
  state: "everywhere" | "project" | "none";
  command: string;
}

export interface FoundView {
  /** Names of the agents installed for every project. Empty when ANVC is set up one project at a time. */
  everywhere: string[];
  /** Names of the agents setup would connect. */
  agents: string[];
  /** Whether the page can run setup. The desktop app has no setup script on disk. */
  setup: boolean;
  /** The folders looked in, with the home folder as ~. */
  searched: string[];
  stopped: boolean;
  found: FoundRepo[];
  /** The commands the page runs, to copy where it can't. */
  commands: { everywhere: string; remove: string };
}

/** Every repository found that isn't one of `known`, with what it needs. */
export function foundView(known: string[], setup: boolean): FoundView {
  const skip = new Set(known.map(samePath));
  const searched = searchFolders([...skip]);
  const { repos, stopped } = findRepos(searched);
  const everywhere = everywhereAgents();
  const agents = setupAgents();
  const alone = new Set(installs().filter((i) => i.repo !== GLOBAL).map((i) => samePath(i.repo)));
  const run = (args: string[]) => `bun run setup ${args.map(shellWord).join(" ")}`;
  const name = (a: string) => AGENT_NAMES[a] ?? a;
  return {
    everywhere: everywhere.map(name), agents: agents.map(name), setup, searched: searched.map(tilde), stopped,
    found: repos.filter((r) => !skip.has(r)).map((repo) => ({
      repo, on: folderOn(repo),
      state: everywhere.length ? "everywhere" : alone.has(repo) ? "project" : "none",
      command: run(setupProject(repo, agents)),
    })),
    commands: { everywhere: run(setupEverywhere(agents)), remove: `${anvcCommand()} uninstall --everywhere` },
  };
}
