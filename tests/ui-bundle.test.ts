/**
 * The page has to bundle and serve from a fresh clone.
 *
 * Moving from one hand-written HTML file to Preact components traded a
 * guarantee ("it is a string, it cannot fail to build") for a bundler step.
 * Bun runs that step on the fly from the HTML import, so there is still no
 * build command — but a broken import or a JSX misconfiguration would now be
 * a runtime failure that no other test would catch, and the symptom is a blank
 * page rather than an error.
 */
import { expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Options } from "../protocol/options";
import { shellWord } from "../protocol/args";
import { anvcCommand } from "../protocol/version";
import { git, gitRepo, tmp, tool, uiFetch, uiPost } from "./helpers";

const SERVER = resolve(import.meta.dir, "../server/inspect.ts");

/** Reads a process's output until `pattern` appears, and returns the match and everything so far. */
async function readUntil(stream: ReadableStream<Uint8Array>, pattern: RegExp): Promise<{ match: RegExpMatchArray; out: string }> {
  const reader = stream.getReader();
  let out = "";
  for (;;) {
    const match = out.match(pattern);
    if (match) { reader.releaseLock(); return { match, out }; }
    const { value, done } = await reader.read();
    if (done) throw new Error(`the server exited: ${out}`);
    out += new TextDecoder().decode(value);
  }
}

/** Starts the real server on a free port it picks itself, and returns its origin. */
async function serve(env: Record<string, string | undefined> = process.env, repo = resolve(import.meta.dir, "..")): Promise<{ origin: string; out: string; stop: () => void }> {
  const proc = Bun.spawn(["bun", SERVER, "--repo", repo, "--port", "0"], { env, stdout: "pipe", stderr: "pipe" });
  try {
    const { match, out } = await readUntil(proc.stdout, /anvc on (http:\/\/127\.0\.0\.1:\d+)\n/);
    return { origin: match[1]!, out, stop: () => proc.kill() };
  } catch (error) { proc.kill(); throw error; }
}

test("the page bundles its TSX and CSS with no build step", async () => {
  const { origin, stop } = await serve();
  try {
    const page = await (await uiFetch(origin)).text();

    // Bun rewrites the module script to a hashed bundle. Seeing `ui.tsx` in
    // the response means bundling silently did not happen and the browser
    // would be asked to parse TypeScript.
    expect(page).not.toContain("ui.tsx");
    const js = page.match(/src="([^"]+\.js)"/)?.[1];
    const css = page.match(/href="(\/[^"]+\.css)"/)?.[1];
    expect(js).toBeTruthy();
    expect(css).toBeTruthy();

    // And both have to actually serve, not just be referenced.
    const bundle = await uiFetch(`${origin}${js}`);
    expect(bundle.status).toBe(200);
    const code = await bundle.text();
    // Proof our components are in there rather than an empty shell: strings
    // that only exist in ui.tsx and widgets.tsx.
    expect(code).toContain("Untitled attempt");
    expect(code).toContain("anvc_checkpoint");

    const sheet = await uiFetch(`${origin}${css}`);
    expect(sheet.status).toBe(200);
    // The palette is the part of the old UI worth keeping; a component
    // library would have replaced it.
    expect(await sheet.text()).toContain("--kept");

    expect(page).toContain('id="root"');

    // Run from a clone, the page's commands name its CLI by path, so they work outside the clone.
    expect(await (await uiFetch(`${origin}/api/version`)).json()).toMatchObject({
      managed: "git", cli: `bun ${shellWord(resolve(import.meta.dir, "../protocol/cli.ts"))}`,
    });
  } finally { stop(); }
}, 60_000);

test("every field the page reads is in the API payload", async () => {
  const { origin, stop } = await serve();
  try {
    const data = await (await uiFetch(`${origin}/api/repo`)).json();
    expect(data).toHaveProperty("forge");
    expect(Array.isArray(data.turns)).toBe(true);

    if (data.turns.length) {
      // A missing field renders as blank rather than throwing, so the UI would
      // look merely empty. Checked explicitly for that reason.
      for (const field of [
        "id", "run", "start", "seconds", "status", "intent", "authored",
        "anchorCommit", "why", "constraints", "reads", "writes", "shells",
        "filesWritten", "actions",
      ]) {
        expect(data.turns[0]).toHaveProperty(field);
      }
    }
  } finally { stop(); }
}, 60_000);

