/**
 * Every setting a person can choose: what it is now, what we recommend, and
 * the command that sets it. `anvc options` prints this, and an agent reads it
 * to set ANVC up for someone.
 *
 * Choices and their descriptions come from the modules that own them, so this
 * list can't drift from what the settings do. A setting marked `asks` can send
 * something off this computer or changes a file the project commits, so an
 * agent asks the person before changing it.
 */
import { existsSync } from "node:fs";
import { basename } from "node:path";
import { AGENT_NAMES, AGENTS, installedAgents } from "./agents";
import { shellWord } from "./args";
import { DEFAULT_LEVEL, LEVELS, MOMENTS, readAssist, readEverywhere, type Moment } from "./assist";
import { folderOn } from "./folders";
import { approvalOn } from "./goals";
import { gitOrNull, recordsTravel } from "./git";
import { instructionsFile, instructionsOn } from "./instructions";
import { isLocalOnly, marker } from "./localonly";
import { DEFAULT_PRESET, PRESETS, readDefaults, readPolicy } from "./policy";
import { prePushOn } from "./prepush";
import { samePath } from "./rawlog";
import { DATA_MODES, DEFAULT_DATA_MODE, dataMode, everywhereDataMode } from "./results";
import { ABSORB_MODES, absorbMode, ABSORB_COST, DEFAULT_ABSORB_MODE } from "./absorb";
import { anvcCommand, GLOBAL, installs, managedBy, SETUP } from "./version";

type Value = string | string[] | null;

export interface Choice {
  value: string;
  label: string;
  what?: string;
  /** The command that sets this choice in this repository. Null when there's nothing to run. */
  set: string | null;
  /** The command that sets it for every project, where a setting has that. */
  setEverywhere?: string;
}

export interface Setting {
  key: string;
  name: string;
  what: string;
  /** In this repository; null outside one, or before anything is set up. */
  here: Value;
  /** For every project, where a setting has that. */
  everywhere?: Value;
  recommended: string | string[];
  /** Whether someone picked the value in effect; false while it's the default. */
  chosen: boolean;
  asks: boolean;
  /** The key of a setting that decides this one for now: local only makes every record private. */
  overriddenBy?: string;
  /** Several choices at once. */
  multiple?: boolean;
  choices: Choice[];
  /** Finer settings inside this one. A choice of the setting resets them. */
  parts?: Setting[];
}

export interface Options { about: string; repo: string | null; settings: Setting[] }

export const ABOUT = "ANVC keeps what coding agents tried and gave up on, and shows it to the next agent.";

/**
 * Setup's arguments for every project and nothing else: no remote, no
 * pre-push hook, no line in AGENTS.md. It's all the terminal onboarding runs
 * when the person leaves the rest to their agent.
 */
export const setupEverywhere = (agents: readonly string[]): string[] => ["--global", "--agent", agents.join(",")];

/**
 * The same for one project: its hooks, and nothing that reaches past this
 * computer or into a file the project commits. git push and the AGENTS.md
 * lines are settings of their own.
 */
export const setupProject = (repo: string, agents: readonly string[]): string[] =>
  ["--repo", repo, "--agent", agents.join(","), "--no-remote", "--no-instructions"];

const onOff = (on: boolean) => (on ? "on" : "off");
const ON_OFF = [["on", "On"], ["off", "Off"]] as const;

/**
 * `root` is the repository the settings are for, or null outside one. `cwd`
 * decides whether each command has to name it.
 */
