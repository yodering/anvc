#!/usr/bin/env bun
/**
 * anvc — checkpoint records from the command line.
 *
 *   anvc init [--repo .] [--remote origin]
 *   anvc ingest [--repo .] [--capture ~/.anvc/capture]
 *   anvc why <path> | anvc tried <text> | anvc failed [text]
 *   anvc red-to-green | anvc abandoned <path> | anvc session <run_id>
 *   anvc overlap | anvc stats
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { backfill, sessionFiles, transcriptDir } from "./backfill";
import { keepSession, keptRoot, keptSessions } from "./keep";
import { ingest, readCapture } from "./ingest";
import { scrub } from "./scrub";
import { cmdWord, flag as argFlag, has as argHas, positionals, shellWord } from "./args";
import { configureRemote, git, gitOrNull, readRefs, unconfigureRemote } from "./git";
import { abandonedTouching, failed, forRepo, overlap, redToGreen, retirements, session, summary, tried, why, type Hit } from "./query";
import { personDecide } from "./retire";
import { findRecordRef, GOAL_STATUSES, moveRecord, readRecords, RETIRE_REASONS, TIER_PREFIX, ULID, type GoalStatus, type ResultStatus } from "./record";
import { kb, tierFacts, waitingShared } from "./tiers";
import { captureFiles, repoKey, stateRoot, uiToken } from "./rawlog";
import { openDesktop, openWorkLog, PORTS } from "./open";
import { desktopCommand, installDesktop } from "./desktop";
import { searchRaw, searchRecords } from "./search";
import { exportDays } from "./export";
import { installPrePush, prePush, prePushOn, removePrePush, scanRecords } from "./prepush";
import { addInstructions, INSTRUCTION_LINES, instructionsFile, instructionsOn, removeInstructions } from "./instructions";
import { brief, briefText } from "./brief";
import { splitLine, whyLine } from "./blame";
import { checkPrivateRemote, privateRemote, sync } from "./sync";
import { catchUp, earlierSessions } from "./catchup";
import { anvcCommand, autoUpdate, checkForUpdate, codexDir, managedBy, setUpdateMode, updateMode, cursorDir, installLauncher, launcherOnPath, update, updateLine } from "./version";
import { allActivity, plural, readActivity, repoRoot } from "./activity";
import { folders, setFolder } from "./folders";
import { isLocalOnly, LOCAL_ONLY_REFUSAL, setLocalOnly } from "./localonly";
import { checkResult, DATA_MODES, dataMode, describe, listResults, recordStatus, setDataMode, whence, type DataMode } from "./results";
import { absorb, ABSORB_MODES, absorbMode, setAbsorbMode, type AbsorbMode } from "./absorb";
import { checkDocument, describeRow } from "./check";
import { addGoal, allGoals, answerGoal, approvalOn, changeGoal, GOAL_LABELS, goalLines, goalTree, setApproval } from "./goals";
import { mainStep } from "./runs";
import { trackRun } from "./runlog";
import { uninstall, uninstallEverywhere } from "./uninstall";
import { removeCommand, restoreCommand } from "./remove";
import { clearProjectAssist, LEVELS, MOMENTS, readAssist, readEverywhere, writeAssist, type Level, type Moment } from "./assist";
import { helped } from "./helped";
import { exportPolicy, FIELDS, importPolicy, PRESETS, readPolicy, writeDefaults, writePolicy, type Choice, type RetireMode } from "./policy";
import { compactOptions, options, optionsText } from "./options";
import { ruleCommand } from "./rules";
import { currentNotes, inventory, toolsText, writeNote } from "./tools";
import { sourcesSection, sourceTool } from "./sources";
import { statusCommand } from "./status";

const argv = process.argv.slice(2);
const command = argv[0] ?? "help";
const flag = (name: string, fallback: string) => argFlag(argv, name, fallback);
const has = (name: string) => argHas(argv, name);
const repo = resolve(flag("repo", process.cwd()));
// Everything after the subcommand that is not a flag: the search term.
const positional = positionals(argv).slice(1);

/** What a tool that takes no search term looks at, for `anvc activity`. */
const LOOKED_AT: Record<string, string> = { anvc_dead_ends: "open dead ends", anvc_failed: "failed attempts", anvc_red_to_green: "attempts that turned tests green" };

function show(hits: Hit[]) {
  if (!hits.length) { console.log("no records"); return; }
  for (const h of hits) {
    const mark = `${h.status === "abandoned" ? "✗ abandoned" : "✓ kept"}${h.retired ? `  · retired (${h.retired})` : ""}`;
    console.log(`\n${mark}  ${h.ts}  ${h.agent}  ${h.anchor}`);
    console.log(`  intent: ${h.intent.replace(/\s+/g, " ").slice(0, 160)}`);
    if (h.files.length) console.log(`  files:  ${h.files.slice(0, 6).join(", ")}${h.files.length > 6 ? ` (+${h.files.length - 6})` : ""}`);
    for (const error of h.errors.slice(0, 2)) console.log(`  error:  ${error.slice(0, 140)}`);
  }
  console.log();
}

const withIndex = forRepo(repo);

