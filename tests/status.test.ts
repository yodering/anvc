/**
 * Status: what's in progress now, from the capture log and items marked
 * doing; what was done recently and where it stands, from kept attempts and
 * the commits after them; what's up next, from items that fold like goals.
 */
import { expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { addItem, changeItem, listItems, readStatus, statusBrief, statusText, taskGiven, type Status } from "../protocol/status";
import { addGoal } from "../protocol/goals";
import { tried, withIndex } from "../protocol/query";
import { appendRecord, validateRecord, type CheckpointRecord } from "../protocol/record";
import { captureRows } from "../protocol/rawlog";
import { writeAssist } from "../protocol/assist";
import { repoView } from "../server/api";
import { cli, context, fetched, git, gitRepo, rec, runHook, tmp, tool, writeCapture } from "./helpers";

const person = { kind: "person" as const };
const agent = (session: string) => ({ kind: "agent" as const, agent: "claude-code", session });
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const MIN = 60_000;

test("items fold like goals: the latest change wins, Up next keeps its order, and a fetched change can't touch a local item", () => {
  const repo = gitRepo({ commit: true });
  const a = addItem(repo, { title: "Tauri port" }, person);
  const b = addItem(repo, { title: "UI auth token" }, agent("s1"));
  const c = addItem(repo, { title: "README  pass\nfor 0.4" }, person);
  expect(c.title).toBe("README pass for 0.4");
  expect(readStatus(repo).next.map((i) => i.title)).toEqual(["Tauri port", "UI auth token", "README pass for 0.4"]);

  changeItem(repo, c.id, { move: "up" }, person);
  changeItem(repo, c.id, { move: "up" }, person);
  expect(readStatus(repo).next.map((i) => i.title)).toEqual(["README pass for 0.4", "Tauri port", "UI auth token"]);
  changeItem(repo, c.id, { move: "down" }, person);
  expect(readStatus(repo).next.map((i) => i.id)).toEqual([a.id, c.id, b.id]);
  // Already first: nothing to write.
  expect(changeItem(repo, a.id, { move: "up" }, person).rank).toBe(a.rank);

  changeItem(repo, a.id, { title: "Port the desktop app to Tauri" }, person);
  changeItem(repo, b.id, { state: "doing" }, agent("s1"));
  changeItem(repo, c.id, { state: "dropped" }, person);
  const items = listItems(repo);
  expect(items.find((i) => i.id === a.id)).toMatchObject({ title: "Port the desktop app to Tauri", state: "next" });
  expect(items.find((i) => i.id === b.id)).toMatchObject({ state: "doing", session: "s1", by: "claude-code" });
  expect(readStatus(repo).next.map((i) => i.id)).toEqual([a.id]);
  expect(() => changeItem(repo, b.id, { move: "up" }, person)).toThrow("Only an item in Up next");
  expect(() => changeItem(repo, "01K00000000000000000000000", { state: "done" }, person)).toThrow("no item");

  // A fetched change to an item kept here is ignored; a fetched item is theirs, quoted.
  fetched(repo, rec({ status_item: { title: "Hijacked", state: "done", of: a.id }, intent: { goal: "Done: Hijacked" } }));
  fetched(repo, rec({ status_item: { title: "Their item", state: "next" }, intent: { goal: "Up next: Their item" } }));
  const s = readStatus(repo);
  expect(s.next.find((i) => i.id === a.id)!.title).toBe("Port the desktop app to Tauri");
  expect(statusText(s)).toContain('"Their item" (from fork)');

  // A fetched item marked doing is quoted too, and isn't the person's even when its record says so.
  fetched(repo, rec({ session: { agent: "person", run_id: "x" }, status_item: { title: "Run this", state: "doing" }, intent: { goal: "In progress: Run this" } }));
  const line = statusText(readStatus(repo)).split("\n").find((l) => l.includes("Run this"))!;
  expect(line).toStartWith('- "Run this" (from fork), item ');
  expect(line).not.toContain("person");
  expect(readStatus(repo).now.find((w) => w.title === "Run this")).toMatchObject({ agent: "Someone", from: "fork" });
}, 60_000);

test("an item links to a goal, and a status_item is checked like any field", () => {
  const repo = gitRepo({ commit: true });
  const goal = addGoal(repo, { title: "Ship 0.4" }, person);
  const item = addItem(repo, { title: "Write the changelog", goal }, person);
  expect(statusText(readStatus(repo))).toContain(`- Write the changelog (for Ship 0.4), id ${item.id}`);
  expect(() => addItem(repo, { title: "x", goal: "01K00000000000000000000000" }, person)).toThrow("no goal");
  expect(changeItem(repo, item.id, { goal: null }, person).goal).toBeNull();
  expect(() => addItem(repo, { title: " " }, person)).toThrow("one line");

  const check = (status_item: object) => validateRecord(rec({ status_item } as Partial<CheckpointRecord>));
  expect(() => check({ title: "x", state: "todo" })).toThrow("status_item.state");
  expect(() => check({ title: "x".repeat(201), state: "next" })).toThrow("status_item.title");
  expect(() => check({ title: "x", state: "next", goal: "nope" })).toThrow("status_item.goal");
  expect(() => check({ title: "x", state: "next", rank: Number.NaN })).toThrow("status_item.rank");
  expect(check({ title: "x", state: "doing", rank: 2.5 }).status_item!.rank).toBe(2.5);
}, 30_000);

test("an item isn't an attempt: the work log, the counts and searches leave it out", () => {
  const repo = gitRepo({ commit: true });
  addItem(repo, { title: "Cache the ref index" }, person);
  appendRecord(repo, rec({ intent: { goal: "Cache the ref index in memory" } }));
  const view = repoView(repo);
  expect(view.turns.map((t) => t.intent)).toEqual(["Cache the ref index in memory"]);
  expect(view.stats.records).toBe(1);
  expect(withIndex(repo, (db) => tried(db, "ref index").map((h) => h.intent))).toEqual(["Cache the ref index in memory"]);
}, 30_000);

test("in progress: running sessions and subagents with what each is on, and items marked doing", () => {
  const repo = gitRepo({ commit: true });
  writeCapture(repo, [
    { session_id: "live", event: "UserPromptSubmit", prompt: "fix the flaky test\nin tests/cache.test.ts", ts: ago(6 * MIN) },
    // What the harness inserts after it isn't the person's ask.
    { session_id: "live", event: "UserPromptSubmit", prompt: '<agent-message from="a1">\nDone.', ts: ago(5 * MIN) },
    { session_id: "live", event: "UserPromptSubmit", prompt: "[Image #9]", ts: ago(5 * MIN) },
    { session_id: "live", tool: "Read", ts: ago(1 * MIN) },
    { session_id: "live", event: "SubagentStart", agent_id: "a1", agent_type: "Explore", delegated: "Research hook payloads", ts: ago(4 * MIN) },
    // Finished.
    { session_id: "live", event: "SubagentStart", agent_id: "a2", agent_type: "Plan", ts: ago(5 * MIN) },
    { session_id: "live", event: "SubagentStop", agent_id: "a2", agent_type: "Plan", ts: ago(3 * MIN) },
    // Interrupted: no stop, and its own calls went quiet.
    { session_id: "live", event: "SubagentStart", agent_id: "a3", agent_type: "Explore", ts: ago(50 * MIN) },
    { session_id: "live", tool: "Read", agent_id: "a3", ts: ago(45 * MIN) },
    { session_id: "ended", event: "UserPromptSubmit", prompt: "rename the flag", ts: ago(10 * MIN) },
    { session_id: "ended", event: "SessionEnd", ts: ago(2 * MIN) },
    { session_id: "quiet", event: "UserPromptSubmit", prompt: "old work", ts: ago(120 * MIN) },
    { session_id: "doer", agent: "codex", event: "UserPromptSubmit", prompt: "add the page", ts: ago(8 * MIN) },
  ]);
  const doing = addItem(repo, { title: "Add the Status section", state: "doing" }, { kind: "agent", agent: "codex", session: "doer" });
  const left = addItem(repo, { title: "Port to Tauri", state: "doing" }, agent("gone"));
  addItem(repo, { title: "Review the README", state: "doing" }, person);

  const s = readStatus(repo);
  const rows = s.now.map((w) => [w.agent, w.subagent, w.title, w.source, w.live]);
  expect(rows).toContainEqual(["Claude Code", null, "fix the flaky test", "prompt", true]);
  expect(rows).toContainEqual(["Claude Code", "Explore", "Research hook payloads", "task", true]);
  expect(rows).toContainEqual(["Codex", null, "Add the Status section", "item", true]);
  expect(rows).toContainEqual(["Claude Code", null, "Port to Tauri", "item", false]);
  expect(rows).toContainEqual(["You", null, "Review the README", "item", false]);
  expect(s.now).toHaveLength(5);
  expect(s.now.find((w) => w.item === doing.id)!.session).toBe("doer");

  const text = statusText(s, "live");
  expect(text).toContain('- this session, started 6 min ago: "fix the flaky test"');
  expect(text).toContain("- Explore subagent of this session, started 4 min ago: Research hook payloads");
  expect(text).toContain(`- Codex, started just now: Add the Status section, item ${doing.id}`);
  expect(text).toContain(`- Port to Tauri, item ${left.id}, marked in progress just now by Claude Code`);
  expect(text).toContain("marked in progress just now by the person");
}, 30_000);

test("a session's title is the goal its agent recorded since the last prompt, else that prompt", () => {
  const repo = gitRepo({ commit: true });
  writeCapture(repo, [
    { session_id: "s9", event: "UserPromptSubmit", prompt: "ye my bad just a wirte a new compaciton langauge with focus on", ts: ago(5 * MIN) },
    { session_id: "s9", tool: "Read", ts: ago(1 * MIN) },
  ]);
  const title = () => readStatus(repo).now.map((w) => [w.title, w.source]);
  expect(title()).toEqual([["ye my bad just a wirte a new compaciton langauge with focus on", "prompt"]]);
  // A goal from before the prompt was for something else.
  appendRecord(repo, rec({ session: { agent: "claude-code", run_id: "s9" }, intent: { goal: "Fix the old thing" }, ts: ago(9 * MIN) }));
  expect(title()[0]![1]).toBe("prompt");
  appendRecord(repo, rec({ session: { agent: "claude-code", run_id: "s9" }, intent: { goal: "Write the compaction summary" }, ts: ago(2 * MIN) }));
  expect(title()).toEqual([["Write the compaction summary", "goal"]]);
});

test("a starting subagent's task comes from its parent's session file, one call each", () => {
  const repo = gitRepo({ commit: true });
  const dir = tmp("anvc-status-transcript-");
  const transcript = join(dir, "parent.jsonl");
  const call = (id: string, name: string, type: string | undefined, description: string) =>
    ({ type: "tool_use", id, name, input: { description, prompt: "…", ...(type ? { subagent_type: type } : {}) } });
  const line = (message: string, content: object[]) => JSON.stringify({ type: "assistant", message: { id: message, role: "assistant", content } });
  writeFileSync(transcript, [
    line("m0", [call("t0", "Task", undefined, "Old task")]),
    JSON.stringify({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "t0", content: "done" }] } }),
    // One message, written as a line per block, that starts two Explore subagents.
    line("m1", [{ type: "text", text: "Starting two." }]),
    line("m1", [call("t1", "Agent", "Explore", "Map the hooks")]),
    line("m1", [call("t2", "Agent", "Explore", "Map the tests")]),
  ].join("\n"));
  expect(taskGiven(transcript, "Explore", new Set())).toEqual({ id: "t1", task: "Map the hooks" });
  expect(taskGiven(transcript, "Explore", new Set(["t1"]))!.task).toBe("Map the tests");
  expect(taskGiven(transcript, "general-purpose", new Set())).toBeNull();
  expect(taskGiven(join(dir, "missing.jsonl"), "Explore", new Set())).toBeNull();

  // The capture hook records each start with its own task, and the stop.
  const hook = (event: string, agent_id: string) => runHook("capture", event,
    { hook_event_name: event, session_id: "p1", cwd: repo, transcript_path: transcript, agent_id, agent_type: "Explore" });
  hook("SubagentStart", "x1");
  hook("SubagentStart", "x2");
  hook("SubagentStop", "x1");
  const rows = captureRows(repo).filter((r) => r.session_id === "p1");
  expect(rows.map((r) => [r.event, r.agent_id, r.delegated ?? null])).toEqual([
    ["SubagentStart", "x1", "Map the hooks"], ["SubagentStart", "x2", "Map the tests"], ["SubagentStop", "x1", null],
  ]);
  expect(readStatus(repo).now.filter((w) => w.subagent).map((w) => w.title)).toEqual(["Map the tests"]);
}, 30_000);

