/**
 * A result keeps its standing: where it lives, whether it was checked, what it
 * depends on, and a status only the person can lock.
 */
import { expect, test } from "bun:test";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { checkResult, describe, fingerprint, listResults, readValue, recordResult, recordStatus, sameNumber, whence } from "../protocol/results";
import { appendRecord } from "../protocol/record";
import { git, gitRepo, rec, runHook, setEnv, tmp, tool, writeCapture } from "./helpers";

const agent = { kind: "agent" as const, agent: "claude-code", session: "s1" };
const person = { kind: "person" as const };

function project() {
  const repo = gitRepo();
  mkdirSync(join(repo, "results"), { recursive: true });
  mkdirSync(join(repo, "a"));
  mkdirSync(join(repo, "d"));
  writeFileSync(join(repo, "results", "v6.json"), JSON.stringify({ test: { acc: 0.8812 } }));
  writeFileSync(join(repo, "results", "table.csv"), "run,acc,f1\nv4,0.861,0.80\nv6,0.8812,0.83\n");
  writeFileSync(join(repo, "a", "model.py"), "A = 1\n");
  writeFileSync(join(repo, "d", "model.py"), "D = 1\n");
  git(repo, "add", ".");
  git(repo, "commit", "-q", "-m", "base");
  return { repo };
}

test("a written number matches the value it was rounded from", () => {
  expect(sameNumber("88.1%", "0.8812")).toBe(true);
  expect(sameNumber("0.881", "0.8812")).toBe(true);
  expect(sameNumber("88.12", "0.8812")).toBe(true);
  expect(sameNumber("88.2%", "0.8812")).toBe(false);
  expect(sameNumber("1,234", "1234")).toBe(true);
  // One significant digit is too few to read as a percent too.
  expect(sameNumber("0.02", "0.022")).toBe(true);
  expect(sameNumber("0.02", "2%")).toBe(false);
  expect(sameNumber("0.02", "0.00022")).toBe(false);
  expect(sameNumber("0.80", "80%")).toBe(true);
  expect(sameNumber("5%", "0.05")).toBe(true);
  expect(sameNumber("1e-4", "0.0001")).toBe(true);
  expect(sameNumber("3.2e-5", "0.000032")).toBe(true);
  expect(sameNumber("\u22120.5", "-0.5")).toBe(true);
  // A share written from a printed count, unless it's too round to tell.
  expect(sameNumber("76%", "38/50")).toBe(true);
  expect(sameNumber("50%", "5/10")).toBe(false);
});

test("a value is read from JSON, CSV or a log line", async () => {
  const p = project();
  expect(readValue(join(p.repo, "results", "v6.json"), "test.acc")).toBe("0.8812");
  expect(readValue(join(p.repo, "results", "table.csv"), "v4/f1")).toBe("0.80");
  writeFileSync(join(p.repo, "results", "log.txt"), "epoch 9\nval accuracy: 0.8812 (best)\n");
  expect(readValue(join(p.repo, "results", "log.txt"), "val accuracy")).toBe("0.8812");
  expect(fingerprint(join(p.repo, "nope"))).toBeNull();
  expect(fingerprint(join(p.repo, "results"))?.hash).toMatch(/^files:/);
});

test("a folder dependency ignores bytecode, keeps an older fingerprint's meaning, and names what's newer", async () => {
  const p = project();
  const folder = join(p.repo, "results");
  const before = fingerprint(folder)!.hash;
  const legacy = fingerprint(folder, true)!.hash;
  const { id } = recordResult(p.repo, { name: "washout", value: "68", depends: ["results"] }, agent);
  mkdirSync(join(folder, "__pycache__"));
  writeFileSync(join(folder, "__pycache__", "fit.cpython-311.pyc"), "bytecode");
  writeFileSync(join(folder, "fit.pyc"), "bytecode");
  expect(fingerprint(folder)!.hash).toBe(before);
  expect(fingerprint(folder, true)!.hash).not.toBe(legacy);
  const view = () => listResults(p.repo).find((r) => r.id === id)!;
  expect(checkResult(p.repo, view()).stale).toBe(false);
  await Bun.sleep(5);
  writeFileSync(join(folder, "new.csv"), "a,b\n1,2\n");
  const check = checkResult(p.repo, view());
  expect(check.stale).toBe(true);
  expect(describe(view(), check)).toContain("results CHANGED (newer: new.csv)");
});