export function options(root: string | null, cwd: string): Options {
  const repoFlag = root && samePath(root) !== samePath(cwd) ? ` --repo ${shellWord(root)}` : "";
  const cli = anvcCommand();
  const anvc = (args: string) => `${cli} ${args}${repoFlag}`;
  const scoped = (args: string) => ({ set: root ? anvc(args) : null, setEverywhere: anvc(`${args} --everywhere`) });
  const setup = existsSync(SETUP) ? (args: string) => `bun ${shellWord(SETUP)} ${args}` : null;
  // A bare repository has records but no working folder to set up.
  const work = root && gitOrNull(root, ["rev-parse", "--show-toplevel"]) ? root : null;
  const settings: Setting[] = [];

  if (setup) {
    const mine = installs().filter((i) => i.repo === GLOBAL || (root !== null && samePath(i.repo) === samePath(root)));
    const everywhere = [...new Set(mine.filter((i) => i.repo === GLOBAL).map((i) => i.agent))];
    const here = [...new Set(mine.map((i) => i.agent))];
    const where = everywhere.length ? "everywhere" : here.length ? "project" : null;
    // Once set up, what the person picked is what we recommend keeping.
    const recommended = here.length ? here : installedAgents();
    const agents = (recommended.length ? recommended : ["claude-code"]).join(",");
    const install = (list: string, to: string | null) =>
      setup((to === "project" && work ? setupProject(work, [list]) : setupEverywhere([list])).map(shellWord).join(" "));
    settings.push({
      key: "agents", name: "Agents", what: "The agents that get ANVC's hooks and tools.",
      here, everywhere, recommended: [...recommended], chosen: here.length > 0, asks: false, multiple: true,
      choices: AGENTS.map((a) => ({ value: a, label: AGENT_NAMES[a]!, set: install(a, where) })),
    });
    settings.push({
      key: "where", name: "Where", what: "Every project these agents open, or this one only.",
      here: where, recommended: where ?? "everywhere", chosen: where !== null, asks: false,
      choices: [
        { value: "everywhere", label: "Every project", set: install(agents, "everywhere") },
        ...(work ? [{ value: "project", label: "This project", set: install(agents, "project") }] : []),
      ],
    });
  }

  if (work) {
    settings.push({
      key: "folder", name: "ANVC here", what: "Off means nothing is saved here or shown to agents.",
      // Nothing marks a folder turned on, since that's how it starts.
      here: onOff(folderOn(work)), recommended: "on", chosen: !folderOn(work), asks: false,
      choices: ON_OFF.map(([value, label]) => ({ value, label, set: anvc(value) })),
    });
  }

  const assist = root ? readAssist(root) : null;
  const every = readEverywhere();
  const assistChosen = (assist ?? every).from !== "default";
  settings.push({
    key: "assist", name: "Your agent", what: "How much ANVC tells your agent without being asked.",
    here: assist?.level ?? null, everywhere: every.level, recommended: DEFAULT_LEVEL, chosen: assistChosen, asks: false,
    choices: Object.entries(LEVELS).map(([value, l]) => ({ value, label: l.label, what: l.what, ...scoped(`assist ${value}`) })),
    parts: (Object.keys(MOMENTS) as Moment[]).map((m) => ({
      key: m, name: MOMENTS[m].label, what: MOMENTS[m].what,
      here: assist ? onOff(assist.moments[m]) : null, everywhere: onOff(every.moments[m]),
      recommended: onOff(LEVELS[DEFAULT_LEVEL].moments[m]), chosen: assistChosen, asks: false,
      choices: ON_OFF.map(([value, label]) => ({ value, label, ...scoped(`assist set ${m} ${value}`) })),
    })),
  });

  const data = dataMode(root);
  settings.push({
    key: "results", name: "Results", what: "Whether ANVC keeps track of the numbers your project relies on.",
    here: root ? data.mode : null, everywhere: everywhereDataMode(), recommended: DEFAULT_DATA_MODE, chosen: data.from !== "default", asks: false,
    choices: Object.entries(DATA_MODES).map(([value, m]) => ({ value, label: m.label, what: m.what, ...scoped(`data ${value}`) })),
  });

  // It costs tokens on the person's plan, so an agent asks before turning it on.
  const absorbing = absorbMode(root);
  settings.push({
    key: "absorb", name: "Goals, writing rules and map from your sessions",
    what: `Whether a small model keeps the goals, sub-goals, writing rules and project map up to date from your sessions, for you to see. It runs outside the session, so it doesn't use your agent's context. ${ABSORB_COST}`,
    here: root ? absorbing.mode : null, everywhere: absorbMode(null).mode, recommended: DEFAULT_ABSORB_MODE, chosen: absorbing.from !== "default", asks: true,
    choices: Object.entries(ABSORB_MODES).map(([value, m]) => ({ value, label: m.label, what: m.what, ...scoped(`absorb ${value}`) })),
  });

  const defaults = readDefaults();
  const policy = root ? readPolicy(root) : null;
  const presetEverywhere = defaults.preset && Object.hasOwn(PRESETS, defaults.preset) ? defaults.preset : null;
  // Local only makes every record private, whatever these say.
  const local = root !== null && isLocalOnly(root);
  const overridden = local ? { overriddenBy: "local" } : {};
  settings.push({
    key: "sharing", name: "Sharing", what: "Who can read what ANVC saves, once records travel with git push.",
    here: policy?.preset ?? null, everywhere: presetEverywhere ?? DEFAULT_PRESET,
    recommended: DEFAULT_PRESET, chosen: policy?.chosen ?? presetEverywhere !== null, asks: true, ...overridden,
    choices: Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label, what: p.what, ...scoped(`policy preset ${value}`) })),
    ...(policy ? {
      parts: [{
        key: "tier", name: "New records", what: "Where a record goes when the agent doesn't say.",
        here: policy.tier, recommended: PRESETS[DEFAULT_PRESET]!.policy.tier, chosen: policy.chosen, asks: true, ...overridden,
        choices: [["shared", "Shared"], ["private", "Private"]].map(([value, label]) => ({ value: value!, label: label!, set: anvc(`policy tier ${value}`) })),
      }],
    } : {}),
  });

  const localMarked = root !== null && [marker(root), marker(root, "local-off")].some((p) => p !== null && existsSync(p));
  settings.push({
    key: "local", name: "Local only", what: "Keeps everything ANVC saves on this computer, whatever the other settings say.",
    here: root ? onOff(local) : null, everywhere: onOff(Boolean(defaults.localOnly)), recommended: "off",
    chosen: localMarked || defaults.localOnly !== undefined, asks: true,
    choices: ON_OFF.map(([value, label]) => ({ value, label, ...scoped(`local ${value}`) })),
  });

  // anvc init refuses while local only is on, and needs a remote to set up.
  // Each of these three is off until someone turns it on.
  if (root && !local) {
    const travels = recordsTravel(root);
    if (travels !== null) settings.push({
      key: "push", name: "git push", what: "Whether git push and fetch carry this project's shared records.",
      here: onOff(travels), recommended: "on", chosen: travels, asks: true,
      choices: [{ value: "on", label: "On", set: anvc("init") }, { value: "off", label: "Off", set: anvc("init --off") }],
    });
  }

  // Compiled into the desktop app, ANVC has no path on disk for a hook to run.
  if (work && managedBy() !== "desktop") {
    const on = prePushOn(work);
    settings.push({
      key: "prepush", name: "Push check", what: "Before each push, says what it shares and stops one that holds a secret.",
      here: onOff(on), recommended: "off", chosen: on, asks: true,
      choices: ON_OFF.map(([value, label]) => ({ value, label, set: anvc(`push-check ${value}`) })),
    });
  }
  const file = work && instructionsFile(work);
  if (work && file) {
    const on = instructionsOn(work);
    settings.push({
      key: "instructions", name: "Instructions",
      what: `Lines in ${basename(file)} asking your agent to check past dead ends and record its work. The project commits this file.`,
      here: onOff(on), recommended: "off", chosen: on, asks: true,
      choices: ON_OFF.map(([value, label]) => ({ value, label, set: anvc(`instructions ${value}`) })),
    });
  }
  if (root) {
    const on = approvalOn(root);
    settings.push({
      key: "approvegoals", name: "Approve goals", what: "When on, a goal an agent adds or changes waits until you accept it.",
      here: onOff(on), recommended: "off", chosen: on, asks: false,
      choices: ON_OFF.map(([value, label]) => ({ value, label, set: anvc(`approve-goals ${value}`) })),
    });
  }

  return {
    about: `${ABOUT} These are its settings, each with the command that changes it. A setting with "asks": true can send something off this computer or change a file the project commits, so ask the person before changing it.`,
    repo: root,
    settings,
  };
}

