/**
 * The note a new session gets about the session before it.
 *
 * Switching agents mid-task leaves the half-done work in the first agent's
 * session. The note must name it — which agent, what changed, what failed,
 * where its session is — and stay silent when there is nothing to hand over.
 */
import { expect, test } from "bun:test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { handoff } from "../protocol/handoff";
import { gitRepo, tmp } from "./helpers";

async function setup() {
  const repo = gitRepo();
  const capture = tmp("anvc-handoff-cap-");
  await writeFile(join(repo, "pool.ts"), "x\n");
  const write = async (rows: object[]) => {
    const day = new Date().toISOString().slice(0, 10);
    await writeFile(join(capture, `${day}.jsonl`), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  };
  return { repo, capture, write };
}

const row = (repo: string, over: object) => ({
  anvc_capture: 0, event: "PostToolUse", ts: new Date(Date.now() - 10 * 60_000).toISOString(),
  session_id: "codex-1", agent: "codex", cwd: repo, repo, tool: null, path: null, bytes: null,
  command: null, prompt: null, ok: null, ...over,
});

test("a new session is told what the one before left, and where to read more", async () => {
  const { repo, capture, write } = await setup();
  await write([
    row(repo, { tool: "Edit", path: join(repo, "pool.ts") }),
    row(repo, { tool: "Bash", command: "bun test", ok: false, output: "running\n1 fail: ssl context" }),
    row(repo, { event: "Stop", transcript: "/home/u/.codex/sessions/rollout-x.jsonl" }),
  ]);
  const note = handoff(repo, "claude-2", { captureDir: capture })!;
  expect(note).toContain("Codex worked in this repository (10 min ago)");
  expect(note).toContain("It recorded nothing");
  // pool.ts is untracked, so still uncommitted.
  expect(note).toContain("Changed: pool.ts; all still uncommitted");
  expect(note).toContain("Last failure: `bun test` → 1 fail: ssl context");
  expect(note).toContain("/home/u/.codex/sessions/rollout-x.jsonl");
});

test("a search that found nothing isn't the last failure", async () => {
  const { repo, capture, write } = await setup();
  await write([
    row(repo, { tool: "Bash", command: "bun test", ok: false, output: "1 fail: ssl context" }),
    row(repo, { tool: "Bash", command: "ugrep -n 'foo(' src | head", ok: false, output: "ugrep: error: missing )" }),
    row(repo, { tool: "Bash", command: "ls missing/", ok: false, output: "ls: cannot access" }),
  ]);
  expect(handoff(repo, "claude-2", { captureDir: capture })).toContain("Last failure: `bun test`");
});

test("nothing is said about the session itself, or one that left nothing behind", async () => {
  const { repo, capture, write } = await setup();
  await write([
    row(repo, { session_id: "claude-2", agent: "claude-code", tool: "Edit", path: join(repo, "pool.ts") }),
    row(repo, { tool: "Read", path: join(repo, "pool.ts") }),
    row(repo, { tool: "Bash", command: "ls", ok: true }),
  ]);
  // Its own edits are not a handoff; the other session only read and listed.
  expect(handoff(repo, "claude-2", { captureDir: capture })).toBeNull();
});

test("a session older than the window is not the one before", async () => {
  const { repo, capture, write } = await setup();
  await write([row(repo, { tool: "Edit", path: join(repo, "pool.ts"), ts: new Date(Date.now() - 30 * 3_600_000).toISOString() })]);
  expect(handoff(repo, "claude-2", { captureDir: capture })).toBeNull();
});
