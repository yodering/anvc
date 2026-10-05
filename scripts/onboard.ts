#!/usr/bin/env bun
/**
 * Setting ANVC up in a terminal, by choosing rather than by flags.
 *
 *   bun run setup          (in a terminal, with no --agent)
 *
 * A handful of questions, each with its choices spelled out, then everything
 * is applied at once. Every part of ANVC that changes what an agent does or
 * what leaves the computer is asked here, so nothing is imposed: which
 * agents, every project or one, how much the agent is told on its own, who
 * can read what is saved, and whether ANVC may add a line to the project's
 * AGENTS.md. Each can be changed later in Settings, with anvc assist and
 * anvc local, or by running this again.
 *
 * Every question after the first has a Back choice, which asks the one
 * before it again, since a misclick used to mean starting over. The
 * repository is picked from the ones the person's agents worked in lately
 * and the ones in the folders where projects usually are.
 *
 * The first question offers to leave the rest to the person's agent. Then
 * only the hooks and the MCP server are installed, for every project, and the
 * agent goes through `anvc options` with them: /anvc:setup in Claude Code,
 * one pasted line anywhere else.
 *
 * Flags still work for scripts and for anyone who knows what they want:
 * bun run setup --help.
 */
import { autocomplete, cancel, intro, isCancel, log, multiselect, note, outro, path as askPath, select, spinner } from "@clack/prompts";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { basename, resolve } from "node:path";
import { AGENT_NAMES, AGENTS, installedAgents } from "../protocol/agents";
import { desktopCommand, installDesktop } from "../protocol/desktop";
import { shellWord } from "../protocol/args";
import { LEVELS, writeAssist, type Level } from "../protocol/assist";
import { gitOrNull } from "../protocol/git";
import { setLocalOnly } from "../protocol/localonly";
import { setupEverywhere } from "../protocol/options";
import { PRESETS, readPolicy, writeDefaults, writePolicy } from "../protocol/policy";
import { ago, candidates } from "../protocol/recent";
import { setDataMode, type DataMode } from "../protocol/results";
import { ABSORB_COST, ABSORB_MODES, setAbsorbMode, type AbsorbMode } from "../protocol/absorb";
import { samePath } from "../protocol/rawlog";
import { tilde } from "../protocol/tools";
import { anvcCommand } from "../protocol/version";

const here = resolve(import.meta.dir, "..");
const bold = (s: string) => `\x1b[1m${s}\x1b[22m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[22m`;

/** What a Back choice returns, so a step can go to the one before it. */
const BACK = "\u0000back" as const;
type Back = typeof BACK;
const back = { value: BACK, label: "Back", hint: "change your last answer" };

/** Stops cleanly on Ctrl-C or Esc at any question. */
function answer<T>(value: T): Exclude<T, symbol> {
  if (isCancel(value)) {
    cancel("Nothing was changed.");
    process.exit(0);
  }
  return value as Exclude<T, symbol>;
}

/** One of several choices, with Back after them unless it's the first question. */
async function choose<T>(message: string, options: Array<{ value: T; label: string; hint?: string }>, initialValue?: T, first = false): Promise<T | Back> {
  const all = (first ? options : [...options, back]) as Array<{ value: T | Back; label: string; hint?: string }>;
  return answer(await select<T | Back>({ message, options: all as Parameters<typeof select<T | Back>>[0]["options"], initialValue }));
}

/** Yes or no, as two choices and Back. */
const yesNo = (message: string, yes: string, no: string, initialValue: boolean) =>
  choose(message, [{ value: true, label: "Yes", hint: yes }, { value: false, label: "No", hint: no }], initialValue);

const is = <T>(v: T | Back): v is T => v !== BACK;

// ——— The answers, filled in step by step ———

type Agent = (typeof AGENTS)[number];
const installed: Agent[] = installedAgents();
const cwdRepo = gitOrNull(process.cwd(), ["rev-parse", "--show-toplevel"])?.trim();

let byAgent = false;
let agents: Agent[] = installed;
// Asked only when it isn't installed, and yes unless the person says no.
let desktop = !desktopCommand();
let everywhere = true;
let repo = "";
let level: Level = "auto";
let sharing = "team";
let results: DataMode = "results";
let absorbing: AbsorbMode = "off";
let instructions = false;
let remote = true;
let prePush = false;