/**
 * A setting as `anvc options --json` gives it to an agent. The full list
 * repeated the command line's path in a command for every choice, here and
 * for every project: 24,070 characters in one project, about 6,000 tokens
 * of the agent's context. This keeps the values and one command per setting.
 */
export interface CompactSetting {
  key: string;
  name: string;
  /** Only on a setting that asks first, which the agent explains before the person decides. */
  what?: string;
  here: Value;
  everywhere?: Value;
  recommended: string | string[];
  chosen: boolean;
  asks?: true;
  overriddenBy?: string;
  multiple?: true;
  /** Each choice's value and label, or the values alone where the labels just repeat them. */
  choices: Record<string, string> | string[];
  /** The command, with <value> for a choice's value; or each choice's command, where they differ in more than that. */
  set: string | Record<string, string>;
  /** Each part's value in effect. `anvc options` describes them. */
  parts?: Record<string, Value>;
  /** The command that changes a part, with <part> and <value>. */
  setPart?: string;
}

export interface CompactOptions { about: string; cli: string; repo: string | null; earlier: number; settings: CompactSetting[] }

/**
 * The list an agent reads to set ANVC up. `cli` is the command its other
 * commands start with, and `earlier` the sessions from before ANVC was on
 * that catch-up imports.
 */
export function compactOptions(o: Options, cli: string, earlier: number): CompactOptions {
  return {
    about: `${ABOUT} To change a setting, run set with a choice's value for <value>, and --everywhere for every project where it says so. Ask the person before changing one with "asks": true.`,
    cli,
    repo: o.repo,
    earlier,
    settings: o.settings.map(compactSetting),
  };
}

