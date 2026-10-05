/**
 * The Folders page lists git repositories ANVC hasn't run in, found near the
 * ones it has, and what each needs, which depends on how ANVC is installed.
 */
import { expect, test } from "bun:test";
import { mkdirSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { shellWord } from "../protocol/args";
import { folderOn, folders, setFolder } from "../protocol/folders";
import { addFolder, findRepos, foundView, searchFolders } from "../protocol/found";
import { anvcCommand } from "../protocol/version";
import { setEnv, tmp } from "./helpers";

// `~` in a folder the person adds isn't tested here: os.homedir() keeps the
// HOME this process started with, and that's the real one.

/** A folder of fixture repositories: each path given gets a .git folder. */
function tree(...repos: string[]): string {
  const root = realpathSync(tmp("anvc-found-"));
  for (const r of repos) mkdirSync(join(root, r, ".git"), { recursive: true });
  return root;
}

function state() {
  const home = tmp("anvc-found-state-");
  setEnv({ ANVC_STATE_HOME: home, CLAUDE_CONFIG_DIR: join(home, "claude") });
  return home;
}

const installs = (home: string, list: Array<[string, string]>) =>
  writeFileSync(join(home, "installs.json"), JSON.stringify(list.map(([repo, agent]) => ({ repo, agent, hooks: 6, ts: "2026-09-30T00:00:00Z" }))));

test("repositories are found two levels down, past hidden folders, node_modules and symlinks", () => {
  state();
  const root = tree("one", "group/two", "group/deep/three", ".hidden/four", "node_modules/five", "one/inside");
  // A symlink out of the folder, to a repository elsewhere.
  const outside = tree("linked");
  symlinkSync(join(outside, "linked"), join(root, "link"));
  // A worktree or submodule has a .git file, and is a repository too.
  mkdirSync(join(root, "worktree"));
  writeFileSync(join(root, "worktree", ".git"), "gitdir: /elsewhere\n");

  const { repos, stopped } = findRepos([root]);
  expect(repos).toEqual([join(root, "group/two"), join(root, "one"), join(root, "worktree")]);
  expect(stopped).toBe(false);
});

test("the search stops at its limit and says so", () => {
  state();
  const root = tree("a", "b", "c", "d/e");
  // Nearer ones first, so the limit cuts the deepest.
  expect(findRepos([root], { depth: 2, repos: 3, ms: 5000 })).toEqual({ repos: ["a", "b", "c"].map((r) => join(root, r)), stopped: true });
  expect(findRepos([root], { depth: 2, repos: 4, ms: 5000 }).stopped).toBe(false);
  expect(findRepos([root], { depth: 2, repos: 10, ms: -1 })).toEqual({ repos: [], stopped: true });
});

test("it looks beside the repositories ANVC knows, and in folders the person adds", () => {
  state();
  const gits = tree("known", "other");
  const code = tree("mine");
  expect(searchFolders([join(gits, "known")])).toEqual([gits]);
  // The filesystem root is never searched whole.
  expect(searchFolders(["/srv"])).toEqual([]);
  expect(addFolder(`${code}/`)).toBe(code);
  expect(() => addFolder("relative/path")).toThrow("full path");
  expect(() => addFolder(join(code, "nowhere"))).toThrow("There's no folder");
  expect(searchFolders([join(gits, "known")])).toEqual([code, gits]);
  expect(foundView([join(gits, "known")], true).found.map((f) => f.repo)).toEqual([join(code, "mine"), join(gits, "other")].sort());
});

test("what a repository needs follows how ANVC is installed", () => {
  const home = state();
  const gits = tree("known", "set-up", "bare");
  const known = [join(gits, "known")];
  const byRepo = () => Object.fromEntries(foundView(known, true).found.map((f) => [f.repo.slice(gits.length + 1), f.state]));

  // One project at a time: setup where it hasn't run, a switch where it has.
  installs(home, [[join(gits, "known"), "codex"], [join(gits, "set-up"), "codex"]]);
  expect(byRepo()).toEqual({ "set-up": "project", bare: "none" });
  const view = foundView(known, true);
  expect(view.everywhere).toEqual([]);
  expect(view.agents).toEqual(["Codex"]);
  expect(view.found.find((f) => f.state === "none")!.command).toBe(`bun run setup --repo ${shellWord(join(gits, "bare"))} --agent codex --no-remote --no-instructions`);

  // For every project, with setup --global: every one is covered.
  installs(home, [["*", "codex"]]);
  expect(byRepo()).toEqual({ "set-up": "everywhere", bare: "everywhere" });
  expect(foundView(known, true).everywhere).toEqual(["Codex"]);

  // Or with the Claude Code plugin enabled for the person.
  installs(home, []);
  mkdirSync(join(home, "claude"), { recursive: true });
  writeFileSync(join(home, "claude", "settings.json"), JSON.stringify({ enabledPlugins: { "anvc@anvc": true } }));
  expect(byRepo()).toEqual({ "set-up": "everywhere", bare: "everywhere" });
  expect(foundView(known, true).everywhere).toEqual(["Claude Code"]);

  // With no setup script on disk, as in the desktop app, the page shows the commands.
  writeFileSync(join(home, "claude", "settings.json"), "{}");
  installs(home, [[join(gits, "known"), "cursor"]]);
  const desktop = foundView(known, false);
  expect(desktop.setup).toBe(false);
  expect(desktop.commands.everywhere).toBe("bun run setup --global --agent cursor");
  expect(desktop.commands.remove).toBe(`${anvcCommand()} uninstall --everywhere`);
});

test("switching a found repository keeps it off the list of folders ANVC has run in", () => {
  state();
  const gits = tree("found");
  const repo = join(gits, "found");
  setFolder(repo, false, false);
  expect(folderOn(repo)).toBe(false);
  expect(folders()).toEqual([]);
  expect(foundView([join(gits, "elsewhere")], true).found).toMatchObject([{ repo, on: false }]);
  // Once switched from where ANVC runs, it's listed.
  setFolder(repo, true);
  expect(folders()).toMatchObject([{ repo, on: true }]);
});