const localOnly = () => sharing === "local";

/** The answers to who can read what's saved, each a preset but the last. */
const SHARING = {
  team: { label: "Your team", hint: "Recommended. Your team sees why each attempt ended. Your prompts and command output stay on this computer." },
  "private-repo": { label: "Only you", hint: "For a repository only you use. Records go with git push, so they follow you to your other computers." },
  minimal: { label: "Your team, with less saved", hint: "Each attempt keeps only its goal, outcome, reason and files." },
  local: { label: "Nobody else", hint: "Nothing ANVC saves leaves this computer." },
};
const agentsFile = () => (everywhere ? undefined : ["AGENTS.md", "CLAUDE.md"].find((f) => existsSync(resolve(repo, f))));

/** Picks a repository from recent and found ones, or any folder typed in. */
async function pickRepo(): Promise<string | Back> {
  const OTHER = "\u0000other";
  // Setup runs in ANVC's own clone, which is never the project.
  const found = candidates([here]);
  const offered = cwdRepo && samePath(cwdRepo) !== samePath(here) && !found.some((c) => c.repo === samePath(cwdRepo))
    ? [{ repo: samePath(cwdRepo), used: null, by: null, current: true }, ...found]
    : found;
  const chosen = answer(await autocomplete<string>({
    message: "Which repository? Type to search.",
    placeholder: "a folder's name",
    maxItems: 8,
    options: [
      ...offered.map((c) => ({
        value: c.repo,
        label: basename(c.repo),
        hint: `${tilde(c.repo)}${"current" in c ? " · this folder" : c.used && c.by ? ` · ${c.by}, ${ago(c.used)}` : ""}`,
      })),
      { value: OTHER, label: "Another folder", hint: "type its path" },
      { value: BACK, label: "Back", hint: "change your last answer" },
    ],
  }));
  if (chosen === BACK) return BACK;
  if (chosen !== OTHER) return chosen;
  const typed = answer(await askPath({
    message: "The repository's folder:",
    root: homedir(),
    directory: true,
    validate: (v) => (v && gitOrNull(resolve(v), ["rev-parse", "--git-dir"]) ? undefined : "That folder isn't in a git repository."),
  }));
  return gitOrNull(resolve(typed), ["rev-parse", "--show-toplevel"])?.trim() ?? resolve(typed);
}

type Step = { name: string; when?: () => boolean; ask: () => Promise<boolean> };

