import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { writeRecord } from "../protocol/record";
import { readActivity } from "../protocol/activity";
import { cli, git, gitRepo, rec, rpc, setEnv, tmp, tool } from "./helpers";

const server = resolve(import.meta.dir, "../protocol/mcp.ts");

test("MCP server handshakes, lists tools, and answers queries", async () => {
  const repo = gitRepo({ bare: true });
  writeRecord(repo, rec({
    session: { agent: "claude-code", run_id: "sess-a" },
    intent: { prompt: "drop the mutex around the ref cache" },
    delta: { files: ["refs/cache.ts"] },
    outcome: { status: "abandoned", errors: ["data race under five writers"], recheck: "bun test tests/concurrency.test.ts" },
  }), 1);

  const replies = await rpc(repo, [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    // A notification has no id and must never be answered.
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "anvc_abandoned_touching", arguments: { path: "refs/cache.ts" } } },
    { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "anvc_why", arguments: { path: "nope.ts" } } },
    { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "nonexistent", arguments: {} } },
  ]);

  expect((replies.get(1) as { serverInfo: { name: string } }).serverInfo.name).toBe("anvc");
  const tools = (replies.get(2) as { tools: Array<{ name: string }> }).tools;
  // Naming them beats counting them: a count says a tool changed, not which.
  expect(tools.map((t) => t.name).sort()).toEqual([
    "anvc_abandoned_touching",
    // The write tool is what makes this a protocol rather than a scraper.
    "anvc_checkpoint",
    // Needs no search term, because "what did I try?" has no good keywords.
    "anvc_dead_ends",
    // The read side of the dense half. Without it, storing more is storing
    // into a hole.
    "anvc_detail",
    "anvc_failed",
    // The only channel by which a record can be reported as wrong or stale.
    "anvc_feedback",
    // Goals and their status, which a compaction would otherwise take.
    "anvc_goal",
    "anvc_goals",
    "anvc_ingest",
    // Opens the work log for the person; open.test.ts covers it.
    "anvc_open",
    "anvc_overlap",
    "anvc_red_to_green",
    "anvc_result",
    "anvc_results",
    "anvc_retire",
    "anvc_revisions",
    // Writing rules: which exist, and the text of the ones covering a file or a commit.
    "anvc_rule",
    "anvc_rules",
    "anvc_search",
    "anvc_session",
    // What agents read, kept so it is read again instead of fetched; sources.test.ts covers it.
    "anvc_sources",
    // What's in progress, done recently and up next, which a compaction would otherwise take.
    "anvc_status",
    "anvc_status_item",
    "anvc_tool_note",
    "anvc_tools",
    "anvc_tried",
    "anvc_why",
  ]);

  // The query no commit-anchored scheme can answer.
  const abandoned = (replies.get(3) as { content: Array<{ text: string }> }).content[0]!.text;
  expect(abandoned).toContain("abandoned");
  // Scraped turns carry no goal; the error is what identifies them.
  expect(abandoned).toContain("data race under five writers");
  expect(abandoned).toContain("data race");

  // An empty result says what is absent rather than implying nothing happened.
  expect((replies.get(4) as { content: Array<{ text: string }> }).content[0]!.text).toContain("No recorded intent");

  // Unknown tools error instead of returning a plausible-looking answer.
  expect((replies.get(5) as { code: number }).code).toBe(-32603);

  // Notifications produced no reply.
  expect(replies.size).toBe(5);
}, 60_000);