test("a subagent of the default type gets its task, even when its start was captured without it", () => {
  const repo = gitRepo({ commit: true });
  const transcript = join(tmp("anvc-status-default-"), "parent.jsonl");
  // Without subagent_type, the call takes the default type.
  const started = JSON.stringify({ type: "assistant", message: { id: "m1", role: "assistant", content: [
    { type: "tool_use", id: "t1", name: "Agent", input: { description: "Fix the export", prompt: "…" } },
  ] } });
  writeFileSync(transcript, `${started}\n`);
  expect(taskGiven(transcript, "general-purpose", new Set())).toEqual({ id: "t1", task: "Fix the export" });

  // Captured before the call reached the session file: Status looks again.
  writeCapture(repo, [{ session_id: "p2", event: "SubagentStart", agent_id: "x1", agent_type: "general-purpose", transcript, ts: ago(1 * MIN) }]);
  expect(readStatus(repo).now.filter((w) => w.subagent).map((w) => [w.title, w.source])).toEqual([["Fix the export", "task"]]);
}, 30_000);

test("done recently says where each kept attempt's work stands", () => {
  const repo = gitRepo({ commit: true });
  const head = () => git(repo, "rev-parse", "HEAD");
  const commit = (file: string, message: string) => {
    writeFileSync(join(repo, file), `${message}\n`);
    git(repo, "add", file);
    git(repo, "commit", "-q", "-m", message);
  };
  const kept = (goal: string, files: string[]) => {
    const r = rec({ intent: { goal }, delta: { files }, anchor: { kind: "commit", oid: head() }, ts: new Date().toISOString() });
    appendRecord(repo, r);
    return r.id;
  };
  const main = git(repo, "rev-parse", "--abbrev-ref", "HEAD");

  // Recorded, then committed.
  const inMain = kept("Add the cache", ["cache.ts"]);
  commit("cache.ts", "Add the cache");
  // Committed, then recorded: the anchor is the commit.
  commit("pushed.ts", "Pushed work");
  const pushed = kept("Pushed work", ["pushed.ts"]);
  git(repo, "update-ref", `refs/remotes/origin/${main}`, head());
  commit("tagged.ts", "Tagged work");
  const released = kept("Tagged work", ["tagged.ts"]);
  git(repo, "tag", "v0.4.0");
  git(repo, "checkout", "-q", "-b", "side");
  commit("side.ts", "Side work");
  const local = kept("Side work", ["side.ts"]);
  git(repo, "checkout", "-q", main);
  const uncommitted = kept("Draft", ["draft.ts"]);
  writeFileSync(join(repo, "draft.ts"), "draft\n");
  const unknown = kept("Talked it through", []);
  // Not finished work: an abandoned attempt, and one with no goal.
  appendRecord(repo, rec({ intent: { goal: "Dead end" }, outcome: { status: "abandoned", recheck: null } }));
  appendRecord(repo, rec({ intent: { prompt: "scraped" }, delta: { files: ["cache.ts"] } }));
  const item = addItem(repo, { title: "Write the changelog" }, person);
  changeItem(repo, item.id, { state: "done" }, person);

  const done = readStatus(repo).done;
  const stands = Object.fromEntries(done.map((f) => [f.id, [f.stands, f.tag]]));
  // The first commit to cache.ts is also in the later tag.
  expect(stands[inMain]).toEqual(["released", "v0.4.0"]);
  expect(stands[pushed]).toEqual(["released", "v0.4.0"]);
  expect(stands[released]).toEqual(["released", "v0.4.0"]);
  expect(stands[local]).toEqual(["local", null]);
  expect(stands[uncommitted]).toEqual(["uncommitted", null]);
  expect(stands[unknown]).toEqual(["unknown", null]);
  expect(stands[item.id]).toEqual([null, null]);
  expect(done.map((f) => f.title)).not.toContain("Dead end");
  expect(done).toHaveLength(7);
  expect(done[0]!.title).toBe("Write the changelog");

  // Without the tag, the same commits read as pushed and in main.
  git(repo, "tag", "-d", "v0.4.0");
  const again = Object.fromEntries(readStatus(repo).done.map((f) => [f.id, f.stands]));
  expect([again[inMain], again[pushed], again[released]]).toEqual(["pushed", "pushed", "main"]);
  expect(statusText(readStatus(repo))).toContain("- just now: Tagged work (in main)");
}, 60_000);

