/**
 * What the empty work log reads from /api/start: whether an agent has ANVC's
 * hooks here, and the sessions from before that the page can import. It once
 * said "Connect an agent" with an agent connected.
 */
import { expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { transcriptDir } from "../protocol/backfill";
import { setFolder } from "../protocol/folders";
import { samePath } from "../protocol/rawlog";
import { gitRepo, served, setEnv, tmp, uiFetch, uiPost } from "./helpers";

/** A repository, and a Claude Code folder and ANVC state of the test's own. */
function place() {
  const repo = samePath(gitRepo({ commit: true }));
  const claude = tmp("anvc-start-claude-");
  const state = tmp("anvc-start-state-");
  setEnv({ CLAUDE_CONFIG_DIR: claude, ANVC_STATE_HOME: state, CODEX_HOME: tmp("anvc-start-codex-") });
  return { repo, claude, state };
}

const start = async (origin: string) => (await uiFetch(`${origin}/api/start`)).json() as Promise<{ agents: string[]; earlier: number }>;

test("the empty log knows when no agent is connected, and which ones are", async () => {
  const { repo, claude, state } = place();
  await served(repo, { ...process.env }, async (origin) => {
    expect(await start(origin)).toEqual({ agents: [], earlier: 0 });

    // The plugin turned on but not installed runs no hooks.
    writeFileSync(join(claude, "settings.json"), JSON.stringify({ enabledPlugins: { "anvc@anvc": true } }));
    expect((await start(origin)).agents).toEqual([]);
    mkdirSync(join(claude, "plugins"), { recursive: true });
    writeFileSync(join(claude, "plugins", "installed_plugins.json"), JSON.stringify({ version: 2, plugins: { "anvc@anvc": [{ scope: "user", installPath: "/x", version: "0.4.9" }] } }));
    expect((await start(origin)).agents).toEqual(["Claude Code"]);

    // Setup for this project, or for every project.
    writeFileSync(join(claude, "settings.json"), "{}");
    writeFileSync(join(state, "installs.json"), JSON.stringify([{ repo, agent: "codex", hooks: 8, ts: "2026-10-01T00:00:00.000Z" }]));
    expect((await start(origin)).agents).toEqual(["Codex"]);
    writeFileSync(join(state, "installs.json"), JSON.stringify([{ repo: "*", agent: "cursor", hooks: 8, ts: "2026-10-01T00:00:00.000Z" }]));
    expect((await start(origin)).agents).toEqual(["Cursor"]);
  });
}, 30_000);

test("the page imports the sessions from before, and the log has them", async () => {
  const { repo } = place();
  const dir = transcriptDir(repo);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "old.jsonl"), `${[
    { type: "user", uuid: "u1", sessionId: "old", cwd: repo, timestamp: "2026-09-01T10:00:00.000Z", message: { role: "user", content: "train the retriever with one BM25 negative" } },
    { type: "assistant", uuid: "a1", sessionId: "old", cwd: repo, timestamp: "2026-09-01T10:00:05.000Z", message: { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "Edit", input: { file_path: join(repo, "train.py"), new_string: "neg = 1" } }] } },
    { type: "user", uuid: "r1", sessionId: "old", cwd: repo, timestamp: "2026-09-01T10:00:06.000Z", message: { content: [{ type: "tool_result", tool_use_id: "t1", content: "ok" }] } },
  ].map((l) => JSON.stringify(l)).join("\n")}\n`);
  await served(repo, { ...process.env }, async (origin) => {
    expect((await start(origin)).earlier).toBe(1);
    // Only the page can start it.
    expect((await uiPost(`${origin}/api/start`, {}, {})).status).toBe(403);

    setFolder(repo, false);
    expect(await (await uiPost(`${origin}/api/start`, {})).json()).toEqual({ error: "ANVC is off for this project. Turn it on to import sessions." });
    setFolder(repo, true);

    const done = await (await uiPost(`${origin}/api/start`, {})).json() as { sessions: number; written: number; failed: number };
    expect(done).toMatchObject({ sessions: 1, failed: 0 });
    expect(done.written).toBeGreaterThan(0);
    const log = await (await uiFetch(`${origin}/api/repo`)).json() as { turns: unknown[] };
    expect(log.turns.length).toBe(done.written);
    // Imported sessions are copied, so none is left to offer.
    expect((await start(origin)).earlier).toBe(0);
  });
}, 30_000);