test("an agent records its own work, including what it abandoned", async () => {
  const repo = gitRepo({ bare: true });
  const replies = await rpc(repo, [
    { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "anvc_checkpoint", arguments: {
      goal: "Serve clones from the stored pack", outcome: "kept", files: ["server/publish.ts"],
      constraints: ["do not change the wire protocol"], tests: { passed: 84, failed: 0 } } } },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "anvc_checkpoint", arguments: {
      goal: "Reach the fast path without a bitmap", outcome: "abandoned",
      why: "JGit only takes the cached-pack path when a reachability bitmap exists",
      recheck: "bun test tests/publish.test.ts" } } },
    // The goal is a line, not a summary: a wall of text is the thing this replaces.
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "anvc_checkpoint", arguments: {
      goal: "x".repeat(260), outcome: "kept" } } },
    { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "anvc_checkpoint", arguments: {
      goal: "no outcome given", outcome: "maybe" } } },
  ]);

  expect(String((replies.get(1) as { content: Array<{ text: string }> }).content[0]!.text)).toContain("recorded kept");
  expect(String((replies.get(2) as { content: Array<{ text: string }> }).content[0]!.text)).toContain("recorded abandoned");
  expect((replies.get(3) as { message: string }).message).toContain("200 characters");
  expect((replies.get(4) as { message: string }).message).toContain("kept or abandoned");

  // Stored under refs/anvc, with the agent's own words and no transcript.
  const out = (args: string[]) => git(repo, ...args);
  const refs = out(["for-each-ref", "--format=%(refname)", "refs/anvc/"]).split("\n").filter(Boolean);
  expect(refs).toHaveLength(2);
  const record = JSON.parse(out(["cat-file", "blob", refs[1]!]));
  expect(record.intent.goal).toBe("Reach the fast path without a bitmap");
  expect(record.intent.prompt).toBeUndefined();
  expect(record.outcome.status).toBe("abandoned");
}, 60_000);

test("a checkpoint stores the fields it was given, and says so when it cannot", async () => {
  const repo = gitRepo({ bare: true });
  const replies = await rpc(repo, [
    { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "anvc_checkpoint", arguments: {
      goal: "Try a mutex around the ref cache", outcome: "abandoned",
      scope: "general", recheck: "bun test tests/concurrency.test.ts",
      evidence: [{ path: "protocol/git.ts", line: 40, commit: "c98cecd", note: "the lock is taken here" }],
    } } },
  ]);

  const text = String((replies.get(1) as { content: Array<{ text: string }> }).content[0]!.text);
  expect(text).toContain("recorded abandoned");
  // An MCP server outlives the upgrade that changed its schema, so a stale
  // process drops new fields in silence — the write succeeds and the record
  // is thin. Observed against a server 433 minutes old. The reply has to say
  // so, because the process cannot know its own source moved.
  expect(text).not.toContain("WARNING");

  const out = (args: string[]) => git(repo, ...args);
  const ref = out(["for-each-ref", "--format=%(refname)", "refs/anvc/"]).split("\n").filter(Boolean)[0]!;
  const record = JSON.parse(out(["cat-file", "blob", ref]));

  expect(record.outcome.scope).toBe("general");
  expect(record.outcome.recheck).toBe("bun test tests/concurrency.test.ts");
  expect(record.evidence).toHaveLength(1);
  expect(record.evidence[0].commit).toBe("c98cecd");
  expect(record.evidence[0].line).toBe(40);
  // `why` used to be copied verbatim into `outcome.errors`, so the field a
  // reader goes to for what broke held prose instead.
  expect(record.outcome.errors).toBeUndefined();

  // null is the documented answer for "no command settles this", and it is
  // stored; the check read it as dropped and told the agent to restart.
  const none = tool(repo, "anvc_checkpoint", { goal: "Try a bigger pack window", outcome: "abandoned", recheck: null });
  expect(none).toContain("recorded abandoned");
  expect(none).not.toContain("WARNING");
}, 60_000);

test("a queried dead end carries the command that settles it", async () => {
  const repo = gitRepo({ bare: true });
  await rpc(repo, [
    { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "anvc_checkpoint", arguments: {
      goal: "Try a mutex around the ref cache", outcome: "abandoned", why: "deadlocks under five writers",
      scope: "general", recheck: "bun test tests/concurrency.test.ts",
    } } },
  ]);
  const replies = await rpc(repo, [
    { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "anvc_dead_ends", arguments: {} } },
  ]);
  const text = String((replies.get(1) as { content: Array<{ text: string }> }).content[0]!.text);

  // Everything that decides an action has to be in the result itself. An
  // agent that must make a second call to learn whether a warning still
  // applies mostly will not make it: an escape hatch a model elects to use
  // has a median invocation rate of zero. These fields shipped and were
  // stored, and this renderer dropped all of them on the floor.
  expect(text).toContain("Try a mutex around the ref cache");
  expect(text).toContain("bun test tests/concurrency.test.ts");
  expect(text).toContain("still true?");
  // A failure of the whole approach reads differently from one failed step.
  expect(text).toContain("whole approach");
}, 60_000);

