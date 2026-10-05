/**
 * Where an agent is told about numbers: in a project's files, in what a
 * command wrote, and from before ANVC was turned on.
 */
import { expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { writeAssist } from "../protocol/assist";
import { transcriptDir } from "../protocol/backfill";
import { holdsNumbers, isDataPath } from "../protocol/catchup";
import { samePath } from "../protocol/rawlog";
import { cli, context, git, gitRepo, runHook, tmp } from "./helpers";

const RUN = `${JSON.stringify({ split: "test", mrr: 0.418, accuracy: 0.746, loss: 1.25 }, null, 2)}\n`;

/** A repository with a results file, and an agent session from before ANVC was on. */
function project() {
  const repo = gitRepo({ commit: true });
  mkdirSync(join(repo, "results"));
  writeFileSync(join(repo, "results", "run.json"), RUN);
  writeFileSync(join(repo, "package.json"), `${JSON.stringify({ name: "x", version: "0.4.4" })}\n`);
  writeFileSync(join(repo, "README.md"), "Reaches 0.746 accuracy and 0.418 MRR, 12.5% better.\n");
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", "results");
  const dir = transcriptDir(samePath(repo));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "old.jsonl"), `${JSON.stringify({
    type: "user", uuid: "u1", sessionId: "old", cwd: repo, timestamp: "2026-09-01T10:00:00.000Z",
    message: { role: "user", content: "train the retriever with one BM25 negative" },
  })}\n`);
  return { repo, env: { ANVC_STATE_DIR: tmp("anvc-catchup-state-") } };
}

test("numbers are measured ones, and results files hold them where code and docs don't", () => {
  expect(holdsNumbers("mrr 0.418, accuracy 74.6%, 13.5 GPU-hours")).toBe(true);
  // Versions aren't measurements, and two numbers aren't enough.
  expect(holdsNumbers('"version": "0.4.4", "bun": "1.2.3", "node": "22.1.0"')).toBe(false);
  expect(holdsNumbers("took 0.5 s and 1.5 s")).toBe(false);
  expect(["results/run.json", "notes/eval.md", "runs/train.csv", "logs/run.log"].every(isDataPath)).toBe(true);
  expect(["package.json", "README.md", "requirements.txt", "src/train.py", "node_modules/x/data.json", ".github/x.json", "tsconfig.json", "jsconfig.json"].some(isDataPath)).toBe(false);
});

test("the first session after ANVC is turned on offers to bring in what came before, once", () => {
  const { repo, env } = project();
  const start = (session: string) => context("SessionStart", { hook_event_name: "SessionStart", session_id: session, cwd: repo, source: "startup" }, env) ?? "";
  const first = start("s1");
  // The sessions come first, in one short question with yes recommended; the numbers after.
  expect(first).toContain("1 earlier agent session here isn't in it yet. In your next reply, first ask the user one short question: whether to import it as private records");
  expect(first).toMatch(/Recommend yes, and on a yes run `.+ catch-up --repo .+`\. Don't run it without one\./);
  expect(first).toContain("Files here also hold numbers, such as `results/run.json`. After that, offer separately");
  // Files hold numbers here, so the agent is told to record its own as it goes.
  expect(first).toContain("record it with anvc_result");
  const second = start("s2");
  expect(second).not.toContain("work happened here");
  expect(second).toContain("record it with anvc_result");
});

test("with only files from before, the offer is about them alone", () => {
  const repo = gitRepo({ commit: true });
  writeFileSync(join(repo, "run.json"), RUN);
  const said = context("SessionStart", { hook_event_name: "SessionStart", session_id: "s1", cwd: repo, source: "startup" }, { ANVC_STATE_DIR: tmp("anvc-catchup-state-") }) ?? "";
  expect(said).toContain("Ask the user whether to bring in the numbers they rely on, with anvc_result naming each one's file and key. Do nothing without a yes. Record the numbers several to a call, and from a subagent if you can start one");
});

test("a file a command wrote with numbers in it is pointed out once", () => {
  const { repo, env } = project();
  const read = () => context("PreToolUse", { hook_event_name: "PreToolUse", session_id: "s1", cwd: repo, tool_name: "Read", tool_input: { file_path: join(repo, "README.md") } }, env) ?? "";
  runHook("capture", "PostToolUse", {
    hook_event_name: "PostToolUse", session_id: "s1", cwd: repo, tool_name: "Bash",
    tool_input: { command: "python eval.py --split test --out results/run.json" }, tool_response: { stdout: "done", stderr: "", exit_code: 0 },
  }, env);
  expect(read()).toContain("`results/run.json` holds numbers. If one is a result someone will rely on, record it with anvc_result");
  expect(read()).not.toContain("holds numbers");
});

test("numbers the agent is about to write are pointed out, unless the person turned that off", () => {
  const { repo, env } = project();
  const write = (session: string) => context("PreToolUse", {
    hook_event_name: "PreToolUse", session_id: session, cwd: repo, tool_name: "Write",
    tool_input: { file_path: join(repo, "notes", "eval.md"), content: "| run | mrr | acc |\n| v2 | 0.418 | 74.6% |\n| v1 | 0.391 | 71.2% |\n" },
  }, env) ?? "";
  expect(write("s1")).toContain("`notes/eval.md` holds numbers");
  writeAssist(repo, { moment: "results", on: false });
  expect(write("s2")).not.toContain("holds numbers");
});

test("anvc catch-up imports the sessions from before and lists the files that hold numbers", () => {
  const { repo } = project();
  const r = cli(repo, "catch-up");
  expect(r.code).toBe(0);
  expect(r.out).toContain("1 past session");
  expect(r.out).toContain("These files hold numbers:\n  results/run.json");
  expect(r.out).toContain('"record the results in these files with anvc_result"');
});