/** One command for all of these, with each word that differs named in turn by `names`; null if they differ in more words. */
function pattern(choices: Choice[], names: string[]): string | null {
  const shared = template(choices.map((c) => c.set ?? c.setEverywhere ?? null));
  const differ = shared?.match(/<[^>]*>/g) ?? [];
  if (!shared || differ.length > names.length) return null;
  const at = names.slice(names.length - differ.length);
  let i = 0;
  const everywhere = choices.every((c) => c.set && c.setEverywhere) ? " [--everywhere]" : "";
  return `${shared.replace(/<[^>]*>/g, () => at[i++]!)}${everywhere}`;
}

function compactSetting(s: Setting): CompactSetting {
  const named = s.choices.some((c) => c.label.toLowerCase() !== c.value);
  const setPart = s.parts && pattern(s.parts.flatMap((p) => p.choices), ["<part>", "<value>"]);
  return {
    key: s.key, name: s.name, ...(s.asks ? { what: s.what } : {}),
    here: s.here, ...(s.everywhere !== undefined ? { everywhere: s.everywhere } : {}),
    recommended: s.recommended, chosen: s.chosen,
    ...(s.asks ? { asks: true as const } : {}), ...(s.overriddenBy ? { overriddenBy: s.overriddenBy } : {}), ...(s.multiple ? { multiple: true as const } : {}),
    choices: named ? Object.fromEntries(s.choices.map((c) => [c.value, c.label])) : s.choices.map((c) => c.value),
    set: pattern(s.choices, ["<value>"])
      ?? Object.fromEntries(s.choices.flatMap((c) => (c.set ?? c.setEverywhere ? [[c.value, (c.set ?? c.setEverywhere)!]] : []))),
    ...(s.parts ? { parts: Object.fromEntries(s.parts.map((p) => [p.key, p.here ?? p.everywhere ?? null])) } : {}),
    ...(setPart ? { setPart } : {}),
  };
}