test("a verdict on a record is a new record, never an edit", async () => {
  const repo = gitRepo({ bare: true });
  const first = await rpc(repo, [
    { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "anvc_checkpoint", arguments: {
      goal: "Try a mutex around the ref cache", outcome: "abandoned", why: "deadlock", recheck: "bun test",
    } } },
  ]);
  const judged = String((first.get(1) as { content: Array<{ text: string }> }).content[0]!.text)
    .match(/id: (\S+)/)![1]!;

  const replies = await rpc(repo, [
    { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "anvc_feedback", arguments: {
      record: judged, verdict: "stale",
      why: "the mutex was removed in a refactor, so the deadlock cannot occur",
    } } },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "anvc_feedback", arguments: {
      record: judged, verdict: "delightful",
    } } },
  ]);

  expect(String((replies.get(1) as { content: Array<{ text: string }> }).content[0]!.text)).toContain("stale");
  expect((replies.get(2) as { message: string }).message).toContain("helped, wrong, stale or irrelevant");

  const out = (args: string[]) => git(repo, ...args);
  const refs = out(["for-each-ref", "--format=%(refname)", "refs/anvc/"]).split("\n").filter(Boolean);
  expect(refs).toHaveLength(2);

  // The judged record is untouched. A log that rewrites itself cannot be
  // audited, and a mistaken verdict would otherwise destroy the very thing
  // it was mistaken about.
  const original = JSON.parse(out(["cat-file", "blob", refs[0]!]));
  expect(original.id).toBe(judged);
  expect(original.outcome.status).toBe("abandoned");

  const verdict = JSON.parse(out(["cat-file", "blob", refs[1]!]));
  // Named in the goal: with supersedes, the judged record read as replaced.
  expect(verdict.supersedes).toBeUndefined();
  expect(verdict.intent.goal).toBe(`Judged record ${judged} as stale`);
  // A verdict is a finding about a record, not a failed attempt of its own.
  expect(verdict.outcome.status).toBe("kept");
  expect(verdict.intent.why).toContain("removed in a refactor");
}, 60_000);

test("the dense half is stored in full and served only on request", async () => {
  const repo = gitRepo({ bare: true });
  const written = await rpc(repo, [
    { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "anvc_checkpoint", arguments: {
      goal: "Cache one default SSLContext at module scope",
      outcome: "abandoned", why: "concurrency issues outweighed the saving", recheck: "bun test",
      detail: {
        output: "ssl.SSLError: [X509] no certificate or crl found\n  raised in 3 of 200 concurrent requests",
        narrative: "It worked in every test we had. The tests never interleaved callers so none of them could have caught it.",
        ruled_out: [
          { approach: "lock around the shared context", because: "held for the whole handshake, cost more than the saving" },
          { approach: "deepcopy the context", because: "SSLContext is not copyable" },
          // No reason given, so it is not a usable entry and is dropped.
          { approach: "something else" },
        ],
        not_investigated: ["whether a context pool sized to the worker count works"],
        commands: ["python -m pytest tests/test_pool.py"],
      },
    } } },
  ]);
  const id = String((written.get(1) as { content: Array<{ text: string }> }).content[0]!.text)
    .match(/id: (\S+)/)![1]!;

  const out = (args: string[]) => git(repo, ...args);
  // Under the default policy the full output stays on this machine: the
  // shared copy leaves it out, and the whole record is kept privately.
  const sharedRef = out(["for-each-ref", "--format=%(refname)", "refs/anvc/"]).split("\n")[0]!;
  expect(JSON.parse(out(["cat-file", "blob", sharedRef])).detail.output).toBeUndefined();
  const ref = out(["for-each-ref", "--format=%(refname)", "refs/anvc-private/"]).split("\n")[0]!;
  const stored = JSON.parse(out(["cat-file", "blob", ref]));

  expect(stored.detail.output).toContain("3 of 200 concurrent requests");
  expect(stored.detail.narrative).toContain("never interleaved callers");
  // An approach with no reason tells a reader to avoid something and not
  // why, which is the shape this field exists to replace.
  expect(stored.detail.ruled_out).toHaveLength(2);
  expect(stored.detail.not_investigated).toHaveLength(1);

  const read = await rpc(repo, [
    { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "anvc_detail", arguments: { record: id } } },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "anvc_detail", arguments: { record: "01ZZZZZZZZZZZZZZZZZZZZZZZZ" } } },
  ]);
  const text = String((read.get(1) as { content: Array<{ text: string }> }).content[0]!.text);
  expect(text).toContain("3 of 200 concurrent requests");
  expect(text).toContain("SSLContext is not copyable");
  // The most actionable line in the record: where the last reader stopped.
  expect(text).toContain("NOT investigated");
  expect(String((read.get(2) as { content: Array<{ text: string }> }).content[0]!.text)).toContain("No record");
}, 60_000);