test("a quoted CSV field keeps its commas, quotes and line breaks in one cell", async () => {
  const p = project();
  const csv = join(p.repo, "results", "quoted.csv");
  writeFileSync(csv, 'run,note,acc\r\n"Results, final","said ""best""",0.8823\r\n"two\nlines",,0.5\r\nv7,"",0.9\r\n');
  expect(readValue(csv, "Results, final/acc")).toBe("0.8823");
  expect(readValue(csv, "Results, final/note")).toBe('said "best"');
  expect(readValue(csv, "two\nlines/acc")).toBe("0.5");
  expect(readValue(csv, "v7/acc")).toBe("0.9");
  // whence reads the file the same way, so the key it gives finds the value.
  expect(whence(p.repo, "0.8823").elsewhere).toMatchObject([{ path: "results/quoted.csv", key: "Results, final/acc", found: "0.8823" }]);
});

test("a Markdown table is read by row and column, and a key two tables share reads as nothing", () => {
  const p = project();
  const md = join(p.repo, "results", "REPORT.md");
  writeFileSync(md, "# Report\n\n| condition | n | mean |\n|---|---:|---:|\n| constrained | 121 | 0.51 |\n| **All** | 252 | `0.05` |\n\nAll 252 traces.\n");
  expect(readValue(md, "All/mean")).toBe("0.05");
  expect(readValue(md, "constrained/n")).toBe("121");
  // A key that isn't a cell still finds a labelled line, as before.
  expect(readValue(md, "All")).toBe("252");
  writeFileSync(md, "| run | mean |\n|---|---|\n| All | 0.05 |\n\n| run | mean |\n|---|---|\n| All | 0.07 |\n");
  expect(readValue(md, "All/mean")).toBeNull();
});

test("a CSV key reads back when its row or its column has a slash in it", async () => {
  const p = project();
  const csv = join(p.repo, "results", "runs.csv");
  // A row named by its checkpoint's path, and columns named as a logger names them.
  writeFileSync(csv, "ckpt,val/acc,loss\nruns/v6/best.pt,0.8814,0.21\nruns/v7/best.pt,0.8731,0.25\n");
  expect(readValue(csv, "runs/v6/best.pt/loss")).toBe("0.21");
  expect(readValue(csv, "runs/v7/best.pt/val/acc")).toBe("0.8731");
  expect(readValue(csv, "runs/v8/best.pt/loss")).toBeNull();
  const [hit] = whence(p.repo, "0.8814").elsewhere;
  expect(hit).toMatchObject({ path: "results/runs.csv", key: "runs/v6/best.pt/val/acc" });
  expect(readValue(csv, hit!.key)).toBe("0.8814");
});

test("recording checks the value at its source, and a lock is the person's call", async () => {
  const p = project();
  const good = recordResult(p.repo, { name: "D accuracy", value: "88.1%", part: "D", source: { path: "results/v6.json", key: "test.acc" }, depends: ["d/model.py"], status: "locked" }, agent);
  expect(good.notes.join(" ")).toContain("Checked: results/v6.json → test.acc holds 0.8812");
  expect(good.notes.join(" ")).toContain("Locking is the person's call");
  let [view] = listResults(p.repo);
  expect(view).toMatchObject({ status: "current", proposed: { status: "locked" } });

  recordStatus(p.repo, good.id, "locked", "Table 2 of the paper", person);
  [view] = listResults(p.repo);
  expect(view).toMatchObject({ status: "locked", by: "person", proposed: null, why: "Table 2 of the paper" });

  // An agent can't undo a lock; it waits for the person.
  recordStatus(p.repo, good.id, "invalid", "looks off", agent);
  [view] = listResults(p.repo);
  expect(view).toMatchObject({ status: "locked", proposed: { status: "invalid" } });

  const wrong = recordResult(p.repo, { name: "D f1", value: "0.9", source: { path: "results/table.csv", key: "v6/f1" } }, agent);
  expect(wrong.notes.join(" ")).toContain("holds 0.83, not 0.9");
});

test("only what a result depends on can make it stale", async () => {
  const p = project();
  const { id } = recordResult(p.repo, { name: "D accuracy", value: "88.1%", part: "D", source: { path: "results/v6.json", key: "test.acc" }, depends: ["d/model.py"] }, agent);
  recordStatus(p.repo, id, "locked", "final", person);
  // Parts A, B and C move on; D's result doesn't care.
  writeFileSync(join(p.repo, "a", "model.py"), "A = 2\n");
  let view = listResults(p.repo).find((r) => r.id === id)!;
  let check = checkResult(p.repo, view);
  expect(check.stale).toBe(false);
  expect(describe(view, check)).toContain("Locked and nothing it depends on changed. Don't re-run it.");
  // D's own code changes: now it is worth asking.
  writeFileSync(join(p.repo, "d", "model.py"), "D = 2\n");
  view = listResults(p.repo).find((r) => r.id === id)!;
  check = checkResult(p.repo, view);
  expect(check.stale).toBe(true);
  expect(describe(view, check)).toContain("d/model.py CHANGED");
  expect(describe(view, check)).toContain("Ask the person before re-running");
  // The file it was read from is overwritten with a new number.
  writeFileSync(join(p.repo, "results", "v6.json"), JSON.stringify({ test: { acc: 0.87 } }));
  expect(describe(view, checkResult(p.repo, view))).toContain("changed since, now holds 0.87");
});