/** Says what went wrong, and sets the exit code to 1. */
function fail(error: unknown): void {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

/**
 * The project a setting is saved for: this repository's root, or null with
 * --everywhere or outside a repository. A bare repository has no working
 * folder, and still holds records.
 */
function settingFor(): string | null {
  if (has("everywhere")) return null;
  const top = gitOrNull(repo, ["rev-parse", "--show-toplevel"]) || (gitOrNull(repo, ["rev-parse", "--git-dir"]) ? repo : null);
  return top ? repoRoot(top) ?? top : null;
}

switch (command) {
  case "on":
  case "off": {
    const top = gitOrNull(repo, ["rev-parse", "--show-toplevel"]);
    if (!top) { console.error(`${repo} is not in a git repository.`); process.exit(1); }
    const home = repoRoot(top) ?? top;
    setFolder(home, command === "on");
    console.log(command === "on"
      ? `ANVC is on for ${home}.`
      : `ANVC is off for ${home}. Nothing is saved there or shown to agents until you turn it on.`);
    break;
  }
  case "options": {
    // Setup starts here, in the plugin, so this is where the anvc command is
    // put on the PATH, and the commands below can use it.
    installLauncher();
    const o = options(settingFor(), process.cwd());
    console.log(has("json") ? JSON.stringify(compactOptions(o, anvcCommand(), o.repo ? earlierSessions(o.repo) : 0)) : optionsText(o));
    break;
  }
  case "data": {
    const target = settingFor();
    const want = positional[0];
    if (want !== undefined) {
      if (!(want in DATA_MODES)) { console.error(`usage: anvc data [${Object.keys(DATA_MODES).join("|")}] [--everywhere]`); process.exitCode = 2; break; }
      if (!has("everywhere") && !target) { console.error(`${repo} is not in a git repository; use --everywhere for every project.`); process.exitCode = 1; break; }
      setDataMode(target, want as DataMode);
    }
    const now = target ? dataMode(target) : { mode: dataMode(repo).mode, from: "everywhere" as const };
    console.log(`Keeping track of results${target ? "" : " in every project"}: ${DATA_MODES[now.mode].label}${now.from === "default" ? " (nothing chosen yet)" : now.from === "everywhere" && target ? " (the choice for every project)" : ""}\n  ${DATA_MODES[now.mode].what}`);
    break;
  }
  case "absorb": {
    const want = positional[0];
    if (want === "run") {
      const done = absorb(gitOrNull(repo, ["rev-parse", "--show-toplevel"]) ?? repo);
      console.log(done ? `Updated ${done.written} goal${done.written === 1 ? "" : "s"} and rule sets from the sessions, with ${done.tokens.toLocaleString("en")} tokens.` : "Nothing to update: it's off, nothing is new, or an update is already running.");
      break;
    }
    const target = settingFor();
    if (want !== undefined) {
      if (!(want in ABSORB_MODES)) { console.error(`usage: anvc absorb [${Object.keys(ABSORB_MODES).join("|")}|run] [--everywhere]`); process.exitCode = 2; break; }
      if (!has("everywhere") && !target) { console.error(`${repo} is not in a git repository; use --everywhere for every project.`); process.exitCode = 1; break; }
      setAbsorbMode(target, want as AbsorbMode);
    }
    const now = target ? absorbMode(target) : { mode: absorbMode(null).mode, from: "everywhere" as const };
    console.log(`Goals, writing rules and map from your sessions${target ? "" : " in every project"}: ${ABSORB_MODES[now.mode].label}${now.from === "default" ? " (nothing chosen yet)" : now.from === "everywhere" && target ? " (the choice for every project)" : ""}\n  ${ABSORB_MODES[now.mode].what}`);
    break;
  }
  case "results": {
    const every = listResults(repo);
    const all = every.filter((r) => (!flag("status", "") || r.status === flag("status", "")) && (!flag("part", "") || r.part === flag("part", "")));
    if (!all.length) { console.log("No results recorded here yet."); break; }
    for (const r of all) console.log(`${describe(r, checkResult(repo, r, every), every)}\n`);
    break;
  }
  case "uninstall": {
    // What setup added to this project, or for every project, undone;
    // records and AGENTS.md lines stay unless asked for.
    const everywhere = has("everywhere");
    const dry = everywhere && has("dry-run");
    const done = everywhere ? uninstallEverywhere({ dry, records: has("records") }) : uninstall(repo, { records: has("records"), instructions: has("instructions") });
    console.log(!everywhere ? `ANVC removed from ${gitOrNull(repo, ["rev-parse", "--show-toplevel"]) ?? repo}.\n`
      : !done.removed.length ? "ANVC isn't installed for every project here, so nothing was changed.\n"
      : dry ? "Nothing was changed. anvc uninstall --everywhere would remove:\n" : "ANVC removed from every project.\n");
    for (const line of done.removed) console.log(`  ${dry ? "-" : "✓"} ${line}`);
    for (const line of done.kept) console.log(`  · kept: ${line}`);
    if (everywhere && !dry && done.removed.length) console.log("\nStart a new agent session for this to take effect.");
    break;
  }
  case "remove": process.exitCode = removeCommand(repo, argv); break;
  // `--setup <file>` reads the file as the flag's value; either order works.
  case "restore": process.exitCode = restoreCommand(repo, argv, positional[0] ?? argFlag(argv, "setup")); break;
  case "run": {
    // Everything after "run" (and an optional "--") is the command. One
    // argument is taken as a shell line, so "python a.py > out.log" keeps its
    // redirect; several are quoted back into one, for the shell trackRun uses.
    const rest = argv.slice(1)[0] === "--" ? argv.slice(2) : argv.slice(1);
    if (!rest.length) { console.error('usage: anvc run -- <command>, or anvc run "<command with > redirects>"'); process.exitCode = 2; break; }
    const line = rest.length === 1 ? rest[0]! : rest.map(process.platform === "win32" ? cmdWord : shellWord).join(" ");
    const run = await trackRun(line);
    if (run.logged) console.error(`anvc: logged this run${run.files.length ? `, and ${run.files.slice(0, 3).join(", ")}${run.files.length > 3 ? ` and ${run.files.length - 3} more` : ""}` : ""}`);
    process.exitCode = run.code;
    break;
  }
  case "check": {
    const file = positional[0];
    if (!file || !existsSync(file)) { console.error("usage: anvc check <a document, such as README.md or paper.tex>"); process.exitCode = 2; break; }
    const rows = checkDocument(repo, resolve(file));
    const places = (state?: string) => rows.filter((r) => !state || r.state === state).reduce((n, r) => n + r.lines.length, 0);
    const parts = [["changed", "changed since"], ["missing", "not found"], ["unsure", "unsure"], ["found", "found"]].filter(([s]) => places(s)).map(([s, label]) => `${places(s)} ${label}`);
    console.log(`${file}: ${places()} numbers. ${parts.join(", ")}.\n`);
    const mark = { changed: "⚠", unsure: "~", missing: "?", found: "✓" } as const;
    const order = { changed: 0, missing: 1, unsure: 2, found: 3 } as const;
    const width = Math.max(...rows.map((r) => r.text.length), 4);
    for (const r of [...rows].sort((a, b) => order[a.state] - order[b.state] || a.lines[0]! - b.lines[0]!)) {
      const where = `${r.lines.length > 1 ? "lines" : "line"} ${r.lines.slice(0, 3).join(", ")}${r.lines.length > 3 ? " …" : ""}`;
      console.log(`${mark[r.state]} ${r.text.padEnd(width)}  ${where.padEnd(18)} ${describeRow(r)}`);
    }
    if (places("missing") || places("unsure")) console.log(`\nFor a number worked out by hand, ask your agent to record it as a result with what it was computed from.`);
    break;
  }
  case "whence": {
    const text = positional.join(" ").trim();
    if (!text) { console.error("usage: anvc whence <a number as written, or a result's name>"); process.exitCode = 2; break; }
    const found = whence(repo, text);
    const all = listResults(repo);
    for (const r of found.results) console.log(`${describe(r, checkResult(repo, r, all), all)}\n`);
    if (found.files.length) {
      console.log("In files commands wrote:");
      for (const f of found.files) console.log(`  ${f.path} → ${f.key} = ${f.found}${f.changed ? "  (the file changed since)" : ""}\n      written by ${f.command}  (${f.ts.slice(0, 16)})`);
    }
    if (found.outputs.length) {
      console.log("Printed by, oldest first:");
      for (const o of found.outputs) console.log(`  ${o.ts.slice(0, 16)}  ${mainStep(o.command).slice(0, 160)}\n      ${o.line}`);
    }
    if (found.elsewhere.length) {
      console.log("In other files:");
      for (const f of found.elsewhere) console.log(`  ${f.path} → ${f.key} = ${f.found}\n      last changed ${f.modified.slice(0, 16)}${f.before ? `, before ${f.before.command} finished` : ""}${f.commit ? `; in commit ${f.commit}` : ""}`);
    }
    if (found.reads.length) {
      console.log("Repeated by:");
      for (const o of found.reads) console.log(`  ${o.ts.slice(0, 16)}  ${o.command.slice(0, 160)}\n      ${o.line}`);
    }
    if (!found.results.length && !found.outputs.length && !found.reads.length && !found.files.length && !found.elsewhere.length) console.log(`Nothing recorded holds "${text}", and no command in this repository's log printed it.`);
    break;
  }
  case "result": {
    const [verb, id] = positional;
    const status = ({ lock: "locked", unlock: "current", current: "current", invalid: "invalid", draft: "draft", superseded: "superseded" } as Record<string, ResultStatus>)[verb ?? ""];
    if (!status || !id) {
      console.error("usage: anvc result lock|unlock|current|invalid|draft|superseded <id> [--why \"...\"]");
      process.exitCode = 2;
      break;
    }
    try {
      recordStatus(repo, id, status, flag("why", ""), { kind: "person" });
      const view = listResults(repo).find((r) => r.id === id)!;
      console.log(`${view.name} = ${view.value} is now ${view.status}.`);
    } catch (error) { fail(error); }
    break;
  }
  case "goals": {
    const tree = goalTree(repo);
    const lines = goalLines(tree, { dropped: true });
    console.log(lines.length ? lines.join("\n") : 'No goals yet. Add one with: anvc goal add "<title>"');
    if (allGoals(tree).some((g) => g.proposal)) console.log("\nTo answer a proposal: anvc goal accept <id>, or anvc goal decline <id>");
    break;
  }
  case "goal": {
    const [first, second] = positional;
    try {
      if (first === "add" && second) {
        const parent = flag("parent", "") || undefined;
        const id = addGoal(repo, { title: positional.slice(1).join(" "), parent, why: flag("why", "") }, { kind: "person" });
        console.log(`Added ${parent ? "sub-goal" : "goal"} ${id}.`);
      } else if ((first === "accept" || first === "decline") && second) {
        const goal = answerGoal(repo, second, first === "accept", flag("why", ""));
        console.log(`${first === "accept" ? "Accepted" : "Declined"}. ${goal.title} is ${GOAL_LABELS[goal.status]}.`);
      } else if (first && GOAL_STATUSES.includes(second as GoalStatus)) {
        const goal = changeGoal(repo, first, { status: second as GoalStatus, why: flag("why", "") }, { kind: "person" });
        console.log(`${goal.title} is now ${GOAL_LABELS[goal.status]}.`);
      } else {
        console.error(`usage: anvc goal add "<title>" [--parent <id>]\n       anvc goal <id> <${GOAL_STATUSES.join("|")}> [--why "..."]\n       anvc goal accept|decline <id> [--why "..."]`);
        process.exitCode = 2;
      }
    } catch (error) { fail(error); }
    break;
  }
  case "approve-goals": {
    const want = positional[0];
    if (want === "on" || want === "off") setApproval(repo, want === "on");
    else if (want !== undefined) { console.error("usage: anvc approve-goals [on|off]"); process.exitCode = 2; break; }
    console.log(approvalOn(repo)
      ? "Goals an agent adds or changes wait until you accept them: anvc goal accept <id>, or on the Project page."
      : "An agent's goal changes apply at once. To make them wait for you: anvc approve-goals on");
    break;
  }
  case "tools": {
    const root = repoRoot(repo) ?? repo;
    const found = inventory(gitOrNull(repo, ["rev-parse", "--show-toplevel"]) || null, root);
    const notes = gitOrNull(repo, ["rev-parse", "--git-dir"]) ? currentNotes(root) : [];
    console.log(has("json") ? JSON.stringify({ agents: found, notes }, null, 2) : toolsText(found, notes) || "No agent here has any tools set up.");
    break;
  }
  case "tool": {
    const [verb, name, ...words] = positional;
    if (verb !== "note" || !name || !words.length) {
      console.error('usage: anvc tool note <name> "<when to use it>"');
      process.exitCode = 2;
      break;
    }
    try {
      const done = writeNote(repoRoot(repo) ?? repo, name, words.join(" "), { kind: "person" });
      console.log(`${done.replaced ? "Replaced" : "Saved"} the note for ${name}. Agents here are told it when a session starts.`);
    } catch (error) { fail(error); }
    break;
  }
  case "rules":
  case "rule":
    process.exitCode = ruleCommand(repo, command, positional, argv);
    break;
  case "status":
    process.exitCode = statusCommand(repo, positional, argv);
    break;
  case "assist": {
    const target = settingFor();
    if (!has("everywhere") && !target) { console.error(`${repo} is not in a git repository; use --everywhere for every project.`); process.exitCode = 1; break; }
    const [what, moment, state] = positional;
    try {
      if (what && what in LEVELS) writeAssist(target, { level: what as Level });
      else if (what === "set" && moment && (state === "on" || state === "off")) writeAssist(target, { moment: moment as Moment, on: state === "on" });
      else if (what === "default" && target) clearProjectAssist(target);
      else if (what) {
        console.error(`usage: anvc assist [${Object.keys(LEVELS).join("|")}] [--everywhere]
       anvc assist set <${Object.keys(MOMENTS).join("|")}> on|off [--everywhere]
       anvc assist default          this project follows the choice for every project`);
        process.exitCode = 2;
        break;
      }
    } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 2; break; }
    const now = target ? readAssist(target) : readEverywhere();
    const whose = target === null ? "every project" : now.from === "project" ? "this project" : now.from === "everywhere" ? "this project, from the choice for every project" : "this project (nothing chosen yet)";
    console.log(`What ANVC does on its own in ${whose}: ${LEVELS[now.level].label}${Object.entries(now.moments).some(([k, v]) => LEVELS[now.level].moments[k as Moment] !== v) ? ", changed" : ""}`);
    for (const [key, meta] of Object.entries(MOMENTS)) console.log(`  ${now.moments[key as Moment] ? "on " : "off"}  ${meta.label.padEnd(18)} ${meta.what}`);
    break;
  }
  case "local": {
    const top = gitOrNull(repo, ["rev-parse", "--show-toplevel"]) ?? repo;
    const want = positional[0];
    if (has("everywhere") && (want === "on" || want === "off")) {
      writeDefaults({ localOnly: want === "on" });
      console.log(`Local only is ${want} for every project that hasn't chosen for itself.${want === "on" ? " Every record ANVC writes in them is private." : ""}`);
    } else if (want === "on") {
      const { unset } = setLocalOnly(top, true);
      console.log(`Local only is on for ${top}.
  Every record ANVC writes here is private and stays on this computer.
  git push and git fetch no longer carry records${unset ? ` (${unset} remote setting${unset === 1 ? "" : "s"} removed)` : ""}.
  Records already on a remote stay there; anvc tiers lists what is where.`);
    } else if (want === "off") {
      setLocalOnly(top, false);
      console.log(`Local only is off for ${top}. Nothing was sent.
  Records written while it was on stay private. New records follow your settings.
  To share records with git push again, run: anvc init --repo ${top}`);
    } else if (want === undefined) {
      console.log(isLocalOnly(top)
        ? "Local only is on: everything ANVC keeps here stays on this computer. Turn it off: anvc local off"
        : "Local only is off: records follow your settings, and travel with git push once anvc init has run. Turn it on: anvc local on");
    } else {
      console.error("usage: anvc local [on|off] [--everywhere]");
      process.exitCode = 2;
    }
    break;
  }
  case "push-check": {
    const want = positional[0];
    if (want === "on") {
      try { console.log(`${installPrePush(repo)}. Each push now says what it shares, and stops if a record holds a secret.`); }
      catch (error) { console.error(`✗ ${(error as Error).message}`); process.exitCode = 1; }
    } else if (want === "off") {
      const gone = removePrePush(repo);
      console.log(gone ? `Removed ${gone}.` : "There's no push check here; nothing to do.");
    } else if (want === undefined) {
      console.log(`The push check is ${prePushOn(repo) ? "on" : "off"}. Change it: anvc push-check on|off`);
    } else {
      console.error("usage: anvc push-check [on|off]");
      process.exitCode = 2;
    }
    break;
  }
  case "instructions": {
    const want = positional[0];
    if (want === "on") {
      const done = addInstructions(repo);
      console.log(!done ? `There's no AGENTS.md or CLAUDE.md here, and none was created. Add these lines to your agent's instructions:\n\n${INSTRUCTION_LINES.map((l) => `  ${l}`).join("\n")}`
        : done.added ? `Added the lines to ${done.file}. The project commits this file, so commit the change.`
        : `${done.file} already tells your agent to record its work.`);
    } else if (want === "off") {
      const file = removeInstructions(repo);
      console.log(file ? `Removed the lines from ${file}. The project commits this file, so commit the change.` : "No ANVC lines in AGENTS.md or CLAUDE.md; nothing to do.");
    } else if (want === undefined) {
      const file = instructionsFile(repo);
      console.log(file ? `${basename(file)} ${instructionsOn(repo) ? "asks" : "doesn't ask"} your agent to record its work. Change it: anvc instructions on|off` : "There's no AGENTS.md or CLAUDE.md here.");
    } else {
      console.error("usage: anvc instructions [on|off]");
      process.exitCode = 2;
    }
    break;
  }
  case "folders": {
    const list = folders();
    if (!list.length) { console.log("ANVC hasn't run in any folder yet."); break; }
    for (const f of list) console.log(`${f.on ? "on " : "off"}  ${f.repo}   (last used ${f.seen.slice(0, 10)})`);
    break;
  }
  case "open": {
    // Only --no-browser prints the token: /anvc:open runs this in an agent's
    // session, and what it prints goes into the transcript.
    try {
      if (has("desktop")) { console.log(`Opened the desktop app on ${openDesktop(repo)}.`); break; }
      const o = await openWorkLog(repo, { browser: !has("no-browser"), ports: flag("port", PORTS), restart: has("restart") });
      if (has("no-browser")) console.log(`The work log for ${o.repo}: ${o.url}/?t=${uiToken()}`);
      else if (o.browser) console.log(`Opened the work log for ${o.repo} at ${o.url}.`);
      else console.log(`The work log for ${o.repo} is on ${o.url}. There's no display here to open it on; with --no-browser, this prints a link that signs in.`);
    } catch (error) { fail(error); }
    break;
  }
  case "init": {
    const remote = flag("remote", "origin");
    if (has("off")) {
      console.log(unconfigureRemote(repo, remote)
        ? `${remote}: records no longer travel with git push and git fetch. Records already pushed stay on ${remote}.`
        : `${remote} doesn't carry records; nothing to do`);
      break;
    }
    if (isLocalOnly(repo)) { console.error(`✗ ${LOCAL_ONLY_REFUSAL}`); process.exitCode = 1; break; }
    const { added, removed } = configureRemote(repo, remote);
    if (removed) console.log(`${remote}: git push now sends the current branch, not every local branch`);
    console.log(added
      ? `configured ${remote}: ${added} refspec(s) added; records now travel with git push and git fetch`
      : `${remote} already carries records; nothing to do`);
    // Turning this on was silent about what it sends, and the next push sent
    // every shared record made before it: 89 in one project.
    const waiting = waitingShared(repo).length;
    if (waiting) console.log(`Your next git push to ${remote} sends ${waiting} shared record${waiting === 1 ? "" : "s"}, with their goals, reasons, commands and file paths. To see them, or keep some here: ${anvcCommand()} review`);
    break;
  }
  case "desktop": {
    if (argv[1] === undefined) {
      const app = desktopCommand();
      console.log(app ? `The desktop app is installed: ${app.join(" ")}` : "The desktop app isn't installed. `anvc desktop install` installs it from the latest release.");
      break;
    }
    if (argv[1] !== "install") { console.error("usage: anvc desktop [install]"); process.exitCode = 2; break; }
    try { console.log(await installDesktop()); } catch (error) { fail(error); }
    break;
  }
  /**
   * Read the session history Claude Code already kept, and say what is in it.
   *
   * Prints by default and writes nothing. Importing months of someone's
   * sessions into a log that travels with the repository is not a thing to do
   * because a command was run with no flag, so `--write` is required and the
   * dry run is what you get otherwise.
   */
  case "backfill": {
    const root = flag("transcripts", "") || undefined;
    const since = flag("since", "") || undefined;
    const result = backfill(repo, { root, since, scrub });
    if (!result.events.length) {
      console.log(`No Claude Code, Codex or Cursor sessions found for ${repo}.`);
      console.log(`Looked in ${transcriptDir(repo, root)}, ${join(codexDir(), "sessions")} and ${join(cursorDir(), "projects")}`);
      break;
    }
    const commands = result.events.filter((e) => e.tool === "Bash").length;
    const errored = result.events.filter((e) => e.ok === false).length;
    const prompts = result.events.filter((e) => e.prompt).length;
    console.log(`${result.events.length} events from ${result.files} transcript${result.files === 1 ? "" : "s"}, ${result.sessions} session${result.sessions === 1 ? "" : "s"}`);
    console.log(`  ${result.from?.slice(0, 10)} to ${result.to?.slice(0, 10)}`);
    const byAgent = new Map<string, number>();
    for (const e of result.events) byAgent.set(e.agent ?? "claude-code", (byAgent.get(e.agent ?? "claude-code") ?? 0) + 1);
    console.log(`  ${[...byAgent].map(([a, n]) => `${a} ${n}`).join(" · ")}`);
    console.log(`  ${prompts} prompts · ${commands} commands · ${errored} of them failed`);

    if (!has("write")) {
      console.log("\nNothing written. Pass --write to turn these into records.");
      break;
    }
    const written = ingest(repo, result.events);
    console.log(`\nwrote ${written.written} private records (${written.skipped} already present)`);
    if (written.written) console.log(`They stay on this machine. To share one: anvc share <id>`);
    if (written.failed.length) {
      console.error(`${written.failed.length} record(s) could not be written:`);
      for (const f of written.failed) console.error(`  ${f}`);
      process.exitCode = 1;
    }
    break;
  }

  case "catch-up": {
    const root = repoRoot(repo) ?? repo;
    const done = catchUp(root);
    console.log(done.sessions
      ? `${plural(done.sessions, "past session")}: ${plural(done.written, "private record")} written${done.skipped ? `, ${done.skipped} already here` : ""}, ${plural(done.kept, "session")} copied.`
      : "No earlier Claude Code, Codex or Cursor sessions found for this repository.");
    for (const f of done.failed) console.error(`  couldn't write: ${f}`);
    if (done.failed.length) process.exitCode = 1;
    if (done.files.length) {
      console.log(`\nThese files hold numbers:\n${done.files.map((f) => `  ${f}`).join("\n")}`);
      console.log(`\nTo keep where the ones you rely on came from, tell your agent: "record the results in these files with anvc_result".`);
    }
    break;
  }

  /**
   * The private copies of this repository's sessions. The stop hook keeps
   * them as it goes; --keep copies the ones already on disk, so sessions from
   * before anvc was installed stop counting down to deletion too.
   */
  case "sessions": {
    const root = repoRoot(repo) ?? repo;
    if (has("keep")) {
      if (readPolicy(root).fields.transcripts === "off") {
        console.log("Session copies are off in this project's settings. Nothing was copied.");
        break;
      }
      let copied = 0;
      for (const s of sessionFiles(root)) if (keepSession(root, s.agent, s.session, s.path, { force: true })) copied++;
      console.log(`kept ${copied} session${copied === 1 ? "" : "s"}`);
    }
    const kept = keptSessions(root);
    const onDisk = sessionFiles(root);
    const keptIds = new Set(kept.map((k) => k.session));
    const missing = onDisk.filter((s) => !keptIds.has(s.session)).length;
    const byAgent = new Map<string, number>();
    for (const k of kept) byAgent.set(k.agent, (byAgent.get(k.agent) ?? 0) + 1);
    console.log(`${kept.length} session${kept.length === 1 ? "" : "s"} kept${kept.length ? ` (${kb(kept.reduce((n, k) => n + k.bytes, 0))})` : ""}${
      byAgent.size ? `: ${[...byAgent].map(([a, n]) => `${a} ${n}`).join(" · ")}` : ""}`);
    console.log(`  in ${keptRoot()}`);
    if (missing) console.log(`${missing} more on disk that anvc has no copy of. anvc sessions --keep copies them.`);
    break;
  }

  case "ingest": {
    const dir = resolve(flag("capture", join(homedir(), ".anvc", "capture")));
    const events = captureFiles(null, dir).flatMap((f) => readCapture(f));
    const result = ingest(repo, events);
    console.log(`ingested ${result.written} records from ${events.length} capture events (${result.skipped} already present)`);
    // A lost record is not the same as an already-present one, and used to be
    // reported as if it were.
    if (result.failed.length) {
      console.error(`\n${result.failed.length} record(s) could not be written:`);
      for (const f of result.failed) console.error(`  ${f}`);
      process.exitCode = 1;
    }
    break;
  }
  case "why": {
    const at = splitLine(positional[0] ?? "");
    if (!at) { show(withIndex((db) => why(db, positional[0] ?? ""))); break; }
    const w = withIndex((db) => whyLine(db, repo, at.path, at.line));
    console.log(w.commit
      ? `${at.path}:${at.line}  last changed by ${w.commit.oid.slice(0, 10)}  ${w.commit.date.slice(0, 10)}  ${w.commit.subject}`
      : `${at.path}:${at.line}  not committed yet`);
    show(w.attempts);
    break;
  }
  case "tried": show(withIndex((db) => tried(db, positional.join(" ")))); break;
  /**
   * Every depth of every record, and the private raw log. The same search the
   * agent runs with anvc_search.
   */
  case "search": {
    const query = positional.join(" ");
    if (!query.trim()) { console.error("usage: anvc search <words, an error message or a date such as 2026-10-07>"); process.exitCode = 2; break; }
    const records = withIndex((db) => searchRecords(db, query, 10));
    const raw = searchRaw(repoRoot(repo) ?? repo, query, 8);
    const kept = sourcesSection(repoRoot(repo) ?? repo, query);
    if (!records.length && !raw.length && !kept) { console.log(`Nothing matched "${query}".`); break; }
    for (const h of records) {
      console.log(`\n${h.status === "abandoned" ? "✗ abandoned" : "✓ kept"}  ${h.ts.slice(0, 10)}  ${h.intent.replace(/\s+/g, " ").slice(0, 100) || "(captured, no goal)"}`);
      console.log(`  matched in: ${h.matched.join(", ") || "record"}${h.tier === "private" ? " · private" : ""}${h.retired ? ` · retired (${h.retired})` : ""}   id ${h.id}`);
      if (h.errors[0]) console.log(`  error: ${h.errors[0].slice(0, 140)}`);
    }
    if (raw.length) console.log(`\nraw log (private)`);
    for (const r of raw) {
      console.log(`  ${r.ts.slice(0, 10)}  ${r.ok === false ? "✗" : " "} ${r.command ? `$ ${r.command.split("\n")[0]!.slice(0, 80)}` : ""}`);
      if (r.line && r.line !== r.command) console.log(`      ${r.line.slice(0, 140)}${r.more ? `   (${r.more + 1}×)` : ""}`);
    }
    if (kept) console.log(`\n${kept}`);
    console.log();
    break;
  }
  // The pages, searches and documents agents read here; with a source's id, its kept text.
  case "sources": console.log(sourceTool(repoRoot(repo) ?? repo, { query: positional.join(" "), limit: 20 })); break;
  case "failed": show(withIndex((db) => failed(db, positional.length ? positional.join(" ") : null))); break;
  case "red-to-green": show(withIndex((db) => redToGreen(db))); break;
  case "abandoned": show(withIndex((db) => abandonedTouching(db, positional[0] ?? ""))); break;
  case "session": show(withIndex((db) => session(db, positional[0] ?? ""))); break;
  case "overlap": {
    const o = withIndex((db) => overlap(db));
    console.log(`session pairs: ${o.pairs}, overlapping: ${o.overlapping}, ratio: ${(o.ratio * 100).toFixed(0)}%`);
    break;
  }
  /**
   * What anvc holds here and who can see it. The first thing to run before
   * trusting it with real work.
   */
  case "tiers": {
    const f = tierFacts(repo);
    console.log(`private — on this machine only, never pushed`);
    console.log(`  ${f.private.records} record${f.private.records === 1 ? "" : "s"}`);
    console.log(`  ${f.private.captured.events} captured events (${kb(f.private.captured.bytes)}): every command, its output, every file touched`);
    console.log(`  ${f.private.transcripts.files} session cop${f.private.transcripts.files === 1 ? "y" : "ies"} (${kb(f.private.transcripts.bytes)}), kept after the agent deletes its own`);
    console.log(`  ${f.private.metrics} injection log rows`);
    console.log(`\nshared — travels with git push`);
    console.log(`  ${f.shared.records} record${f.shared.records === 1 ? "" : "s"}: ${f.shared.pushed} already pushed, ${f.shared.waiting} waiting for your next push`);
    if (f.shared.fromTeammates) console.log(`  ${f.shared.fromTeammates} from teammates`);
    // The same check the pre-push hook runs, for anyone who never installed it.
    const { found } = scanRecords(repo, readRefs(repo, TIER_PREFIX.shared).map((r) => r.oid));
    console.log(found.length
      ? `  ${found.length} hold what looks like a secret: ${found.map((x) => `${x.id} (${x.kind} in ${x.field})`).join(", ")}. anvc unshare ${found.map((x) => x.id).join(" ")}`
      : `  no secrets found in them`);
    console.log(`\nnew records go to: ${f.default}${f.default === "shared" ? "   (anvc policy tier private to change)" : ""}`);
    if (!f.pushConfigured) {
      console.log(`\ngit push will not carry shared records here yet. Run: ${anvcCommand()} init --repo ${shellWord(repo)}`);
    }
    break;
  }

  /**
   * Deletes a private record for good. A shared one is refused: it travels
   * with push, so it is made private first, deliberately.
   */
  case "forget": {
    if (!positional.length) { console.error("usage: anvc forget <id> [...]"); process.exitCode = 2; break; }
    for (const id of positional) {
      const refs = readRecords(repo, [...readRefs(repo, TIER_PREFIX.shared), ...readRefs(repo, TIER_PREFIX.private)])
        .filter(([ref, r]) => r.id === id || ref === id).map(([ref]) => ref);
      if (!refs.length) { console.error(`no record ${id}`); process.exitCode = 1; continue; }
      if (refs.some((ref) => ref.startsWith(TIER_PREFIX.shared))) {
        console.error(`${id} is shared. Make it private first, so forgetting it is a choice: anvc unshare ${id}`);
        process.exitCode = 1;
        continue;
      }
      for (const ref of refs) git(repo, ["update-ref", "-d", ref]);
      console.log(`forgot ${id}`);
    }
    break;
  }

  /**
   * The consent step before records leave: each shared record waiting for the
   * next push, one at a time. Enter keeps it shared, p makes it private, f
   * makes it private and deletes it.
   */
  case "review": {
    const waiting = readRecords(repo, waitingShared(repo));
    if (!waiting.length) { console.log("Nothing is waiting to be shared."); break; }
    const interactive = process.stdin.isTTY;
    console.log(`${waiting.length} record${waiting.length === 1 ? "" : "s"} will be shared on your next push.${interactive ? " Enter keeps one shared, p makes it private, f deletes it, q stops." : ""}\n`);
    let i = 0;
    for (const [ref, r] of waiting) {
      i++;
      console.log(`${i}/${waiting.length}  ${r.outcome.status === "abandoned" ? "✗ abandoned" : "✓ kept"}  ${r.ts.slice(0, 10)}  ${(r.intent.goal ?? "(captured, no goal)").slice(0, 100)}`);
      if (r.intent.why) console.log(`       ${r.intent.why.replace(/\s+/g, " ").slice(0, 140)}`);
      if (!interactive) continue;
      const answer = (prompt("  [enter/p/f/q]") ?? "").trim().toLowerCase();
      if (answer === "q") break;
      if (answer === "p" || answer === "f") {
        const moved = moveRecord(repo, ref, "private");
        if (answer === "f") git(repo, ["update-ref", "-d", moved.ref]);
        console.log(`  ${answer === "f" ? "deleted" : "private"}`);
      }
    }
    if (!interactive) console.log(`\nTo keep one here: anvc unshare <id>. To delete one: anvc unshare <id>, then anvc forget <id>.`);
    break;
  }

  /**
   * Moving a record between tiers is a person's decision. The agent can write
   * a record private, but it has no tool to publish one.
   */
  case "share":
  case "unshare": {
    const to = command === "share" ? "shared" : "private";
    let targets = positional;
    // Records scraped before scraped records defaulted to private are sitting
    // in the shared tier. `--captured` finds them all at once.
    if (command === "unshare" && has("captured")) {
      targets = readRecords(repo)
        .filter(([ref, r]) => ref.startsWith("refs/anvc/") && typeof r.intent.goal !== "string")
        .map(([ref]) => ref);
      if (!targets.length) { console.log("No captured records in the shared tier."); break; }
    }
    if (!targets.length) {
      console.error(`usage: anvc ${command} <id|ref> [...]${command === "unshare" ? "   or: anvc unshare --captured" : ""}`);
      process.exitCode = 2;
      break;
    }
    let stillRemote = 0;
    for (const target of targets) {
      const ref = findRecordRef(repo, target, to === "shared" ? "private" : "shared") ?? findRecordRef(repo, target);
      if (!ref) { console.error(`no record ${target}`); process.exitCode = 1; continue; }
      try {
        const moved = moveRecord(repo, ref, to);
        if (moved.pushed) stillRemote++;
        console.log(`${ref} -> ${moved.ref}`);
      } catch (error) {
        console.error(`${target}: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
      }
    }
    if (to === "shared") console.log(`\nShared on your next git push.`);
    if (stillRemote) {
      // Moving a ref here cannot take back a copy a remote already has, and
      // saying nothing would let "unshare" sound like "unpublish".
      console.log(`\n${stillRemote} of these had already been pushed. The remote still has them.`);
      console.log(`To delete them there too: git push ${tierFacts(repo).remote ?? "origin"} --delete <ref> for each old ref above.`);
    }
    break;
  }

  /**
   * What this project saves, and who can read each part. The terminal
   * version of the settings page, for people who never open the page.
   */
  case "policy": {
    const [verb, a, b] = positional;
    const current = readPolicy(repo);
    const { chosen: _chosen, ...policy } = current;
    try {
      if (verb === "preset") {
        if (!a || !PRESETS[a]) { console.error(`presets: ${Object.keys(PRESETS).join(", ")}`); process.exitCode = 2; break; }
        if (has("everywhere")) {
          writeDefaults({ preset: a });
          console.log(`${PRESETS[a]!.label}, for every project that hasn't chosen for itself\n  ${PRESETS[a]!.what}`);
          break;
        }
        writePolicy(repo, { preset: a, ...structuredClone(PRESETS[a]!.policy) });
      } else if (verb === "set") {
        if (!a || !(a in FIELDS) || !b) { console.error(`usage: anvc policy set <field> <off|private|shared>\nfields: ${Object.keys(FIELDS).join(", ")}`); process.exitCode = 2; break; }
        writePolicy(repo, { ...policy, fields: { ...policy.fields, [a]: b as Choice } });
      } else if (verb === "retire") {
        writePolicy(repo, { ...policy, retire: a as RetireMode });
      } else if (verb === "tier") {
        writePolicy(repo, { ...policy, tier: a === "private" ? "private" : "shared" });
      } else if (verb === "import") {
        writePolicy(repo, importPolicy(a ?? ""));
      } else if (verb === "export") {
        console.log(exportPolicy(policy));
        break;
      } else if (verb) {
        console.error("usage: anvc policy [preset <name> | set <field> <choice> | retire <auto|ask|off> | tier <private|shared> | export | import <line>]");
        process.exitCode = 2;
        break;
      }
    } catch (error) { fail(error); break; }
    const p = readPolicy(repo);
    console.log(`${PRESETS[p.preset]?.label ?? p.preset}${p.chosen ? "" : "   (the default: nothing chosen yet)"}`);
    for (const group of ["raw", "record"] as const) {
      console.log(group === "raw" ? "\nraw log — never shared" : "\nin a record");
      for (const [k, f] of Object.entries(FIELDS).filter(([, f]) => f.group === group)) {
        console.log(`  ${k.padEnd(17)} ${p.fields[k as keyof typeof FIELDS].padEnd(8)} ${f.what}`);
      }
    }
    console.log(`\nnew agent records: ${p.tier}`);
    console.log(`retirement:        ${p.retire}${p.retire === "auto" ? " (the agent retires records with evidence)" : p.retire === "ask" ? " (the agent proposes; you approve)" : " (no retirements)"}`);
    console.log(`\nas one line: ${exportPolicy(p)}`);
    break;
  }

  /**
   * Retirement, decided by the person. An agent proposes with anvc_retire;
   * this is where the proposal is answered, and where anything retired can be
   * brought back.
   */
  case "retire": {
    const [verb, id] = positional;
    const note = flag("note", "");
    const reason = flag("reason", "");
    const decide = (decision: "retire" | "decline" | "restore", target: string) => {
      const r = withIndex((db) => personDecide(db, repo, target, decision, note || undefined, reason || undefined));
      console.log(`${decision === "retire" ? "Retired" : decision === "decline" ? "Kept" : "Restored"} ${target}  (${r.tier})`);
    };
    try {
      if (verb === "approve" && id) decide("retire", id);
      else if (verb === "decline" && id) decide("decline", id);
      else if (verb === "restore" && id) decide("restore", id);
      else if (verb && verb !== "list" && ULID.test(verb)) {
        if (!reason && !note) { console.error(`say why: anvc retire ${verb} --reason <${Object.keys(RETIRE_REASONS).join("|")}> --note "what you saw"`); process.exitCode = 2; break; }
        decide("retire", verb);
      } else if (verb && verb !== "list") {
        console.error("usage: anvc retire [list] | approve <id> | decline <id> | restore <id> | <id> --reason <reason> --note <text>");
        process.exitCode = 2;
        break;
      }
    } catch (error) { fail(error); break; }
    if (verb && verb !== "list") break;
    withIndex((db) => {
      const { pending, retired } = retirements(db);
      const mode = readPolicy(repo).retire;
      console.log(`retirement: ${mode}`);
      if (!pending.length && !retired.length) { console.log("\nNothing proposed, nothing retired."); return; }
      if (pending.length) {
        console.log(`\nwaiting for you (${pending.length})`);
        for (const p of pending) {
          console.log(`  ${p.target}  ${p.targetIntent.slice(0, 90)}`);
          console.log(`    ${p.reason}: ${p.evidence.replace(/\s+/g, " ").slice(0, 200)}`);
          console.log(`    anvc retire approve ${p.target}   ·   anvc retire decline ${p.target}`);
        }
      }
      if (retired.length) {
        console.log(`\nretired (${retired.length})`);
        for (const r of retired) {
          console.log(`  ${r.target}  ${r.targetIntent.slice(0, 90)}`);
          console.log(`    ${r.reason}: ${r.evidence.replace(/\s+/g, " ").slice(0, 200)}   ·   anvc retire restore ${r.target}`);
        }
      }
    });
    break;
  }

  /** What the pre-push hook runs: git passes the refs being pushed on stdin, and the remote's name and URL as arguments. */
  case "pre-push": {
    const input = await Bun.stdin.text();
    const { ok, message } = prePush(repo, input.split("\n").filter(Boolean), positional[0]);
    if (message) console.error(message);
    process.exitCode = ok ? 0 : 1;
    break;
  }

  /**
   * What happened since you last looked: since the last brief here, or the
   * last two weeks, or --since a date.
   */
  case "brief": {
    const root = repoRoot(repo) ?? repo;
    const marker = join(stateRoot(), `brief-${repoKey(root)}`);
    let since = flag("since", "");
    if (!since) { try { since = readFileSync(marker, "utf8").trim(); } catch { /* first brief here */ } }
    if (!since) since = new Date(Date.now() - 14 * 86_400_000).toISOString();
    else if (/^\d{4}-\d{2}-\d{2}$/.test(since)) since = `${since}T00:00:00.000Z`;
    console.log(withIndex((db) => briefText(brief(db, repo, since))));
    try { mkdirSync(dirname(marker), { recursive: true }); writeFileSync(marker, new Date().toISOString()); } catch { /* shown again next time */ }
    break;
  }

  /**
   * Private records, the raw log and the session copies, synced through a
   * remote only you can read. --remote names it the first time.
   */
  case "sync": {
    const named = flag("remote", "");
    const remote = named || privateRemote(repo);
    if (!remote) {
      console.error("Name a remote only you can read, dedicated to this project:\n  git remote add mine <url of a private repository>\n  anvc sync --remote mine");
      process.exitCode = 2;
      break;
    }
    if (isLocalOnly(repo)) { console.error(`✗ ${LOCAL_ONLY_REFUSAL}. Nothing was sent.`); process.exitCode = 1; break; }
    const check = checkPrivateRemote(repo, remote);
    if (!check.ok) { console.error(`✗ ${check.reason}. Nothing was sent.`); process.exitCode = 1; break; }
    if (named) git(repo, ["config", "anvc.privateRemote", remote]);
    const r = sync(repo, repoRoot(repo) ?? repo, remote);
    console.log(`synced with ${remote}${r.written ? `: ${r.written} file${r.written === 1 ? "" : "s"} from your other machines` : ""}`);
    for (const e of r.errors) console.error(`  ${e}`);
    if (r.errors.length) process.exitCode = 1;
    break;
  }

  /**
   * Brings anvc up to date: a clone is pulled and set up again wherever it
   * was set up, and the Claude Code plugin is updated through Claude Code.
   * --check only asks whether a clone has one ready.
   */
  /**
   * Records as dated Markdown pages: printed, or written one file a day into
   * --out. Private records only with --private.
   */
  case "export": {
    const root = repoRoot(repo) ?? repo;
    const dates = positional.filter((p) => /^\d{4}-\d{2}(-\d{2})?$/.test(p));
    if (dates.length !== positional.length) { console.error("usage: anvc export [2026-10-07 | 2026-10 ...] [--out FOLDER] [--private]"); process.exitCode = 2; break; }
    const { days, leftOut } = exportDays(root, { dates, private: has("private") });
    const skipped = leftOut ? `${leftOut} private record${leftOut === 1 ? " was" : "s were"} left out. Add --private to include ${leftOut === 1 ? "it" : "them"}.` : null;
    if (!days.length) { console.log(["Nothing recorded then.", skipped].filter(Boolean).join(" ")); break; }
    const out = flag("out", "");
    if (!out) console.log(days.map((d) => d.page).join("\n"));
    else {
      mkdirSync(resolve(out), { recursive: true });
      for (const d of days) writeFileSync(join(resolve(out), `${d.day}.md`), d.page);
      console.log(`Wrote ${days.length} page${days.length === 1 ? "" : "s"} to ${out}: ${days.map((d) => `${d.day}.md`).join(", ")}`);
    }
    if (skipped) console.error(skipped);
    break;
  }
  case "updates": {
    const mode = argv[1];
    if (mode !== undefined && mode !== "auto" && mode !== "ask") { console.error("usage: anvc updates [auto|ask]"); process.exitCode = 2; break; }
    if (mode === undefined) {
      console.log(`Updates: ${updateMode() === "auto" ? "automatic, two days after a release comes out unless a newer one follows" : "ANVC asks first"}. To change it: anvc updates auto|ask`
        + (managedBy() === "plugin" ? "" : `\nThis copy of ANVC is a ${managedBy() === "git" ? "git clone" : "desktop app"}, which doesn't update itself. The setting is for the Claude Code plugin.`));
      break;
    }
    setUpdateMode(mode);
    console.log(mode === "auto" ? "ANVC installs a release by itself once it's been out two days with nothing newer." : "ANVC asks before it installs a release.");
    break;
  }
  case "update": {
    if (has("check")) {
      const s = autoUpdate(checkForUpdate());
      console.log(s.error ? `Couldn't check: ${s.error}.` : s.behind ? `${s.behind} update${s.behind === 1 ? "" : "s"} ready:\n${s.changes.map((c) => `  ${c}`).join("\n")}` : updateLine(s) ?? "anvc is up to date.");
      break;
    }
    const result = update();
    (result.ok ? console.log : console.error)(result.lines.join("\n"));
    if (!result.ok) process.exitCode = 1;
    break;
  }

  case "activity": {
    const rows = readActivity({ repo: repoRoot(repo) ?? repo });
    const limit = Number(flag("limit", "30"));
    if (!rows.length) { console.log("Nothing yet. anvc logs here once hooks and the MCP server run in a session."); break; }
    for (const r of rows.slice(-limit)) {
      const when = r.ts.slice(5, 16).replace("T", " ");
      const what = r.kind === "searched" ? r.query
        ? `"${r.query}" → ${r.hits ?? 0} hit${r.hits === 1 ? "" : "s"}`
        // A tool that takes no search term: say what it looked at.
        : `${LOOKED_AT[r.via ?? ""] ?? (r.via ?? "records").replace(/^anvc_/, "").replace(/_/g, " ")} → ${r.hits ?? 0} found`
        : r.kind === "recorded" ? `${r.outcome} · ${r.tier} · ${r.titles?.[0] ?? ""}`
          : r.kind === "feedback" ? `${r.verdict} on ${r.records?.[0] ?? ""}`
            : r.kind === "retired" ? `${r.outcome} ${r.records?.[0] ?? ""} (${r.verdict})`
            : r.titles?.length ? r.titles.slice(0, 2).map((t) => `"${t.slice(0, 50)}"`).join(", ")
              : `${r.records?.length ?? 0} record${r.records?.length === 1 ? "" : "s"}`;
      console.log(`${when}  ${r.kind.padEnd(9)}  ${what}${r.via ? `   (${r.via})` : ""}`);
    }
    break;
  }

  case "stats": {
    withIndex((db) => {
      // What anvc did, first: it is the question a person opening stats has.
      const h = helped(db, repo, allActivity(repoRoot(repo) ?? repo));
      console.log(`anvc here`);
      console.log(`  shown      ${String(h.shown).padStart(4)}   past attempts put in front of an agent`);
      console.log(`  opened     ${String(h.opened).padStart(4)}   records an agent asked for itself`);
      console.log(`  avoided    ${String(h.avoided).padStart(4)}   dead ends shown and not repeated that session (estimate)`);
      console.log(`  confirmed  ${String(h.confirmed).padStart(4)}   marked helpful`);
      console.log("");
      const s = summary(db, repo);
      const pct = (n: number) => s.records ? `${Math.round(100 * n / s.records)}%` : "0%";
      console.log(`records ${s.records} · sessions ${s.sessions} · distinct files ${s.files}`);
      console.log(`abandoned ${s.abandoned} (${pct(s.abandoned)})${
        s.dead_approaches ? `, ${s.dead_approaches} killing a whole approach` : ""}`);
      // A log where almost everything is a root has kept every what and lost
      // every why: nothing says which attempts were one effort.
      console.log(`serving a goal ${s.goals.serving} · unconnected ${s.goals.roots}`);
      // The claim no prose memory file can make at any price.
      if (s.stale !== null) {
        console.log(`records whose files moved since they were written: ${s.stale} (${pct(s.stale)})`);
      }
      console.log(`sessions touching the same file: ${s.overlap.overlapping} of ${s.overlap.pairs} pairs`);
      console.log(`private ${s.tiers.private} · shared ${s.tiers.shared}   (anvc tiers for what each holds)`);
    });
    break;
  }
  default:
    console.log(`anvc — checkpoint records
${launcherOnPath() ? "" : `\n  anvc isn't on your PATH, so run these as: ${anvcCommand()} <command>\n`}
  anvc options [--json]                    every setting, what it is now, and the command that changes it
  anvc on | off                            turn ANVC on or off in this repository
  anvc local [on|off]                      keep everything ANVC saves here on this computer (--everywhere for every project)
  anvc assist [auto|start|ask]             how much ANVC tells your agent on its own (--everywhere for every project)
  anvc data [off|results]                  keep track of the results a project relies on: on unless turned off (--everywhere for every project)
  anvc absorb [off|claude|codex|run]       keep goals, writing rules and the project map up to date from your sessions with a small model: off unless turned on (--everywhere for every project)
  anvc results [--status S] [--part P]     results, with their status and whether what they depend on changed
  anvc whence <number|name>                where a number came from
  anvc check <file>                        where each number in a document came from
  anvc uninstall [--records] [--instructions]  take ANVC out of this project
  anvc uninstall --everywhere [--dry-run]  take ANVC out of every project; --records deletes records too
  anvc remove [--remote NAME|all] [--yes]  back up, then delete this project's records here (and on a remote) and uninstall
  anvc restore [<file>] [--setup]          list this project's backups, or bring one back
  anvc run -- <command>                    run a command and keep it, so its numbers can be traced
  anvc result lock|unlock|invalid <id>     decide a result's status (--why "...")
  anvc status                              what's in progress, done recently and up next
  anvc status add "<title>" [--goal <id>]  add an item to Up next
  anvc status <id> <next|doing|done|dropped|up|down>  change an item's state, or move it in Up next (--title "...")
  anvc goals                               the project's goals and sub-goals, with their status
  anvc goal add "<title>" [--parent <id>]  add a goal, or a sub-goal of another
  anvc goal <id> <todo|doing|done|dropped> change a goal's status (--why "...")
  anvc goal accept|decline <id>            answer a goal change an agent proposed
  anvc approve-goals [on|off]              make an agent's goal changes wait for you to accept them
  anvc rules [--for <path|commit>]         the writing rules kept here, or the text of those covering a file or a commit
  anvc rule add|change|remove              add a rule set: anvc rule add "<name>" --applies "<glob>,<glob>" --from "<file>#<heading>"
  anvc tools [--json]                      each agent's MCP servers, plugins, skills and hooks, and the notes on them
  anvc tool note <name> "<when>"           note when to use a tool; agents are told at session start
  anvc folders                             every repository ANVC has run in, on or off
  anvc open [--desktop] [--no-browser] [--restart]  open this project's work log in the browser, or in the desktop app
  anvc init [--off] [--remote origin]      make records travel with push/fetch, or stop them
  anvc push-check [on|off]                 before each push, say what it shares and stop one holding a secret
  anvc instructions [on|off]               the lines in AGENTS.md or CLAUDE.md asking your agent to record its work
  anvc ingest [--repo .] [--capture DIR]   turn captured events into private records
  anvc why <path>[:line]                   intents that touched a file, or the attempts behind a line
  anvc tried <text>                        what was attempted for a goal
  anvc search <text>                       every record at every depth, and the raw log
  anvc sources [text|id]                   pages, searches and documents agents read; with an id, the text kept
  anvc desktop [install]                   whether the desktop app is installed; install downloads it from the latest release
  anvc failed [text]                       attempts that errored
  anvc red-to-green                        attempts that turned tests green
  anvc abandoned <path>                    abandoned work touching a file
  anvc session <run_id>                    one session in order
  anvc overlap                             file-read overlap between sessions
  anvc stats                               record counts
  anvc tiers                               counts per tier
  anvc activity [--limit N]                what anvc did, newest last
  anvc brief [--since YYYY-MM-DD]          what happened since you last looked
  anvc policy [preset|set|retire|export]   what this project saves, field by field
  anvc retire [list|approve|decline|restore <id>]   records taken out of what agents are shown
  anvc share <id> [...]                    share private records
  anvc review                              go through what the next push will share
  anvc forget <id> [...]                   delete private records for good
  anvc unshare <id> [...] | --captured     make records private
  anvc update [--check]                    bring this copy of anvc and its hooks up to date
  anvc export [DATE ...] [--out FOLDER]     records as Markdown, one page a day; --private adds private ones
  anvc updates [auto|ask]                  install releases by themselves two days after they come out, or ask first
  anvc sync [--remote NAME]                private history to and from your own remote
  anvc catch-up                            bring in what happened here before anvc was on
  anvc backfill [--write]                  import Claude Code, Codex and Cursor history as private records
  anvc sessions [--keep]                   private copies of this repository's sessions`);
}