test("an agent can't share a record where the person keeps them private", async () => {
  const repo = gitRepo({ commit: true });
  const shared = tool(repo, "anvc_checkpoint", { goal: "Try it", outcome: "kept", tier: "shared" });
  expect(shared).toContain("shared — travels with git push");
  expect(cli(repo, "policy", "tier", "private").code).toBe(0);
  const asked = tool(repo, "anvc_checkpoint", { goal: "Try it again", outcome: "kept", tier: "shared" });
  expect(asked).toContain("private — stays on this machine");
  expect(asked).toContain("Not shared");
  expect(git(repo, "for-each-ref", "--format=%(refname)", "refs/anvc/").split("\n")).toHaveLength(1);
}, 30_000);

test("a checkpoint is filed under the agent's own session", async () => {
  const repo = gitRepo({ bare: true });
  // The test runner may itself be inside Claude Code, so the environment is
  // built from scratch rather than inherited.
  const { ANVC_SESSION: _a, CLAUDE_CODE_SESSION_ID: _c, ...base } = process.env;
  const checkpoint = (env: Record<string, string>) => {
    const proc = Bun.spawnSync(["bun", server], {
      stdin: Buffer.from(JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "anvc_checkpoint", arguments: { goal: "Try it", outcome: "kept" } },
      }) + "\n"),
      env: { ...base, ANVC_REPO: repo, ...env },
      stdout: "pipe", stderr: "pipe",
    });
    return /recorded kept, [^,]+, at (refs\/anvc\/[^\s\\]+)/.exec(proc.stdout.toString())?.[1];
  };

  expect(checkpoint({ CLAUDE_CODE_SESSION_ID: "5f0c1e2a-claude" })).toBe("refs/anvc/5f0c1e2a-claude/000001");
  expect(checkpoint({ ANVC_SESSION: "named", CLAUDE_CODE_SESSION_ID: "5f0c1e2a-claude" })).toBe("refs/anvc/named/000001");

  // Two agents that name no session must not share one. Under the old
  // fallback both wrote refs/anvc/agent/, and a teammate's push collided.
  const one = checkpoint({}), two = checkpoint({});
  expect(one).toMatch(/^refs\/anvc\/mcp-[0-9a-z]+\/000001$/);
  expect(two).toMatch(/^refs\/anvc\/mcp-[0-9a-z]+\/000001$/);
  expect(one).not.toBe(two);
}, 60_000);

test("each call to the result tools is logged once", async () => {
  const repo = gitRepo({ commit: true });
  setEnv({ ANVC_ACTIVITY_DIR: tmp("anvc-mcp-activity-") });
  const env = { ANVC_SESSION: "s-results" };
  expect(tool(repo, "anvc_result", { name: "D accuracy", value: "88.1%" }, env)).toContain("Recorded result");
  tool(repo, "anvc_results", { query: "88.1%" }, env);
  // Each logs its own row, and the generic fallback used to add a "searched"
  // row after it, so every result recorded also counted as a search.
  expect(readActivity({ session: "s-results" }).map((r) => `${r.kind} ${r.via}`))
    .toEqual(["recorded anvc_result", "searched anvc_results"]);
}, 30_000);