test("done recently shows a kept attempt that carries a map, and leaves out a map written on its own", () => {
  const repo = gitRepo({ commit: true });
  const map = (part: string) => ({ part, does: `What ${part} is for.` });
  appendRecord(repo, rec({ intent: { goal: "Split the indexer" }, delta: { files: ["protocol/query.ts"] }, map: map("the index") }));
  appendRecord(repo, rec({ intent: { goal: "Describe the work log" }, map: map("the work log") }));

  expect(readStatus(repo).done.map((f) => f.title)).toEqual(["Split the indexer"]);
});

test("a session starts with the status, hears it again after compaction, and the moment can be switched off", () => {
  const repo = gitRepo({ commit: true });
  const state = tmp("anvc-status-state-");
  const item = addItem(repo, { title: "Port to Tauri" }, person);
  const start = (source: string, session = "s1") => context("SessionStart",
    { hook_event_name: "SessionStart", session_id: session, cwd: repo, source }, { ANVC_STATE_DIR: state });

  const first = start("startup")!;
  expect(first).toContain("anvc: this project's status.");
  expect(first).toContain(`Up next:\n- Port to Tauri, id ${item.id}`);
  expect(start("startup")).toBeUndefined();
  expect(start("compact")).toContain("Port to Tauri");

  writeAssist(repo, { level: "ask" });
  expect(start("startup", "s2")).toBeUndefined();
  writeAssist(repo, { moment: "status", on: true });
  expect(start("startup", "s3")).toContain("Port to Tauri");
}, 60_000);

