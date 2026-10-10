/**
 * The CLI, exercised as a subprocess.
 *
 * It had no coverage, and that is how a refactor broke `anvc tried` without a
 * single test failing: `positional` was removed while every query function it
 * calls stayed green. The CLI runs its dispatch at import time, so the only
 * honest way to test it is to run it the way a person does.
 */
import { expect, test } from "bun:test";
import { join, resolve } from "node:path";
import { writeRecord } from "../protocol/record";
import { cli, gitRepo, rec, setEnv, tmp } from "./helpers";

function fixture(): string {
  const repo = gitRepo({ bare: true });
  const session = { agent: "claude-code", run_id: "sess-a" };
  writeRecord(repo, rec({
    session,
    intent: { prompt: "remove the mutex around the ref cache" },
    delta: { files: ["refs/cache.ts"] },
    outcome: { status: "abandoned", errors: ["data race under five writers"], recheck: "bun test tests/concurrency.test.ts" },
  }), 1);
  writeRecord(repo, rec({
    session,
    intent: { goal: "keep the mutex, shrink the critical section" },
    delta: { files: ["refs/cache.ts"] },
    outcome: { status: "kept", tests: { passed: 48, failed: 0 } },
  }), 2);
  return repo;
}

test("every query subcommand reaches its records", async () => {
  const repo = fixture();
  // A multi-word term: the regression that shipped was in joining these.
  const tried = cli(repo, "tried", "shrink the critical section");
  expect(tried.out).toContain("keep the mutex");
  expect(tried.out).not.toContain("ReferenceError");

  // A single positional argument. The scraped record has no goal to show —
  // it is found by what was said, and listed by its outcome and files.
  expect(cli(repo, "why", "refs/cache.ts").out).toContain("refs/cache.ts");
  expect(cli(repo, "abandoned", "refs/cache.ts").out).toContain("data race");
  expect(cli(repo, "session", "sess-a").out).toContain("keep the mutex");

  // No positional argument at all.
  expect(cli(repo, "failed").out).toContain("data race");
  expect(cli(repo, "red-to-green").out).toContain("keep the mutex");

  // Summaries, which read the index rather than rendering hits.
  expect(cli(repo, "stats").out).toMatch(/records 2/);
  expect(cli(repo, "overlap").out).toMatch(/session pairs: \d+/);

  // An unknown command prints usage rather than failing.
  expect(cli(repo, "nonsense").out).toContain("anvc — checkpoint records");
}, 60_000);

test("a flag is never swallowed as a positional argument", async () => {
  const repo = fixture();
  // `--repo` is appended by cli(), so this is `tried <nothing> --repo DIR`.
  // The copy of flag() that lacked the "--" guard took the next flag as a
  // value, which made the term the literal string "--repo".
  const out = cli(repo, "tried", "mutex").out;
  expect(out).toContain("keep the mutex");
  expect(out).not.toContain("--repo");
}, 30_000);

test("the agent's own goal is shown as intent", async () => {
  const repo = fixture();
  // An authored goal used to render as "—" because consumers read the
  // captured-prompt field. The index now carries which one it is.
  expect(cli(repo, "tried", "shrink").out).toContain("intent: keep the mutex");
}, 30_000);

test("every command the README and the guide tell people to run exists", async () => {
  // The README and the setup banner both advertised `anvc dead-ends`, which
  // has never been a CLI command — it exists only as an MCP tool. It was the
  // second line of the install instructions, so the first thing a new user
  // copied printed usage text at them. Nothing caught it, because the docs
  // were not executable.
  const root = resolve(import.meta.dir, "..");
  const guide = [...new Bun.Glob("docs/guide/*.md").scanSync(root)];
  const sources = [
    await Bun.file(join(root, "README.md")).text(),
    await Bun.file(join(root, "scripts/setup.ts")).text(),
    ...(await Promise.all(guide.map((f) => Bun.file(join(root, f)).text()))),
  ];

  const advertised = new Set<string>();
  for (const text of sources) {
    for (const [, name] of text.matchAll(/\banvc ([a-z][a-z-]*)/g)) advertised.add(name);
  }
  // `init` mutates git config and `ingest` reads a capture directory; both are
  // covered elsewhere. `setup` is a separate script's banner, not a
  // subcommand. Everything else must answer for itself.
  // `update` pulls this very checkout, which a test must never do. `on` and
  // `off` switch a working folder, which the bare fixture doesn't have; they
  // are covered in folders.test.ts.
  // `run` executes its argument from this checkout and logs it; it's
  // covered, isolated, in runlog.test.ts.
  // `uninstall` changes the project it runs in; it has its own test. So do
  // `remove` and `restore`, covered in remove.test.ts.
  for (const skip of ["init", "ingest", "setup", "update", "on", "off", "run", "uninstall", "remove", "restore"]) advertised.delete(skip);
  expect(advertised.size).toBeGreaterThan(3);

  const repo = fixture();
  // `anvc tools` reads every agent's config under HOME; never the real one.
  const home = tmp("anvc-cli-home-");
  setEnv({ HOME: home, USERPROFILE: home, CODEX_HOME: undefined });
  // These take a record id, so the right answer to a file path is a refusal
  // that names the problem — not success, and not a crash.
  const takesId = new Set(["share", "unshare"]);
  const takesVerb = new Set(["policy", "retire", "local", "assist", "data", "result", "goal", "check", "push-check", "instructions", "rule", "tool", "status", "approve-goals", "desktop", "export", "updates"]);
  for (const name of advertised) {
    const { out, code } = cli(repo, name, "refs/cache.ts");
    if (takesId.has(name)) {
      expect(code).toBe(1);
      expect(out).toContain("not a record written here");
    } else if (name === "sync") {
      // No private remote set up yet: it says how, and sends nothing.
      expect(code).toBe(2);
      expect(out).toContain("Name a remote only you can read");
    } else if (name === "open") {
      // The bare fixture has no working folder, so no server starts; open.test.ts starts them.
      expect(code).toBe(1);
      expect(out).toContain("isn't in a git repository with a working folder");
    } else if (name === "forget") {
      expect(code).toBe(1);
      expect(out).toContain("no record");
    } else if (takesVerb.has(name)) {
      // A verb it doesn't know gets that command's own usage line.
      expect(code).toBe(2);
      expect(out).toContain(`usage: anvc ${name}`);
    } else {
      expect(code).toBe(0);
    }
    // Usage text is what an unknown command prints, so it is the failure
    // signal here rather than a crash.
    expect(out, `\`anvc ${name}\` is advertised but not implemented`)
      .not.toContain("anvc — checkpoint records");
  }
}, 60_000);

test("a policy value it can't take is refused in one line, not a stack trace", async () => {
  const repo = gitRepo();
  for (const args of [["retire", "notavalidmode"], ["set", "why", "everyone"], ["import", "nosuchpreset"]]) {
    const { out, code } = cli(repo, "policy", ...args);
    expect(code).toBe(1);
    expect(out.trim().split("\n")).toHaveLength(1);
  }
}, 30_000);