/** The same, for a person to read. */
export function optionsText(o: Options): string {
  const out = [`${ABOUT} These are its settings for ${o.repo ?? "every project"}, with the command that changes each. Ask the person before changing one marked "ask first".`];
  if (!o.repo) out.push("This isn't a git repository, so settings for one project aren't listed.");
  const names = Object.fromEntries(o.settings.map((s) => [s.key, s.name]));
  for (const s of o.settings) out.push("", ...block(s, "", names));
  return out.join("\n");
}

function block(s: Setting, pad: string, names: Record<string, string>): string[] {
  const label = (v: Value) => v === null ? "not set up" : [v].flat().map((x) => s.choices.find((c) => c.value === x)?.label ?? x).join(", ") || "none";
  const now = s.here !== null ? label(s.here) + (s.everywhere !== undefined && String(s.everywhere) !== String(s.here) ? ` (every project: ${label(s.everywhere)})` : "")
    : s.everywhere !== undefined ? `${label(s.everywhere)} in every project` : "not set up";
  const over = s.overriddenBy ? ` (${names[s.overriddenBy] ?? s.overriddenBy} overrides this)` : "";
  const lines = [`${pad}${s.name}: ${now}${over}${s.asks ? "  · ask first" : ""}`, `${pad}  ${s.what}`];
  const recommended = [s.recommended].flat();
  const width = Math.max(...s.choices.map((c) => c.value.length));
  const named = s.choices.some((c) => c.label.toLowerCase() !== c.value);
  const labelWidth = named ? Math.max(...s.choices.map((c) => c.label.length)) : 0;
  for (const c of s.choices) {
    const rest = [named ? c.label.padEnd(labelWidth) : "", c.what ?? "", recommended.includes(c.value) ? "(recommended)" : ""].filter(Boolean).join("  ");
    lines.push(`${pad}    ${c.value.padEnd(width)}  ${rest}`.trimEnd());
  }
  lines.push(...change(s.choices, pad, s.multiple ? " (several with commas)" : ""));
  if (s.parts?.every((p) => p.choices.length === 2 && p.choices[0]!.value === "on")) {
    // On-or-off parts, one line each.
    const keys = Math.max(...s.parts.map((p) => p.key.length));
    lines.push(`${pad}  Moments:`);
    for (const p of s.parts) lines.push(`${pad}    ${String(p.here ?? p.everywhere).padEnd(3)}  ${p.key.padEnd(keys)}  ${p.what}`);
    lines.push(...change(s.parts.flatMap((p) => p.choices), `${pad}  `, ""));
  } else {
    for (const p of s.parts ?? []) lines.push(...block(p, `${pad}  `, names));
  }
  return lines;
}

/**
 * How to change a setting: one command with the choices in angle brackets
 * where they differ in one word each, else each choice's own command.
 */
function change(choices: Choice[], pad: string, note: string): string[] {
  const shared = template(choices.map((c) => c.set));
  if (shared) {
    const everywhere = choices.every((c) => c.setEverywhere) ? ", with --everywhere for every project" : "";
    return [`${pad}  Change: ${shared}${note}${everywhere}`];
  }
  const all = template(choices.map((c) => c.setEverywhere ?? null));
  return [
    ...choices.filter((c) => c.set).map((c) => `${pad}  ${c.label}: ${c.set}`),
    ...(all ? [`${pad}  For every project: ${all}`] : []),
  ];
}

/** The commands as one, with `<a|b>` wherever they differ; null unless they have the same shape. */
function template(commands: Array<string | null | undefined>): string | null {
  if (commands.length < 2 || commands.some((c) => !c)) return null;
  const words = commands.map((c) => c!.split(" "));
  if (words.some((w) => w.length !== words[0]!.length)) return null;
  return words[0]!.map((_, i) => {
    const seen = [...new Set(words.map((w) => w[i]!))];
    return seen.length === 1 ? seen[0] : `<${seen.join("|")}>`;
  }).join(" ");
}