test("a newer result supersedes the one it replaces, unless that one is locked", async () => {
  const p = project();
  const v4 = recordResult(p.repo, { name: "accuracy", value: "86.1%", source: { path: "results/table.csv", key: "v4/acc" } }, agent);
  const v6 = recordResult(p.repo, { name: "accuracy", value: "88.1%", replaces: v4.id, why: "v4 overfit", settings: { lr: "1e-4" } }, agent);
  let all = listResults(p.repo);
  expect(all.find((r) => r.id === v4.id)).toMatchObject({ status: "superseded", replaced_by: v6.id });
  // An agent reading the newer one learns what it replaced and what changed.
  const newer = all.find((r) => r.id === v6.id)!;
  expect(describe(newer, checkResult(p.repo, newer, all), all)).toContain("replaces 86.1%");
  expect(describe(newer, checkResult(p.repo, newer, all), all)).toContain("(lr=1e-4)");

  const w1 = recordResult(p.repo, { name: "f1", value: "0.80" }, agent);
  recordStatus(p.repo, w1.id, "locked", "in the paper", person);
  recordResult(p.repo, { name: "f1", value: "0.83", replaces: w1.id }, agent);
  all = listResults(p.repo);
  expect(all.find((r) => r.id === w1.id)?.status).toBe("locked");
});

test("whence finds a number in the results and in what commands printed", async () => {
  const p = project();
  setEnv({ ANVC_CAPTURE_DIR: tmp("anvc-results-log-") });
  recordResult(p.repo, { name: "D accuracy", value: "0.8812", source: { path: "results/v6.json", key: "test.acc" } }, agent);
  writeCapture(p.repo, [{ session_id: "s0", tool: "Bash", command: "python eval.py --ckpt v6", output: "loading\\nval accuracy 0.8812\\n" }]);
  const found = whence(p.repo, "88.1%");
  expect(found.results.map((r) => r.name)).toEqual(["D accuracy"]);
  expect(found.outputs[0]).toMatchObject({ command: "python eval.py --ckpt v6" });
  expect(whence(p.repo, "D accuracy").results).toHaveLength(1);
});

test("an agent records a result and finds it again by its number, through the MCP server", async () => {
  const p = project();
  const call = (name: string, args: object) => tool(p.repo, name, args, { ANVC_SESSION: "s-mcp" });
  const saved = call("anvc_result", { name: "D accuracy", value: "88.1%", part: "D", source: { path: "results/v6.json", key: "test.acc" }, depends: ["d/model.py"], why: "best of three seeds", used_in: ["paper.tex Table 2"] });
  expect(saved).toContain("Recorded result D accuracy = 88.1%");
  expect(saved).toContain("Checked: results/v6.json → test.acc holds 0.8812");
  const found = call("anvc_results", { query: "0.881" });
  expect(found).toContain("D accuracy = 88.1% [D] · current");
  expect(found).toContain("results/v6.json → test.acc (unchanged since)");
  expect(found).toContain("used in: paper.tex Table 2");
});

test("several results go in one call, answered in a line plus one for each that needs a look", () => {
  const p = project();
  const said = tool(p.repo, "anvc_result", {
    depends: ["d/model.py"], used_in: ["paper.tex Table 2"],
    results: [
      { name: "v6 accuracy", value: "0.881", source: { path: "results/table.csv", key: "v6/acc" } },
      { name: "v6 F1", value: "0.83", source: { path: "results/table.csv", key: "v6/f1" } },
      { name: "v4 F1", value: "0.90", source: { path: "results/table.csv", key: "v4/f1" } },
      { name: "no value" },
    ],
  }, { ANVC_SESSION: "s-batch" });
  expect(said.split("\n")).toEqual([
    "Recorded 3 of 4 results; 2 match their files.",
    expect.stringMatching(/^- v4 F1 \(\w{26}\): results\/table\.csv → v4\/f1 holds 0\.80, not 0\.90\.$/),
    "- no value: not recorded. A result needs a name and a value.",
  ]);
  // What was given beside the list went on each.
  expect(listResults(p.repo).map((r) => [r.name, r.used_in, r.depends.map((d) => d.path)])).toContainEqual(["v6 F1", ["paper.tex Table 2"], ["d/model.py"]]);
});