test("the briefing fits its budget, whole lines only, and says there is more", () => {
  const item = (n: number) => ({
    id: `01K0000000000000000000000${n % 10}`, title: `Item number ${n} with a title long enough to count`, state: "next" as const,
    goal: null, rank: n, added: "", ts: "", since: "", by: "person", session: "anvc-person", from: null, tier: "shared" as const,
  });
  const s: Status = { now: [], done: [], next: Array.from({ length: 40 }, (_, n) => item(n)), goals: {} };
  const text = statusBrief(s, "s1", 500)!;
  expect(text.length).toBeLessThanOrEqual(500);
  expect(text).toContain("Up next:\n- Item number 0 with");
  expect(text).toMatch(/anvc_status has the full lists\.$/);
  expect(statusBrief({ now: [], done: [], next: [], goals: {} }, "s1", 1200)).toBeNull();
});

test("an agent reads the status and adds, starts and finishes an item", () => {
  const repo = gitRepo({ commit: true });
  const env = { ANVC_SESSION: "m1", ANVC_AGENT: "claude-code" };
  expect(tool(repo, "anvc_status", {}, env)).toContain("Up next\n  Nothing queued.");
  const added = tool(repo, "anvc_status_item", { title: "Port to Tauri" }, env);
  const id = /id ([0-9A-Z]{26})/.exec(added)![1]!;
  expect(added).toBe(`Added Port to Tauri (Up next), id ${id}.`);
  expect(tool(repo, "anvc_status", {}, env)).toContain(`Up next\n- Port to Tauri, id ${id}`);
  expect(tool(repo, "anvc_status_item", { id, state: "doing" }, env)).toBe("Port to Tauri is In progress.");
  expect(tool(repo, "anvc_status", {}, env)).toContain(`- Port to Tauri, item ${id}, marked in progress just now by Claude Code`);
  expect(tool(repo, "anvc_status_item", { id, state: "finished" }, env)).toContain("state must be one of");
  expect(tool(repo, "anvc_status_item", { id }, env)).toContain("Give a state");
  expect(tool(repo, "anvc_status_item", {}, env)).toContain("Give a title");
  expect(tool(repo, "anvc_status_item", { id, state: "done" }, env)).toBe("Port to Tauri is Done.");
  expect(tool(repo, "anvc_status", {}, env)).toContain("Done recently\n- just now: Port to Tauri (marked done)");
}, 60_000);

