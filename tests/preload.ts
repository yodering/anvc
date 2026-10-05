/**
 * Keeps tests out of the real ~/.anvc.
 *
 * The activity log is what the "anvc helped" stats count. Before this, one run
 * of the suite wrote 124 fixture rows into the real log, which would have
 * shown up as help anvc never gave. Every test process, and every hook or
 * server a test spawns with `...process.env`, now writes to a temp directory.
 */
import { afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The 30 s timeout Windows needs is --timeout in package.json's test script:
// setDefaultTimeout here reached only the first test file.

const scratch = mkdtempSync(join(tmpdir(), "anvc-test-home-"));
// In a preload, this runs once, after the last test file.
afterAll(() => rmSync(scratch, { recursive: true, force: true }));
process.env.ANVC_ACTIVITY_DIR ??= join(scratch, "activity");
process.env.ANVC_METRICS_DIR ??= join(scratch, "metrics");
process.env.ANVC_STATE_DIR ??= join(scratch, "state");
process.env.ANVC_CAPTURE_DIR ??= join(scratch, "capture");
process.env.ANVC_KEPT_DIR ??= join(scratch, "transcripts");
process.env.ANVC_STATE_HOME ??= join(scratch, "home");
// Setup and `anvc options` put the anvc command in ~/.local/bin otherwise.
process.env.ANVC_BIN_DIR ??= join(scratch, "bin");
process.env.ANVC_NO_UPDATE_NOTICE ??= "1";
// And out of the real ~/.claude, for anything that runs Claude Code's CLI.
process.env.CLAUDE_CONFIG_DIR ??= join(scratch, "claude");
// What a UI server a test starts asks for; uiFetch in helpers.ts sends it.
process.env.ANVC_UI_TOKEN ??= crypto.randomUUID();
// `anvc open` and anvc_open never start a real browser from a test.
process.env.ANVC_NO_BROWSER = "1";
// Run from inside an agent, the suite inherits its session: the MCP server
// then names the agent claude-code, where on CI it says unknown, and tests
// passed here that failed there. A test that needs an agent names it.
for (const name of ["CLAUDE_CODE_SESSION_ID", "CLAUDE_PLUGIN_ROOT", "CLAUDE_PROJECT_DIR", "ANVC_AGENT", "ANVC_SESSION"]) delete process.env[name];

// Bun starts a subprocess with the environment the test runner began with,
// not the one set above, unless one is passed. Tests that ran hooks or setup
// without passing it wrote into the real ~/.anvc: 55 fixture repositories
// landed in the real installs list. Every spawn now gets the current
// environment unless it names its own.
const withEnv = <T extends { env?: Record<string, string | undefined> }>(opts: T | undefined): T =>
  ({ ...(opts ?? {}), env: opts?.env ?? { ...process.env } }) as T;
const realSpawnSync = Bun.spawnSync;
const realSpawn = Bun.spawn;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Bun as any).spawnSync = (cmd: any, opts?: any) =>
  Array.isArray(cmd) ? realSpawnSync(cmd, withEnv(opts)) : realSpawnSync(withEnv(cmd));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Bun as any).spawn = (cmd: any, opts?: any) =>
  Array.isArray(cmd) ? realSpawn(cmd, withEnv(opts)) : realSpawn(withEnv(cmd));