test("the briefing names a locked result whose inputs changed, and a prompt with its number brings it up", async () => {
  const p = project();
  const state = tmp("anvc-results-state-");
  const { id } = recordResult(p.repo, { name: "D accuracy", value: "88.1%", part: "D", source: { path: "results/v6.json", key: "test.acc" }, depends: ["d/model.py"] }, agent);
  recordStatus(p.repo, id, "locked", "Table 2", person);
  writeFileSync(join(p.repo, "d", "model.py"), "D = 3  # changed\n");
  const inject = (event: string, extra: object) => {
    const out = runHook("inject", event, { session_id: `s-${event}`, cwd: p.repo, hook_event_name: event, ...extra }, { ANVC_STATE_DIR: state });
    return out ? out.hookSpecificOutput.additionalContext as string : "";
  };
  const briefing = inject("SessionStart", { source: "startup" });
  expect(briefing).toContain("1 result recorded here, 1 locked");
  expect(briefing).toContain("Results that need a look:");
  expect(briefing).toContain("d/model.py CHANGED");
  const asked = inject("UserPromptSubmit", { prompt: "can we trust the 88.1% in table 2?" });
  expect(asked).toContain("Results this mentions:");
  expect(asked).toContain("D accuracy = 88.1% [D] · LOCKED");
});

test("a path that links out of the repository is refused, and never read or fingerprinted", () => {
  const p = project();
  const outside = tmp("anvc-outside-");
  writeFileSync(join(outside, "secret.json"), JSON.stringify({ token: 12345 }));
  symlinkSync(join(outside, "secret.json"), join(p.repo, "results", "link.json"));
  symlinkSync(outside, join(p.repo, "elsewhere"));
  expect(() => recordResult(p.repo, { name: "t", value: "12345", source: { path: "results/link.json", key: "token" } }, agent)).toThrow("not inside the repository");
  expect(() => recordResult(p.repo, { name: "t", value: "1", depends: ["elsewhere/secret.json"] }, agent)).toThrow("not inside the repository");

  // A record from somewhere else can name one anyway. It counts as missing.
  appendRecord(p.repo, rec({
    intent: { goal: "Result: t = 12345" },
    result: { name: "t", value: "12345", status: "current", source: { path: "results/link.json", key: "token", hash: "sha256:0" }, depends: [{ path: "elsewhere/secret.json", hash: "sha256:0" }] },
  }));
  const view = listResults(p.repo).find((v) => v.name === "t")!;
  expect(checkResult(p.repo, view)).toMatchObject({ source: { state: "missing", now: null }, depends: [{ state: "missing" }] });
  // Confirming it fingerprints nothing out there either.
  recordStatus(p.repo, view.id, "current", "", agent);
  expect(JSON.stringify(listResults(p.repo))).not.toContain(fingerprint(join(outside, "secret.json"))!.hash);

  // Inside a folder, a link out of it isn't followed.
  const before = fingerprint(join(p.repo, "results"));
  symlinkSync(join(outside, "secret.json"), join(p.repo, "results", "more.json"));
  expect(fingerprint(join(p.repo, "results"))).toEqual(before);

  writeFileSync(join(outside, "paper.md"), "Accuracy was 88.1%.\n");
  symlinkSync(join(outside, "paper.md"), join(p.repo, "paper.md"));
  expect(tool(p.repo, "anvc_results", { document: "paper.md" })).toBe("paper.md is outside this repository.");
});

test("JSON as Python writes it, with NaN, reads, and so do list items by number", () => {
  const dir = tmp("anvc-nan-");
  const file = join(dir, "slices.json");
  // json.dump writes NaN for a float that is one; strict JSON refuses the whole file.
  writeFileSync(file, '[{"domain": "math", "auc": 0.739, "lead": NaN}, {"domain": "all", "auc": 0.909, "failed_trace_auc": 0.787, "low": -Infinity}]');
  expect(readValue(file, "1.failed_trace_auc")).toBe("0.787");
  expect(readValue(file, "0.auc")).toBe("0.739");
  // A string that says NaN is left as it is.
  writeFileSync(file, '{"note": "NaN means missing", "x": NaN, "y": 0.5}');
  expect(readValue(file, "note")).toBe("NaN means missing");
  expect(readValue(file, "y")).toBe("0.5");
});