test("folders can be switched only from the page, and only ones ANVC has run in", async () => {
  const { origin, stop } = await serve();
  try {
    const listed = (await (await uiFetch(`${origin}/api/folders`)).json()) as { current: string; folders: Array<{ repo: string }> };
    expect(listed.folders.map((f) => f.repo)).toContain(listed.current);
    const post = (body: object, headers?: Record<string, string>) => uiPost(`${origin}/api/folders`, body, headers);
    expect((await post({ repo: listed.current, on: true }, {})).status).toBe(403);
    expect((await post({ repo: "/etc", open: true })).status).toBe(400);
    // A sandboxed frame sends "Origin: null", which used to crash the guard.
    // Past the guard this body would get a 400, so 403 means it refused.
    expect((await post({ repo: "/etc" }, { "x-anvc": "1", origin: "null" })).status).toBe(403);
  } finally { stop(); }
});

test("the Folders page sets up a repository it found, and refuses any other path", async () => {
  const home = realpathSync(tmp("anvc-found-home-"));
  const [known, other] = ["known", "other"].map((name) => join(home, "Gits", name));
  for (const repo of [known!, other!]) { mkdirSync(repo, { recursive: true }); git(repo, "init", "-q"); }
  const state = join(home, ".anvc");
  mkdirSync(state);
  // Set up one project at a time, with Codex.
  writeFileSync(join(state, "installs.json"), JSON.stringify([{ repo: known, agent: "codex", hooks: 6, ts: "2026-09-30T00:00:00Z" }]));
  const env = { ...process.env, HOME: home, ANVC_STATE_HOME: state, CLAUDE_CONFIG_DIR: join(home, ".claude"), CODEX_HOME: join(home, ".codex") };
  const { origin, stop } = await serve(env, known);
  try {
    const found = async () => (await (await uiFetch(`${origin}/api/folders/found`)).json()) as { found: Array<{ repo: string; state: string }> };
    expect((await found()).found).toMatchObject([{ repo: other, state: "none" }]);
    const post = (path: string, body: object, headers?: Record<string, string>) => uiPost(`${origin}${path}`, body, headers);
    const plan = (repo: string) => uiFetch(`${origin}/api/folders/setup?repo=${encodeURIComponent(repo)}`);

    expect((await post("/api/folders/setup", { repo: other }, {})).status).toBe(403);
    expect((await post("/api/folders/found", { add: home }, {})).status).toBe(403);
    // Only a repository on the found list: not a known one, and not any other path.
    for (const repo of ["/etc", known!, join(other!, ".."), `${other}/`]) {
      expect((await post("/api/folders/setup", { repo })).status).toBe(400);
      expect((await plan(repo)).status).toBe(400);
      expect((await post("/api/folders/found", { repo, on: false })).status).toBe(400);
    }
    expect((await post("/api/folders/found", { add: "relative/path" })).status).toBe(400);
    expect(existsSync(join(other!, ".codex"))).toBe(false);

    const { changes } = (await (await plan(other!)).json()) as { changes: string[] };
    expect(changes).toContain(".git/info/exclude: add .codex/hooks.json");
    expect(existsSync(join(other!, ".codex"))).toBe(false);
    expect((await post("/api/folders/setup", { repo: other })).status).toBe(200);
    expect(existsSync(join(other!, ".codex", "hooks.json"))).toBe(true);
    expect((await found()).found).toMatchObject([{ repo: other, state: "project" }]);
  } finally { stop(); }
}, 60_000);

test("only this server's own names are answered, and nothing may frame it", async () => {
  const { origin, stop } = await serve();
  try {
    const port = new URL(origin).port;
    // After a DNS rebinding, another site's requests arrive carrying its name.
    expect((await uiFetch(`${origin}/api/repo`, { headers: { host: `attacker.example:${port}` } })).status).toBe(403);
    expect((await uiFetch(`${origin}/api/repo`, { headers: { host: `localhost:${port}` } })).status).toBe(200);
    for (const path of ["/", "/api/repo", "/nowhere"]) {
      const response = await uiFetch(`${origin}${path}`);
      expect(response.headers.get("content-security-policy")).toBe("frame-ancestors 'none'");
      expect(response.headers.get("x-frame-options")).toBe("DENY");
    }
    // A folder is not a document: a plain 4xx, not a filesystem error.
    const folder = await uiFetch(`${origin}/api/check?path=server`);
    expect(folder.status).toBe(400);
    expect(JSON.stringify(await folder.json())).not.toContain("EISDIR");
  } finally { stop(); }
}, 60_000);