// Each step asks its question and returns false when Back was picked.
const steps: Step[] = [
  {
    name: "who",
    ask: async () => {
      const v = await choose("Go through the settings here, or let your agent do it?", [
        { value: false, label: "Here" },
        { value: true, label: "Let my agent do it", hint: "ANVC is installed now, and your agent goes through each setting with you in its next session" },
      ], byAgent, true);
      if (is(v)) byAgent = v;
      return is(v);
    },
  },
  {
    name: "agents",
    ask: async () => {
      const v = answer(await multiselect<Agent | Back>({
        message: "Which agents should use ANVC? Space picks one, Enter goes on.",
        options: [
          ...AGENTS.map((a) => ({ value: a, label: AGENT_NAMES[a], hint: installed.includes(a) ? "on this computer" : "not found on this computer" })),
          { value: BACK, label: "Back", hint: "pick this alone to change your last answer" },
        ],
        initialValues: agents,
        required: true,
      }));
      if (v.includes(BACK)) return false;
      agents = v as Agent[];
      return true;
    },
  },
  {
    name: "desktop",
    // It's another way to open the work log; nothing else needs it.
    when: () => !desktopCommand(),
    ask: async () => {
      const v = await yesNo("Install the desktop app?", "The work log in its own window. It opens in your browser too.", "Open the work log in your browser", desktop);
      if (is(v)) desktop = v;
      return is(v);
    },
  },
  {
    name: "where",
    when: () => !byAgent,
    ask: async () => {
      const v = await choose("Where should ANVC run?", [
        { value: true, label: "Every project", hint: "Recommended. It starts in any repository your agent opens." },
        { value: false, label: "One project", hint: "Only the repository you pick next" },
      ], everywhere);
      if (is(v)) everywhere = v;
      return is(v);
    },
  },
  {
    name: "repo",
    when: () => !byAgent && !everywhere,
    ask: async () => {
      const v = await pickRepo();
      if (is(v)) repo = v;
      return is(v);
    },
  },
  {
    name: "level",
    when: () => !byAgent,
    ask: async () => {
      const v = await choose("How much should ANVC tell your agent on its own?", (Object.keys(LEVELS) as Level[]).map((key) => ({
        value: key, label: LEVELS[key].label, hint: `${key === "auto" ? "Recommended. " : ""}${LEVELS[key].what}`,
      })), level);
      if (is(v)) level = v;
      return is(v);
    },
  },
  {
    name: "sharing",
    when: () => !byAgent,
    ask: async () => {
      const v = await choose("Who can read what ANVC saves?", (Object.keys(SHARING) as Array<keyof typeof SHARING>).map((value) => ({ value, ...SHARING[value] })), sharing);
      if (is(v)) sharing = v;
      return is(v);
    },
  },
  {
    name: "results",
    when: () => !byAgent,
    ask: async () => {
      const v = await choose("Keep track of the numbers your project reports?", [
        { value: "results" as DataMode, label: "Yes", hint: "Recommended for research. Each number keeps the file and command it came from, and ANVC says when its code changes." },
        { value: "off" as DataMode, label: "No", hint: "This project has no numbers to track." },
      ], results);
      if (is(v)) results = v;
      return is(v);
    },
  },
  {
    name: "absorb",
    when: () => !byAgent,
    // It spends tokens on the person's plan, so it's asked, and off unless they say yes.
    ask: async () => {
      const v = await choose("Keep your goals, writing rules and project map up to date from your sessions, with a small model?", [
        ...(Bun.which("claude") ? [{ value: "claude" as AbsorbMode, label: "Yes, with Claude Haiku", hint: `It runs through your claude command after a turn ends, outside the session. ${ABSORB_COST}` }] : []),
        ...(Bun.which("codex") ? [{ value: "codex" as AbsorbMode, label: "Yes, with Codex", hint: `It runs through your codex command after a turn ends, outside the session. ${ABSORB_COST}` }] : []),
        { value: "off" as AbsorbMode, label: "No", hint: "Goals, writing rules and the map change only when you or your agent change them." },
      ], absorbing);
      if (is(v)) absorbing = v;
      return is(v);
    },
  },
  {
    name: "instructions",
    // Only where it applies: every project has no one file to write to, and
    // the hooks already remind the three agents above.
    when: () => !byAgent && Boolean(agentsFile()),
    ask: async () => {
      const v = await yesNo(`Add one line to ${agentsFile()} asking your agent to record its work?`, "Your agent records its work without being reminded.", "Leave it as it is", instructions);
      if (is(v)) instructions = v;
      return is(v);
    },
  },
  {
    name: "remote",
    when: () => !byAgent && !everywhere && !localOnly(),
    ask: async () => {
      const v = await yesNo("Send records with git push, and get your team's with git fetch?", "Records travel with your code.", "They stay on this computer until you run anvc init.", remote);
      if (is(v)) remote = v;
      return is(v);
    },
  },
  {
    name: "prePush",
    when: () => !byAgent && !everywhere && !localOnly(),
    ask: async () => {
      const v = await yesNo("Check each push before it goes?", "Shows what the push shares, and stops it if a record holds a secret.", "Push as usual", prePush);
      if (is(v)) prePush = v;
      return is(v);
    },
  },
  {
    name: "confirm",
    ask: async () => {
      const names = agents.map((a) => AGENT_NAMES[a]).join(", ");
      // Plain text: colour codes inside a note throw off its width.
      note((byAgent ? [
        `Agents       ${names}`,
        "Where        every project",
        "The rest     your agent goes through it with you",
        ...(desktop ? ["Desktop app  install"] : []),
      ] : [
        `Agents       ${names}`,
        `Where        ${everywhere ? "every project" : tilde(repo)}`,
        `Your agent   ${LEVELS[level].label}`,
        `Readers      ${SHARING[sharing as keyof typeof SHARING].label}`,
        `Results      ${results === "results" ? "kept track of" : "off"}`,
        `Goals        ${absorbing === "off" ? "changed only by you or your agent" : `kept up to date by ${ABSORB_MODES[absorbing].label}`}`,
        ...(desktop ? ["Desktop app  install"] : []),
        ...(agentsFile() ? [`${agentsFile()!.padEnd(13)}${instructions ? "add one line" : "leave as it is"}`] : []),
        ...(!everywhere && !localOnly() ? [
          `git push     ${remote ? "carries records" : "leaves them here"}`,
          `Push check   ${prePush ? "on" : "off"}`,
        ] : []),
      ]).join("\n"), "Your choices");
      const v = await choose("Set it up?", [
        { value: "go", label: "Set it up" },
        { value: "quit", label: "Quit", hint: "nothing is changed" },
      ], "go");
      if (v === "quit") { cancel("Nothing was changed."); process.exit(0); }
      return is(v);
    },
  },
];