test("a person reads and changes the status from the command line", () => {
  const repo = gitRepo({ commit: true });
  const added = cli(repo, "status", "add", "Port", "to", "Tauri");
  expect(added.code).toBe(0);
  const id = /id ([0-9A-Z]{26})/.exec(added.out)![1]!;
  const second = /id ([0-9A-Z]{26})/.exec(cli(repo, "status", "add", "UI token").out)![1]!;
  expect(cli(repo, "status", second, "up").out).toContain("UI token is Up next.");
  expect(cli(repo, "status").out).toContain(`Up next\n- UI token, id ${second}\n- Port to Tauri, id ${id}`);
  expect(cli(repo, "status", id, "done").out).toContain("Port to Tauri is Done.");
  expect(cli(repo, "status", id, "--title", "Port the app to Tauri").out).toContain("Port the app to Tauri is Done.");
  expect(cli(repo, "status", "nonsense")).toMatchObject({ code: 2 });
  expect(cli(repo, "status", "01K00000000000000000000000", "done").out).toContain("no item");
}, 60_000);

test("a session that edited files and left an item in progress is reminded once, even after a checkpoint", () => {
  const repo = gitRepo({ commit: true });
  const state = tmp("anvc-status-stop-");
  const transcript = join(state, "t.jsonl");
  writeFileSync(transcript, [
    { type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", id: "e1", name: "Edit", input: { file_path: join(repo, "a.ts") } }] } },
    { type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", id: "c1", name: "mcp__anvc__anvc_checkpoint", input: {} }] } },
  ].map((l) => JSON.stringify(l)).join("\n"));
  const stop = () => runHook("stop", "Stop", { hook_event_name: "Stop", session_id: "s1", cwd: repo, transcript_path: transcript }, { ANVC_STATE_DIR: state });

  expect(stop()).toBeNull();
  addItem(repo, { title: "Port to Tauri", state: "doing" }, agent("s1"));
  const asked = stop()!;
  expect(asked.decision).toBe("block");
  expect(asked.reason).toContain('still has an item marked in progress: "Port to Tauri"');
  expect(asked.reason).toContain("anvc_status_item");
  expect(stop()).toBeNull();
}, 60_000);