test("without the token, the API answers 401 and a page says how to open it", async () => {
  const { origin, stop } = await serve();
  try {
    expect((await fetch(`${origin}/api/repo`)).status).toBe(401);
    const page = await fetch(origin);
    expect(page.status).toBe(401);
    const text = await page.text();
    expect(text).toContain("/anvc:open");
    expect(text).toContain(`${anvcCommand()} open</code> in a terminal`);
    expect(text).not.toContain('id="root"');
    // A wrong one, in either place, is the same as none.
    expect((await fetch(`${origin}/api/repo`, { headers: { "x-anvc-token": "wrong" } })).status).toBe(401);
    expect((await fetch(`${origin}/api/repo`, { headers: { cookie: "anvc_ui=wrong" } })).status).toBe(401);
  } finally { stop(); }
}, 60_000);

test("the link's token becomes a cookie and leaves the address bar", async () => {
  const { origin, stop } = await serve();
  try {
    const token = process.env.ANVC_UI_TOKEN!;
    const signIn = await fetch(`${origin}/?view=map&t=${token}`, { redirect: "manual" });
    // A page that moves on, so the desktop app's first, cross-site request
    // still ends signed in: a redirect from it doesn't send a Strict cookie.
    expect(signIn.status).toBe(200);
    expect(await signIn.text()).toContain('location.replace("/?view=map")');
    const cookie = signIn.headers.get("set-cookie")!;
    expect(cookie).toStartWith(`anvc_ui=${token};`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    const jar = { cookie: cookie.split(";")[0]! };
    expect((await fetch(`${origin}/api/repo`, { headers: jar })).status).toBe(200);
    expect(await (await fetch(origin, { headers: jar })).text()).toContain('id="root"');

    // A wrong token leaves the address bar too, and signs nothing in.
    const wrong = await fetch(`${origin}/?t=wrong`, { redirect: "manual" });
    expect(await wrong.text()).toContain('location.replace("/")');
    expect(wrong.headers.get("set-cookie")).toBeNull();
  } finally { stop(); }
}, 60_000);

test("without ANVC_UI_TOKEN, the token is made once, readable only by this user, and kept", async () => {
  const state = join(tmp("anvc-ui-state-"), "state");
  const env: Record<string, string | undefined> = { ...process.env, ANVC_STATE_DIR: state };
  delete env.ANVC_UI_TOKEN;
  const file = join(state, "ui-token");
  const tokens: string[] = [];
  for (let start = 0; start < 2; start++) {
    const { origin, out, stop } = await serve(env);
    try {
      const token = readFileSync(file, "utf8").trim();
      tokens.push(token);
      expect(out).not.toContain(token);
      expect((await fetch(`${origin}/api/repo`, { headers: { "x-anvc-token": token } })).status).toBe(200);
    } finally { stop(); }
  }
  expect(tokens[0]).toMatch(/^[0-9a-f]{64}$/);
  expect(tokens[1]).toBe(tokens[0]!);
  // Windows has no POSIX file modes.
  if (process.platform !== "win32") {
    expect(statSync(file).mode & 0o777).toBe(0o600);
    expect(statSync(state).mode & 0o777).toBe(0o700);
  }
}, 60_000);

test("with --port 0 it binds a free port and prints it for the desktop app, without the token", async () => {
  const proc = Bun.spawn(["bun", SERVER, "--repo", resolve(import.meta.dir, ".."), "--port", "0"], { stdout: "pipe", stderr: "pipe" });
  try {
    const { match, out } = await readUntil(proc.stdout, /anvc listening 127\.0\.0\.1:(\d+)\n/);
    expect(Number(match[1])).toBeGreaterThan(0);
    expect(out).not.toContain(process.env.ANVC_UI_TOKEN!);
    expect((await uiFetch(`http://127.0.0.1:${match[1]}/api/repo`)).status).toBe(200);
  } finally { proc.kill(); }
}, 60_000);

test("a port range skips a port that's in use", async () => {
  // Held the way another of these servers would be, willing to share it.
  const taken = Bun.serve({ hostname: "127.0.0.1", port: 0, reusePort: true, fetch: () => new Response() });
  const range = `${taken.port}-${taken.port! + 5}`;
  const proc = Bun.spawn(["bun", SERVER, "--repo", resolve(import.meta.dir, ".."), "--port", range], { stdout: "pipe", stderr: "pipe" });
  try {
    const { match } = await readUntil(proc.stdout, /anvc listening 127\.0\.0\.1:(\d+)\n/);
    expect(Number(match[1])).toBeGreaterThan(taken.port!);
    expect(Number(match[1])).toBeLessThanOrEqual(taken.port! + 5);
    expect((await uiFetch(`http://127.0.0.1:${match[1]}/api/repo`)).status).toBe(200);
  } finally { proc.kill(); taken.stop(true); }
}, 60_000);

test("Settings turns git push, the push check and the AGENTS.md lines on and off, only from the page", async () => {
  const repo = gitRepo({ commit: true });
  git(repo, "remote", "add", "origin", "git@github.com:x/y.git");
  writeFileSync(join(repo, "AGENTS.md"), "# Rules\n");
  const { origin, stop } = await serve(process.env, repo);
  try {
    const post = (body: object, headers?: Record<string, string>) => uiPost(`${origin}/api/options`, body, headers);
    const now = async (r: Response) => Object.fromEntries(((await r.json()) as Options).settings.map((s) => [s.key, s.here]));
    // Another page can't send the header without a preflight this server never answers.
    expect((await post({ key: "push", on: true }, {})).status).toBe(403);
    // Updating runs git and bun, so it's refused the same way. (Allowed, it
    // would pull this checkout, so the test stops here.)
    expect((await uiFetch(`${origin}/api/update`, { method: "POST" })).status).toBe(403);
    expect(await now(await post({ key: "push", on: true }))).toMatchObject({ push: "on" });
    expect(git(repo, "config", "--get-all", "remote.origin.push")).toContain("refs/anvc/*:refs/anvc/*");
    for (const key of ["prepush", "instructions"]) expect(await now(await post({ key, on: true }))).toMatchObject({ [key]: "on" });
    for (const key of ["push", "prepush", "instructions"]) expect(await now(await post({ key, on: false }))).toMatchObject({ [key]: "off" });
    expect(readFileSync(join(repo, "AGENTS.md"), "utf8")).toBe("# Rules\n");
    expect((await post({ key: "folder", on: false })).status).toBe(400);
  } finally { stop(); }
}, 60_000);

test("the tour and the first choice are seen once per computer, and only the desktop app opens a window", async () => {
  // Kept outside the page, whose storage is per port: a second window is on the next one.
  const { origin, stop } = await serve({ ...process.env, ANVC_STATE_HOME: tmp("anvc-seen-") }, gitRepo({ commit: true }));
  try {
    const seen = async () => (await uiFetch(`${origin}/api/seen`)).json();
    expect(await seen()).toEqual({});
    expect((await uiPost(`${origin}/api/seen`, { key: "tour" }, {})).status).toBe(403);
    expect(await (await uiPost(`${origin}/api/seen`, { key: "tour" })).json()).toEqual({ tour: true });
    expect((await uiPost(`${origin}/api/seen`, { key: "anything" })).status).toBe(400);
    expect(await seen()).toEqual({ tour: true });
    // Outside the desktop app there's no app to start.
    expect((await uiPost(`${origin}/api/window`, {})).status).toBe(403);
  } finally { stop(); }
}, 60_000);

test("Approve goals is a switch in Settings, and the page answers what an agent proposed", async () => {
  const repo = gitRepo({ commit: true });
  const { origin, stop } = await serve(process.env, repo);
  try {
    const post = (path: string, body: object) => uiPost(`${origin}${path}`, body);
    const here = async (r: Response) => ((await r.json()) as Options).settings.find((s) => s.key === "approvegoals")?.here;
    expect(await here(await post("/api/options", { key: "approvegoals", on: true }))).toBe("on");
    const id = /id ([0-9A-Z]{26})/.exec(tool(repo, "anvc_goal", { title: "Ship the Project page" }))![1]!;
    type Goals = { goals: Array<{ id: string; status: string; proposal: object | null }> };
    expect(((await (await uiFetch(`${origin}/api/goals`)).json()) as Goals).goals[0]!.proposal).toMatchObject({ added: true });
    expect(((await (await post("/api/goals", { id, answer: "accept" })).json()) as Goals).goals[0]).toMatchObject({ id, status: "todo", proposal: null });
    expect((await post("/api/goals", { id, answer: "maybe" })).status).toBe(400);
    expect(await here(await post("/api/options", { key: "approvegoals", on: false }))).toBe("off");
  } finally { stop(); }
}, 60_000);