intro(bold(" anvc "));
note(
  "ANVC keeps what your coding agents tried, what they kept and what they\n"
  + "gave up on, in git next to your code. Before an agent tries something\n"
  + "that failed before, it's shown what happened.\n\n"
  + "A few questions. Pick Back on any of them to change your last answer.\n"
  + "Everything can be changed later.",
  "Setup",
);

// Back returns to the last step that was asked, skipping any that didn't apply.
const asked: number[] = [];
for (let i = 0; i < steps.length;) {
  const step = steps[i]!;
  if (step.when && !step.when()) { i++; continue; }
  if (await step.ask()) { asked.push(i); i++; } else { i = asked.pop() ?? 0; }
}

const preset = localOnly() ? "private-repo" : sharing;

/** Downloads and installs the desktop app for this computer. A failure is reported and setup carries on. */
async function installApp(): Promise<void> {
  if (!desktop) return;
  log.step("Downloading the desktop app from the latest release");
  try { log.success(await installDesktop()); }
  catch (error) { log.warn(`The desktop app wasn't installed. ${error instanceof Error ? error.message : error}`); }
}

const run = (args: string[]) => Bun.spawnSync(["bun", resolve(here, "scripts/setup.ts"), ...args], { stdout: "pipe", stderr: "pipe" });
const s = spinner();

/** Codex keeps MCP servers for every project, so its tools are added once, here. */
function addCodexTools(): void {
  if (!agents.includes("codex")) return;
  const add = ["codex", "mcp", "add", "anvc", "--env", "ANVC_AGENT=codex", "--", "bun", `${here}/protocol/mcp.ts`];
  const added = Bun.which("codex") ? Bun.spawnSync(add, { stdout: "pipe", stderr: "pipe" }).success : false;
  if (added) log.success("Codex: ANVC's tools added");
  else log.warn(`Codex: ANVC's tools weren't added. To add them, run: ${add.map(shellWord).join(" ")}`);
  log.info("Codex asks you to approve ANVC's hooks once: run /hooks in Codex.");
}

/** Hooks and the MCP server for every project, and nothing else. Exits if setup fails. */
function installEverywhere(): void {
  s.start("Installing for every project");
  const done = run(setupEverywhere(agents));
  if (!done.success) { s.stop("Setup failed"); log.error(done.stderr.toString().trim()); process.exit(1); }
  s.stop("Installed for every project");
  // The plugin is how Claude Code gets ANVC everywhere; install it now rather
  // than leave a command to paste.
  if (agents.includes("claude-code") && Bun.which("claude")) {
    s.start("Installing the Claude Code plugin");
    const market = Bun.spawnSync(["claude", "plugin", "marketplace", "add", "yodering/anvc"], { stdout: "pipe", stderr: "pipe" });
    const plugin = Bun.spawnSync(["claude", "plugin", "install", "anvc@anvc"], { stdout: "pipe", stderr: "pipe" });
    s.stop(market.success && plugin.success ? "Claude Code plugin installed" : "The plugin wasn't installed. In Claude Code, run /plugin install anvc@anvc");
  }
  addCodexTools();
}

