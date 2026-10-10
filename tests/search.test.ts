/**
 * One search across every depth and the raw log, matching errors by shape.
 */
import { expect, test } from "bun:test";
import { buildIndex, openIndex, relatedTo } from "../protocol/query";
import { appendRecord, type CheckpointRecord } from "../protocol/record";
import { searchRaw, searchRecords, signature } from "../protocol/search";
import { gitRepo, rec, tmp, writeCapture } from "./helpers";

test("an error's signature drops what changes between runs", () => {
  const a = signature("TypeError at /tmp/anvc-a1b2/pool.ts:42:7 (0x7ffee3b1) after 120ms");
  const b = signature("TypeError at /tmp/anvc-zz99/pool.ts:311:2 (0x10a4c) after 9ms");
  expect(a).toBe(b);
});

function repo() {
  const dir = gitRepo();
  return { dir };
}

const record = (over: Partial<CheckpointRecord>) => rec({
  intent: { goal: "Pool the redis connections" }, outcome: { status: "abandoned", recheck: null }, ...over,
});

test("an error found only in a record's full output is found, from a different run", async () => {
  const { dir } = repo();
  appendRecord(dir, record({ detail: { output: "ssl.SSLError: [X509] no certificate at pool.py:88" } }), { tier: "private" });
  const db = openIndex();
  buildIndex(db, dir);
  const [hit] = searchRecords(db, "SSLError: [X509] no certificate at pool.py:12");
  expect(hit?.intent).toBe("Pool the redis connections");
  expect(hit?.matched).toContain("output");
  // What is injected on a prompt still reads only the goal, reason and errors.
  expect(relatedTo(db, "certificate x509 sslerror")).toHaveLength(0);
  db.close();
});

test("the raw log is searched too, with repeats of one error collapsed", async () => {
  const { dir } = repo();
  const root = tmp("anvc-search-cap-");
  const row = (n: number, run: string) => ({
    ts: new Date(Date.now() - n * 1000).toISOString(), agent: "codex", tool: "Bash", command: "bun test", ok: false,
    output: `running\nETIMEDOUT connecting to redis from ${run}/sock:6379`,
  });
  writeCapture(dir, [row(30, "/tmp/run-a"), row(10, "/tmp/run-b")], root);
  const hits = searchRaw(dir, "ETIMEDOUT redis", 10, root);
  expect(hits).toHaveLength(1);
  expect(hits[0]).toMatchObject({ agent: "codex", ok: false, more: 1 });
  expect(hits[0]!.line).toContain("ETIMEDOUT");
});

test("a date in the query keeps what was recorded that day, and a date alone lists it", () => {
  const { dir } = repo();
  appendRecord(dir, record({ ts: "2026-10-07T12:00:00.000Z" }), { tier: "private" });
  appendRecord(dir, record({ ts: "2026-10-09T12:00:00.000Z", intent: { goal: "Cache the redis lookups" } }), { tier: "private" });
  const db = openIndex();
  buildIndex(db, dir);
  expect(searchRecords(db, "2026-10-07").map((h) => h.intent)).toEqual(["Pool the redis connections"]);
  expect(searchRecords(db, "redis 2026-10-09").map((h) => h.intent)).toEqual(["Cache the redis lookups"]);
  expect(searchRecords(db, "2026-10")).toHaveLength(2);
  expect(searchRecords(db, "2026-10-08")).toHaveLength(0);
  db.close();
});

test("the error line is the error, not the test runner's summary", async () => {
  const { errorLine } = await import("../protocol/search");
  const out = "bun test v1.4\n\ntests/math.test.ts:\nerror: expect(received).toBe(expected)\n\nExpected: 3\nReceived: 6\n\n 0 pass\n 1 fail\nRan 1 test across 1 file.";
  expect(errorLine(out)).toBe("error: expect(received).toBe(expected) Expected: 3 Received: 6");
  expect(errorLine("all good\ndone")).toBe("done");
});
