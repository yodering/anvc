/**
 * The pre-push hook: one line on what a push shares, and a stop when a
 * record holds a credential. Checked against a real push to a bare remote.
 */
import { expect, test } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { chmod, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { appendRecord } from "../protocol/record";
import { CLI, pointerFile } from "../protocol/version";
import { git, gitRepo, rec, runHook, tmp } from "./helpers";

const SETUP = resolve(import.meta.dir, "../scripts/setup.ts");
// A fixture, shaped like a key and valid for nothing.
const FAKE_KEY = ["sk", "proj", "Zx9FAKEfakeFAKEfake0000FIXTURE"].join("-");

function setup() {
  const repo = tmp("anvc-prepush-");
  const remote = gitRepo({ bare: true });
  git(repo, "init", "-q", "-b", "main");
  git(repo, "remote", "add", "origin", remote);
  git(repo, "commit", "-q", "--allow-empty", "-m", "base");
  const push = (...args: string[]) => {
    const p = Bun.spawnSync(["git", "-C", repo, "push", ...(args.length ? args : ["origin"])], { stdout: "pipe", stderr: "pipe" });
    return { code: p.exitCode, out: p.stdout.toString() + p.stderr.toString() };
  };
  const onRemote = () => git(remote, "for-each-ref", "--format=%(refname)", "refs/anvc/");
  const record = (why: string) => rec({ intent: { goal: "Call the pricing API", why } });
  return { repo, remote, push, onRemote, record };
}

const install = (repo: string) => Bun.spawnSync(["bun", SETUP, "--repo", repo, "--agent", "codex", "--no-hooks", "--no-instructions", "--pre-push"], { stdout: "pipe", stderr: "pipe" });

/** Puts text under a ref as it is, the way a record written before redaction, or by hand, sits there. */
const place = (repo: string, ref: string, text: string) => {
  const oid = Bun.spawnSync(["git", "-C", repo, "hash-object", "-w", "--stdin"], { stdin: Buffer.from(text), stdout: "pipe" }).stdout.toString().trim();
  git(repo, "update-ref", ref, oid);
};

test("a record holding a key stops the push and is named", async () => {
  const { repo, push, onRemote, record } = setup();
  install(repo);
  const bad = record(`it worked once the key ${FAKE_KEY} was set`);
  // Written directly: appendRecord redacts the key now, so only a record from
  // before that, or one placed by hand, still holds one.
  place(repo, "refs/anvc/s/000001", JSON.stringify(bad));
  const { code, out } = push();
  expect(code).not.toBe(0);
  expect(out).toContain("push stopped");
  expect(out).toContain(bad.id);
  expect(out).toContain("intent.why");
  // The key itself is never printed in full.
  expect(out).not.toContain(FAKE_KEY);
  expect(onRemote()).toBe("");
});

test("a clean push says what it shares in one line", async () => {
  const { repo, push, onRemote, record } = setup();
  install(repo);
  appendRecord(repo, record("the endpoint needed a trailing slash"), { tier: "shared" });
  appendRecord(repo, record("kept on this machine"), { tier: "private" });
  const { code, out } = push();
  expect(code).toBe(0);
  expect(out).toContain("ANVC  sharing 1 record (1 kept, 0 abandoned) · 1 private stay here");
  expect(onRemote()).toContain("refs/anvc/");
});

test("a pre-push hook already there still runs first, and can still stop the push", async () => {
  const { repo, push } = setup();
  const hooks = join(repo, ".git", "hooks");
  const mark = join(repo, "theirs-ran");
  await writeFile(join(hooks, "pre-push"), `#!/bin/sh\ncat > /dev/null\ntouch "${mark}"\nexit 1\n`);
  await chmod(join(hooks, "pre-push"), 0o755);
  install(repo);
  expect(existsSync(join(hooks, "pre-push.before-anvc"))).toBe(true);
  expect(readFileSync(join(hooks, "pre-push"), "utf8")).toContain("anvc");
  // Theirs says no, so the push fails whatever anvc thinks.
  expect(push().code).not.toBe(0);
  expect(existsSync(mark)).toBe(true);
  // Installing again does not wrap the wrapper.
  install(repo);
  expect(readFileSync(join(hooks, "pre-push.before-anvc"), "utf8")).toContain("theirs-ran");
});

test("private history doesn't leave under another name", async () => {
  const { repo, remote, push, record } = setup();
  install(repo);
  appendRecord(repo, record("kept on this machine"), { tier: "private" });
  place(repo, "refs/anvc-raw/laptop/2026-09-29", '{"prompt":"what I typed"}\n');
  for (const refspec of ["refs/anvc-private/*:refs/anvc/*", "refs/anvc-raw/*:refs/heads/raw/*"]) {
    const { code, out } = push("origin", refspec);
    expect(code).not.toBe(0);
    expect(out).toContain("private history only goes to the remote anvc sync uses");
  }
  expect(git(remote, "for-each-ref")).toBe("");
});

test("private history does go to the remote anvc sync uses", async () => {
  const { repo, push, record } = setup();
  install(repo);
  const mine = gitRepo({ bare: true });
  git(repo, "remote", "add", "mine", mine);
  git(repo, "config", "anvc.privateRemote", "mine");
  appendRecord(repo, record("kept on this machine"), { tier: "private" });
  const { code, out } = push("mine", "refs/anvc-private/*:refs/anvc-private/*");
  expect({ code, out }).toMatchObject({ code: 0 });
  expect(git(mine, "for-each-ref", "--format=%(refname)")).toContain("refs/anvc-private/");
});

test("something under refs/anvc/ that isn't a record stops the push", async () => {
  const { repo, push, onRemote } = setup();
  install(repo);
  place(repo, "refs/anvc/s/000001", "not a record, so nothing can check it");
  const { code, out } = push();
  expect(code).not.toBe(0);
  expect(out).toContain("refs/anvc/s/000001 isn't a record");
  expect(onRemote()).toBe("");
});

test("the check runs the ANVC a session start named last, so an update doesn't turn it off", () => {
  const { repo, push } = setup();
  install(repo);
  expect(readFileSync(join(repo, ".git", "hooks", "pre-push"), "utf8")).not.toContain(CLI);
  // The next version's session start names its own command line.
  const next = join(tmp("anvc-next-"), "cli.js");
  writeFileSync(next, `console.log("the next version", process.argv[2]);\n`);
  writeFileSync(pointerFile(), next);
  expect(push().out).toContain("the next version pre-push");

  // With none there, the push goes through and says why nothing checked it.
  writeFileSync(pointerFile(), join(repo, "gone.js"));
  const gone = push();
  expect(gone.code).toBe(0);
  expect(gone.out).toContain("push check skipped");
  writeFileSync(pointerFile(), CLI);
});

test("a session start writes again a check that named the version it ran", async () => {
  const { repo, push } = setup();
  const hook = join(repo, ".git", "hooks", "pre-push");
  const old = join(tmp("anvc-old-"), "0.4.9", "dist", "cli.js");
  await writeFile(hook, `#!/bin/sh\n# anvc: runs the pre-push hook that was here first, then checks the records\ninput=$(cat)\nif [ ! -f "${old}" ]; then\n  echo "anvc: push check skipped; ANVC moved." >&2\n  exit 0\nfi\n`);
  await chmod(hook, 0o755);
  expect(push("origin", "main").out).toContain("ANVC moved");
  runHook("inject", "SessionStart", { hook_event_name: "SessionStart", session_id: "s1", cwd: repo, source: "startup" });
  expect(readFileSync(hook, "utf8")).not.toContain(old);
  expect(existsSync(`${hook}.before-anvc`)).toBe(false);
  appendRecord(repo, rec({ intent: { goal: "Call the pricing API" } }));
  expect(push("origin", "refs/anvc/*:refs/anvc/*").out).toContain("ANVC  sharing 1 record");
}, 30_000);