if (byAgent) {
  installEverywhere();
  await installApp();
  const others = agents.filter((a) => a !== "claude-code").map((a) => AGENT_NAMES[a]);
  const lines = [
    ...(agents.includes("claude-code") ? [["In Claude Code", "/anvc:setup"]] : []),
    // Other agents get no slash command. The same import question and two
    // offers /anvc:setup ends with (scripts/build-plugin.ts).
    ...(others.length ? [[`In ${others.join(" or ")}`, `Set up ANVC for me: run \`${anvcCommand()} options\` and follow it. `
      + `Next, ask me in one short question whether to import this project's earlier sessions with \`${anvcCommand()} catch-up\`. `
      + "Then ask me before each of these: draft this project's goals and sub-goals from its README, docs and code, only ones those files support, "
      + "show me the list, and add the ones I agree to with anvc_goal; and add a rule set with anvc_rule for each kind of text the project already has rules for "
      + "(a heading in AGENTS.md or CLAUDE.md, CONTRIBUTING, a style guide), with source pointing at that file and heading."]] : []),
  ];
  const width = Math.max(...lines.map(([where]) => where!.length));
  outro([
    "Done. Start a new session in your agent, then:",
    "",
    ...lines.map(([where, what]) => `${dim(where!.padEnd(width))}   ${what}`),
  ].join("\n"));
  process.exit(0);
}

if (everywhere) {
  installEverywhere();
  writeAssist(null, { level });
  writeDefaults({ preset, localOnly: localOnly() });
  setDataMode(null, results);
  setAbsorbMode(null, absorbing);
} else {
  s.start(`Setting up ${tilde(repo)}`);
  for (const agent of agents) {
    const done = run(["--repo", repo, "--agent", agent,
      ...(instructions ? [] : ["--no-instructions"]), ...(remote && !localOnly() ? [] : ["--no-remote"]), ...(prePush ? ["--pre-push"] : [])]);
    if (!done.success) { s.stop("Setup failed"); log.error(done.stderr.toString().trim()); process.exit(1); }
  }
  writeAssist(repo, { level });
  setDataMode(repo, results);
  setAbsorbMode(repo, absorbing);
  writePolicy(repo, { ...readPolicy(repo), preset, ...structuredClone(PRESETS[preset]!.policy) });
  if (localOnly()) setLocalOnly(repo, true);
  s.stop(`Set up ${tilde(repo)}`);
  // Registered here, as setup would only print the command.
  if (agents.includes("claude-code") && Bun.which("claude")) {
    const server = JSON.stringify({ command: "bun", args: [`${here}/protocol/mcp.ts`], env: { ANVC_REPO: repo, ANVC_AGENT: "claude-code" } });
    const add = () => Bun.spawnSync(["claude", "mcp", "add-json", "anvc", server], { cwd: repo, stdout: "pipe", stderr: "pipe" });
    let added = add();
    // One from an earlier setup can name a clone that has moved or gone, so
    // it's replaced rather than kept.
    const again = !added.success && /already exists/i.test(`${added.stdout}${added.stderr}`);
    if (again) {
      Bun.spawnSync(["claude", "mcp", "remove", "anvc", "--scope", "local"], { cwd: repo, stdout: "pipe", stderr: "pipe" });
      added = add();
    }
    if (added.success) log.success(`Claude Code: ANVC's tools ${again ? "updated" : "added"} for this project`);
    else log.warn(`Claude Code: ANVC's tools weren't added. From ${tilde(repo)}, run: claude mcp add-json anvc '${server}'`);
  }
  addCodexTools();
}

await installApp();

const where = everywhere ? "" : ` --repo ${shellWord(repo)}`;
// The /anvc: commands come with the plugin, which only an install for every
// project adds. In one project, the agent opens the work log with anvc_open.
const open = everywhere && agents.includes("claude-code") ? "/anvc:open in Claude Code" : "ask your agent to open it";
outro([
  "Done. Start a new session in your agent so it loads ANVC.",
  "",
  `${dim("Open the work log")}   ${open}, or ${anvcCommand()} open${where}`,
  `${dim("Turn it off")}         ${anvcCommand()} off${everywhere ? " --repo <project>" : where}, in one project`,
  `${dim("Change a setting")}    bun run setup again, or Settings in the work log`,
].join("\n"));