test("a CSV row whose first cell repeats is named by its columns, never read from the first match", () => {
  const dir = tmp("anvc-csv-");
  const file = join(dir, "summary.csv");
  writeFileSync(file, [
    "benchmark,model,horizon,far",
    "aftraj,current_step,1,0.0435",
    "aftraj,deepset,1,0.0391",
    "aftraj,deepset,3,0.0406",
    "apb,deepset,3,0.1120",
  ].join("\n"));
  // Several rows start with aftraj: the first one is the wrong number, so none is given.
  expect(readValue(file, "aftraj/far")).toBeNull();
  expect(readValue(file, "benchmark=aftraj,model=deepset,horizon=3/far")).toBe("0.0406");
  expect(readValue(file, "apb/far")).toBe("0.1120");
  expect(readValue(file, "benchmark=aftraj,model=nope/far")).toBeNull();
  // A sweep names its rows by their settings, with "=" in the first cell.
  writeFileSync(join(dir, "sweep.csv"), "run,acc\nlr=0.1,0.81\nlr=0.01,0.84\n");
  expect(readValue(join(dir, "sweep.csv"), "lr=0.1/acc")).toBe("0.81");
});

test("whence names a repeated CSV row by its columns, and the name reads back that row", () => {
  const p = project();
  writeFileSync(join(p.repo, "results", "alarm.csv"), "benchmark,model,horizon,recall\naftraj,current,3,0.4364\naftraj,deepset,3,0.5091\n");
  const w = whence(p.repo, "0.5091");
  const hit = w.elsewhere.find((e) => e.path === "results/alarm.csv")!;
  expect(hit.key).toBe("benchmark=aftraj,model=deepset/recall");
  expect(readValue(join(p.repo, "results", "alarm.csv"), hit.key)).toBe("0.5091");
});

test("a field on every line of a predictions file isn't offered as where a result came from", () => {
  const p = project();
  const rows = Array.from({ length: 150 }, (_, i) => JSON.stringify({ id: i, probability: i === 77 ? 0.913 : 0.5 }));
  writeFileSync(join(p.repo, "results", "preds.jsonl"), `${rows.join("\n")}\n`);
  writeFileSync(join(p.repo, "results", "epochs.jsonl"), `${JSON.stringify({ epoch: 1, auc: 0.913 })}\n`);
  const where = whence(p.repo, "0.913").elsewhere.map((e) => e.path);
  expect(where).toContain("results/epochs.jsonl");
  expect(where).not.toContain("results/preds.jsonl");
});

test("a result is stale when its value moved, not when its file gained a key, and confirming it clears the flag", () => {
  const p = project();
  writeFileSync(join(p.repo, "results", "head.json"), JSON.stringify({ auc: 0.909 }));
  writeFileSync(join(p.repo, "d", "model.py"), "v1\n");
  const { id } = recordResult(p.repo, { name: "AUC", value: "0.909", source: { path: "results/head.json", key: "auc" }, depends: ["d/model.py"] }, agent);
  const check = () => { const all = listResults(p.repo); return checkResult(p.repo, all.find((r) => r.id === id)!, all); };
  // Another key added beside it: the value it was read from is the same.
  writeFileSync(join(p.repo, "results", "head.json"), JSON.stringify({ auc: 0.909, ap: 0.672 }));
  expect(check().stale).toBe(false);
  // Something it depends on changed: stale, until someone checks and confirms it.
  writeFileSync(join(p.repo, "d", "model.py"), "v2\n");
  expect(check().stale).toBe(true);
  recordStatus(p.repo, id, "current", "Checked: the change was a comment", agent);
  expect(check().stale).toBe(false);
  // The value itself moved: stale, and the line says what it holds now.
  writeFileSync(join(p.repo, "results", "head.json"), JSON.stringify({ auc: 0.871, ap: 0.672 }));
  expect(check().stale).toBe(true);
  const all = listResults(p.repo);
  expect(describe(all.find((r) => r.id === id)!, check(), all)).toContain("now holds 0.871");
});

test("a superseded result isn't flagged for what changed after it", () => {
  const p = project();
  writeFileSync(join(p.repo, "d", "model.py"), "v1\n");
  const old = recordResult(p.repo, { name: "AUC", value: "0.90", depends: ["d/model.py"] }, agent);
  recordResult(p.repo, { name: "AUC", value: "0.91", depends: ["d/model.py"], replaces: old.id }, agent);
  writeFileSync(join(p.repo, "d", "model.py"), "v2\n");
  const all = listResults(p.repo);
  const was = all.find((r) => r.id === old.id)!;
  expect(was.status).toBe("superseded");
  expect(checkResult(p.repo, was, all).stale).toBe(false);
});
