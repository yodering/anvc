#!/usr/bin/env bun
/**
 * anvc inspect — a read-only window on the checkpoint records.
 *
 *   anvc inspect [--repo .] [--port 7000]
 *
 * Every request needs the token from uiToken(), in a cookie or an
 * x-anvc-token header. The server listens on 127.0.0.1, where any other user
 * or process on this computer could otherwise read private records and
 * change settings.
 *
 * This is not a forge. There is no repository browsing, no pull requests, no
 * accounts. Its only job is to let a person see whether the records make sense:
 * whether captured intent reads like what was actually asked, and whether work
 * marked abandoned really was abandoned. A test cannot tell you that; a person
 * looking at it can.
 *
 * It also makes the records visible while they arrive, which is the part of a
 * demo that convinces people the system is real.
 */
import { checkResult, clearProjectDataMode, DATA_MODES, dataMode, everywhereDataMode, listResults, recordStatus, setDataMode, whence, type DataMode } from "../protocol/results";
import type { GoalStatus, ItemState, ResultStatus } from "../protocol/record";
import { addGoal, answerGoal, changeGoal, goalTree, setApproval } from "../protocol/goals";
import { addItem, changeItem, readStatus } from "../protocol/status";
import { clearProjectAssist, LEVELS, MOMENTS, readAssist, readEverywhere, writeAssist, type Level, type Moment } from "../protocol/assist";
import { isLocalOnly, setLocalOnly } from "../protocol/localonly";
import { join, resolve } from "node:path";
import { checkDocument } from "../protocol/check";
import { startServer } from "../protocol/open";
import { existsSync, statSync } from "node:fs";
import { addFolder, connectedAgents, foundView, setupAgents } from "../protocol/found";
import { AGENT_NAMES } from "../protocol/agents";
import { catchUp, earlierSessions } from "../protocol/catchup";
import { uninstallEverywhere } from "../protocol/uninstall";
import { configureRemote, gitOrNull, unconfigureRemote } from "../protocol/git";
import { addInstructions, removeInstructions } from "../protocol/instructions";
import { options, setupEverywhere, setupProject } from "../protocol/options";
import { installPrePush, removePrePush } from "../protocol/prepush";
import { forRepo, retirements } from "../protocol/query";
import { addRule, changeRule, listRules, parseApplies, parseFrom, removeRule, ruleFiles, ruleText } from "../protocol/rules";
import { absorbView, clearProjectAbsorbMode, setAbsorbMode, type AbsorbMode } from "../protocol/absorb";
import { personDecide } from "../protocol/retire";
import { anvcCommand, checkDaily, desktopFile, HOME, hooksBehind, installs, managedBy, readUpdate, stateHome, update, version } from "../protocol/version";
import { repoRoot } from "../protocol/activity";
import { exportPolicy, FIELDS, importPolicy, PRESETS, readPolicy, writePolicy, type Policy } from "../protocol/policy";
import { folderOn, folders, setFolder } from "../protocol/folders";
import { flag, shellWord } from "../protocol/args";
import { tierFacts } from "../protocol/tiers";
import { helpedView, mapView, repoView, statsView } from "./api";
import { below, isRepo, readJson, tokenProof, uiToken, writeJson } from "../protocol/rawlog";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { currentNotes, inventory, tilde, writeNote } from "../protocol/tools";
import { sourcesView } from "../protocol/sources";
import { backups, removalPlan, remove, restore } from "../protocol/remove";

const argv = process.argv.slice(2);
// Both change when the person opens another folder from the Folders page.
let repo = resolve(flag(argv, "repo", process.env.ANVC_REPO ?? process.cwd()));
let root = repoRoot(repo) ?? repo;
// 0 is any free port. A range such as 7431-7450 is the first free port in it,
// then any: the desktop app asks for one, because the page's browser storage
// is keyed by origin and a new port every launch forgot the sidebar's width
// and filters. Binding here, instead of the app finding a free port and passing it,
// leaves no moment in which another process can take that port.
const [low, high = low] = flag(argv, "port", "7000").split("-").map((n) => Number.parseInt(n, 10));
const ports = high > low ? [...Array.from({ length: high - low + 1 }, (_, i) => low + i), 0] : [low];
const token = uiToken();

/**
 * Exit when whatever started this server goes away.
 *
 * The desktop app runs this as a sidecar and kills it on a clean close, but a
 * clean close is not the only way an app ends. Measured: a SIGTERM to the app
 * left this server running, orphaned, still holding its port. A process that
 * dies by any means closes its pipes, so the app keeps this one's stdin open
 * and its end-of-file is the signal — which no cleanup code has to survive to
 * send.
 *
 * Opt-in, because `bun run ui` starts the server detached with no stdin, and
 * there end-of-file arrives immediately and means nothing.
 */
if (argv.includes("--exit-with-parent")) {
  void (async () => {
    const reader = Bun.stdin.stream().getReader();
    try { while (!(await reader.read()).done) { /* nothing is sent; only the close matters */ } }
    catch { /* a broken pipe is the same news */ }
    process.exit(0);
  })();
}

// Bun bundles the page's TSX and CSS on the fly from this import, so there is
// still no build step: a fresh clone runs `bun server/inspect.ts` and works.
// Measured at 2 ms to bundle, so the convenience costs nothing.
import repoPage from "./ui.html";

// A route's response can't carry extra headers, and routes never reach fetch
// below. So Bun serves the bundled page at a path nobody can guess, and "/"
// passes it through fetch like everything else.
const PAGE = `/_page/${crypto.randomUUID()}`;

/** The index is derived from the refs, so rebuilding is how new records appear. */
let withIndex = forRepo(repo);

/** Setup, in a clone. The plugin and the desktop app have none on disk. */
const SETUP = join(HOME, "scripts", "setup.ts");

const gitOk = (path: string) =>
  Bun.spawnSync(["git", "-C", path, "rev-parse", "--git-dir"], { stdout: "ignore", stderr: "ignore", windowsHide: true }).success;

/** No other site may put this page in a frame and trick a click through it. */
const unframed = (response: Response) => {
  response.headers.set("content-security-policy", "frame-ancestors 'none'");
  response.headers.set("x-frame-options", "DENY");
  return response;
};

/** Whether a request carries the token, compared in constant time so the answer's timing can't give it away. */
const signedIn = (given: string | null | undefined) => {
  const a = Buffer.from(given ?? ""), b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * Codes that each sign in one browser, for `anvc open`. It starts the browser
 * with the link as a command's argument, which any user on this computer can
 * read while it runs, so that link carries a code that works once and for a
 * minute, and the token is never on a command line.
 */
const codes = new Map<string, number>();
const newCode = () => {
  for (const [code, until] of codes) if (until < Date.now()) codes.delete(code);
  const code = randomBytes(32).toString("hex");
  codes.set(code, Date.now() + 60_000);
  return code;
};
const redeem = (code: string) => {
  const until = codes.get(code);
  codes.delete(code);
  return until !== undefined && until >= Date.now();
};

const SIGN_IN = `<!doctype html><meta charset="utf-8"><meta name="color-scheme" content="light dark"><title>anvc</title>
<body style="font: 16px/1.5 system-ui, sans-serif; max-width: 34em; margin: 4em auto; padding: 0 1em">
<p>To sign in, run <code>/anvc:open</code> in Claude Code or <code>${anvcCommand()} open</code> in a terminal.</p>`;

const listen = (port: number) => Bun.serve({
  routes: { [PAGE]: repoPage },
  hostname: "127.0.0.1",
  port,
  // Otherwise Bun can share a port with a server already on it. Measured: two
  // of these both listened on 7431 and split the requests between them. A
  // taken port has to fail, so the range above moves on to the next.
  reusePort: false,
  // Development mode answers a crash with an error page that shows the stack
  // and the paths on this computer.
  development: false,
  async fetch(request, self) {
    // A site can point its own name at 127.0.0.1 (DNS rebinding). Its requests
    // then come from its own origin and carry its name in Host, so they pass
    // the Origin check in fromPage() and can read every answer here. Only the
    // names this server really has are answered.
    const host = request.headers.get("host");
    if (host !== `127.0.0.1:${self.port}` && host !== `localhost:${self.port}`) {
      return unframed(Response.json({ error: "refused: this server only answers to 127.0.0.1 and localhost" }, { status: 403 }));
    }
    const url = new URL(request.url);
    const api = url.pathname.startsWith("/api/");
    // The link `bun run ui` prints carries the token once, and the one
    // `anvc open` starts a browser with carries a code. Either becomes a
    // cookie and leaves the address bar, so it isn't left on screen or in the
    // history. A wrong one is dropped the same way.
    //
    // A page moves on to the address, where a redirect used to. The desktop
    // app's window comes from its own origin, so a browser counts its first
    // request here as cross-site, and a SameSite=Strict cookie isn't sent on
    // a redirect from that request: the app showed the sign-in page. The
    // page's own move is same-site, and location.replace keeps the token out
    // of the history as the redirect did.
    const t = url.searchParams.get("t");
    if (t !== null && !api) {
      url.searchParams.delete("t");
      const to = url.pathname + url.search;
      const moved = new Response(
        `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${to.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">`
          + `<script>location.replace(${JSON.stringify(to).replace(/</g, "\\u003c")})</script>`,
        { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer" } },
      );
      if (signedIn(t) || redeem(t)) moved.headers.set("set-cookie", `anvc_ui=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000`);
      return unframed(moved);
    }
    // anvc open asks this before sending the token, so a port someone else
    // took after this server stopped doesn't get it.
    const nonce = api && url.pathname === "/api/hello" ? url.searchParams.get("n") ?? "" : null;
    if (nonce !== null) {
      if (!/^[0-9a-f]{64}$/.test(nonce)) return unframed(Response.json({ error: "n must be 64 hex digits" }, { status: 400 }));
      return unframed(Response.json({ proof: tokenProof(token, self.port!, nonce) }));
    }
    const cookie = new Bun.CookieMap(request.headers.get("cookie") ?? "").get("anvc_ui");
    if (!signedIn(request.headers.get("x-anvc-token") ?? cookie)) {
      return unframed(api
        ? Response.json({ error: "not signed in: open the link that bun run ui prints" }, { status: 401 })
        : new Response(SIGN_IN, { status: 401, headers: { "content-type": "text/html; charset=utf-8" } }));
    }
    return unframed(await answer(request, self.port));
  },
  error() {
    return unframed(Response.json({ error: "Something went wrong in the ANVC server." }, { status: 500 }));
  },
});

let server!: ReturnType<typeof listen>;
for (const port of ports) {
  try { server = listen(port); break; }
  catch (error) { if (port === ports.at(-1)) throw error; }
}

async function answer(request: Request, ownPort: number | undefined): Promise<Response> {
  const url = new URL(request.url);
  const q = url.searchParams;

  if (url.pathname === "/") {
    const page = await fetch(`http://127.0.0.1:${ownPort}${PAGE}`);
    return new Response(page.body, page);
  }

  // Every handler reports a caught error the same way.
  const attempt = async (fn: () => unknown, status = 400) => {
    try { return Response.json(await fn()); }
    catch (error) { return Response.json({ error: error instanceof Error ? error.message : "unreadable" }, { status }); }
  };

  // "all" is capped at 1000 attempts and polled like the rest; page it if a repository outgrows that.
  if (url.pathname === "/api/repo") return Response.json(repoView(repo, url.searchParams.has("all") ? 1000 : 40));
  // Laid out server-side; the browser receives coordinates, not a layout engine.
  if (url.pathname === "/api/tiers") return attempt(() => tierFacts(repo));
  if (url.pathname === "/api/helped") return attempt(() => helpedView(repo));
  if (url.pathname === "/api/stats") return attempt(() => statsView(repo));

  /** Writes come only from this page: see the note on /api/policy. */
  const fromPage = () => {
    if (request.headers.get("x-anvc") !== "1") return false;
    const origin = request.headers.get("origin");
    if (!origin) return true;
    // A sandboxed frame sends "Origin: null", which is not a URL.
    try { return new URL(origin).host === url.host; } catch { return false; }
  };

  /**
   * A route that anything signed in can read and only this page can write
   * to. A POST's JSON body goes to `write`, and the answer is what `write`
   * returns or, when it returns nothing, what `read` reads afterwards.
   */
  const route = async <B>(refused: string, read: () => unknown, write: (body: B) => unknown) => {
    if (request.method !== "POST") return attempt(read);
    if (!fromPage()) return Response.json({ error: refused }, { status: 403 });
    return attempt(async () => (await write((await request.json().catch(() => ({}))) as B)) ?? read());
  };

  // Every folder ANVC has run in, with its switch. Only folders on this list
  // can be switched or opened, so the page can't be used to point the server
  // at an arbitrary path.
  if (url.pathname === "/api/folders") {
    const list = () => {
      const all = folders();
      return all.some((f) => f.repo === root) ? all : [{ repo: root, on: true, seen: new Date().toISOString() }, ...all];
    };
    if (request.method === "POST") {
      if (!fromPage()) return Response.json({ error: "refused: folders can only be changed from the anvc page" }, { status: 403 });
      const body = (await request.json().catch(() => ({}))) as { repo?: string; on?: boolean; open?: boolean };
      const target = list().find((f) => f.repo === body.repo);
      if (!target) return Response.json({ error: "not a folder ANVC has run in" }, { status: 400 });
      if (typeof body.on === "boolean") setFolder(target.repo, body.on);
      if (body.open) {
        if (!gitOk(target.repo)) return Response.json({ error: `${target.repo} is no longer a git repository` }, { status: 400 });
        repo = target.repo;
        root = repoRoot(repo) ?? repo;
        withIndex = forRepo(repo);
      }
    }
    return Response.json({ current: root, folders: list(), local: isLocalOnly(repo) });
  }

  // Git repositories ANVC hasn't run in, found near the ones it has, and
  // what each needs. Switching or setting one up names a repository on this
  // list, never any other path.
  const found = () => foundView([root, ...folders().map((f) => f.repo)], existsSync(SETUP));
  const listed = (given: unknown) => found().found.find((f) => f.repo === given);
  if (url.pathname === "/api/folders/found") {
    return route<{ add?: unknown; repo?: unknown; on?: unknown }>("refused: folders can only be changed from the anvc page", found, (body) => {
      if (typeof body.add === "string") addFolder(body.add);
      else {
        const target = listed(body.repo);
        if (!target || typeof body.on !== "boolean") throw new Error("needs a repository from the list, and on: true or false");
        setFolder(target.repo, body.on, false);
      }
    });
  }
  // Setup for one of those repositories, or ANVC for every project, and
  // taking that out again. A GET is the dry run: what it will change, from
  // setup's own --dry-run. A POST does it.
  if (url.pathname === "/api/folders/setup") {
    const post = request.method === "POST";
    if (post && !fromPage()) return Response.json({ error: "refused: setup can only be run from the anvc page" }, { status: 403 });
    return attempt(async () => {
      const body = (post ? await request.json().catch(() => ({})) : { repo: q.get("repo"), everywhere: q.get("everywhere") }) as { repo?: unknown; everywhere?: unknown };
      if (body.everywhere === "remove") {
        const done = uninstallEverywhere({ dry: !post });
        return post
          ? { output: [...done.removed.map((l) => `✓ ${l}`), ...done.kept.map((l) => `· kept: ${l}`)].join("\n") }
          : { changes: done.removed, kept: done.kept };
      }
      let args: string[];
      if (body.everywhere === "install") args = setupEverywhere(setupAgents());
      else {
        const target = listed(body.repo);
        if (!target) throw new Error("not a repository on the Folders page");
        args = setupProject(target.repo, setupAgents());
      }
      if (!existsSync(SETUP)) throw new Error("Setup isn't on this computer. Run the command in your ANVC folder.");
      const run = Bun.spawnSync(["bun", SETUP, ...args, ...(post ? [] : ["--dry-run"])], { stdin: "ignore", stdout: "pipe", stderr: "pipe", windowsHide: true });
      const out = `${run.stdout}${run.stderr}`.trim();
      if (!run.success) throw new Error(out.split("\n").at(-1) || "setup failed");
      // Several agents each list the same change to git config or AGENTS.md.
      return post ? { output: tilde(out) } : { changes: [...new Set(out.split("\n").filter((l) => l.startsWith("- ")).map((l) => tilde(l.slice(2))))], kept: [] };
    });
  }

  // What the empty work log says: which agents have ANVC's hooks here, and
  // how many sessions from before there are to import. A POST imports them,
  // as `anvc catch-up` does.
  if (url.pathname === "/api/start") {
    return route("refused: sessions can only be imported from the anvc page",
      () => ({ agents: connectedAgents(root).map((a) => AGENT_NAMES[a]!), earlier: earlierSessions(root) }),
      () => {
        if (!folderOn(root)) throw new Error("ANVC is off for this project. Turn it on to import sessions.");
        const { failed, ...done } = catchUp(root);
        return { ...done, failed: failed.length };
      });
  }

  // How much ANVC does on its own, for this project and for every project.
  if (url.pathname === "/api/assist") {
    return route<{ scope?: string; level?: Level; moment?: Moment; on?: boolean; clear?: boolean }>("refused: this can only be changed from the anvc page",
      () => ({ project: readAssist(root), everywhere: readEverywhere(), levels: LEVELS, moments: MOMENTS }),
      (body) => {
        const target = body.scope === "everywhere" ? null : root;
        if (body.clear && target) clearProjectAssist(target);
        else writeAssist(target, { level: body.level, moment: body.moment, on: body.on });
      });
  }

  // Results: their standing, checked now, and the person's decisions about
  // them. Deciding is guarded like every other write.
  if (url.pathname === "/api/results") {
    return route<{ id?: string; status?: ResultStatus; why?: string; mode?: DataMode; scope?: string }>("refused: results can only be changed from the anvc page", () => {
      const all = listResults(root);
      return { data: dataMode(root), everywhere: everywhereDataMode(), modes: DATA_MODES, results: all.map((v) => ({ ...v, check: checkResult(root, v, all) })) };
    }, (body) => {
      if (body.mode) setDataMode(body.scope === "everywhere" ? null : root, body.mode);
      else if (body.scope === "follow") clearProjectDataMode(root);
      else if (body.id && body.status) recordStatus(root, body.id, body.status, body.why ?? "", { kind: "person" });
      else throw new Error("needs an id and a status, or a mode");
    });
  }
  // Goals and writing rules from the sessions: on, off, or which command runs it.
  if (url.pathname === "/api/absorb") {
    return route<{ mode?: AbsorbMode; scope?: string }>("refused: this can only be changed from the anvc page", () => absorbView(root), (body) => {
      if (body.mode) setAbsorbMode(body.scope === "everywhere" ? null : root, body.mode);
      else if (body.scope === "follow") clearProjectAbsorbMode(root);
      else throw new Error("needs a mode");
    });
  }
  // Goals: the person adds one, changes its status or title, or undoes a
  // change, which is a change back. Guarded like every other write.
  if (url.pathname === "/api/goals") {
    return route<{ id?: string; parent?: string; title?: string; status?: GoalStatus; why?: string; answer?: string }>("refused: goals can only be changed from the anvc page",
      () => ({ goals: goalTree(root) }),
      (body) => {
        if (body.answer && (!body.id || !["accept", "decline"].includes(body.answer))) throw new Error("an answer is accept or decline, with an id");
        if (body.id && body.answer) answerGoal(root, body.id, body.answer === "accept", body.why);
        else if (body.id) changeGoal(root, body.id, { title: body.title, status: body.status, why: body.why }, { kind: "person" });
        else addGoal(root, { title: String(body.title ?? ""), parent: body.parent, why: body.why }, { kind: "person" });
      });
  }
  // Status: the person adds an item to Up next, edits, moves or drops one.
  // Guarded like every other write.
  if (url.pathname === "/api/status") {
    return route<{ id?: string; title?: string; state?: ItemState; goal?: string | null; move?: "up" | "down" }>("refused: status can only be changed from the anvc page",
      () => readStatus(root),
      (body) => {
        const move = body.move === "up" || body.move === "down" ? body.move : undefined;
        if (body.id) changeItem(root, body.id, { title: body.title, state: body.state, goal: body.goal, move }, { kind: "person" });
        else addItem(root, { title: String(body.title ?? ""), goal: body.goal ?? undefined }, { kind: "person" });
      });
  }
  // Writing rules, each with its text read now. Adding, changing and removing
  // one are the person's, guarded like every other write.
  if (url.pathname === "/api/rules") {
    return route<{ action?: string; id?: string; name?: string; applies?: string; from?: string; text?: string }>("refused: writing rules can only be changed from the anvc page",
      () => ({ rules: listRules(root).map((s) => ({ ...s, ...ruleText(repo, s) })), files: ruleFiles(root) }),
      (body) => {
        const input = () => ({
          name: body.name?.trim() ?? "", applies: parseApplies(body.applies ?? ""),
          ...(body.text?.trim() ? { text: body.text } : { source: parseFrom(repo, body.from ?? "") }),
        });
        if (body.action === "remove" && body.id) removeRule(root, body.id, { kind: "person" });
        else if (body.action === "change" && body.id) changeRule(root, body.id, input(), { kind: "person" });
        else if (body.action === "add") addRule(root, input(), { kind: "person" });
        else throw new Error("needs an action: add, or change or remove with an id");
      });
  }
  // Each agent's tools, read from the person's agent configs, and the notes
  // on when to use them. Served only past the token check above, like every
  // route; writing a note is guarded like every other write.
  if (url.pathname === "/api/tools") {
    return route<{ tool?: unknown; when?: unknown }>("refused: notes can only be written from the anvc page",
      () => ({ agents: inventory(gitOrNull(repo, ["rev-parse", "--show-toplevel"]) || null, root), notes: currentNotes(root) }),
      (body) => { writeNote(root, String(body.tool ?? ""), String(body.when ?? ""), { kind: "person" }); });
  }
  // What agents read here, with the attempts and results linked to each; with
  // an id, one source and its kept text. Reads only.
  if (url.pathname === "/api/sources") return attempt(() => sourcesView(root, q.get("q") ?? "", q.get("id")));
  if (url.pathname === "/api/whence") {
    const found = whence(root, q.get("q") ?? "");
    const all = listResults(root);
    return Response.json({ results: found.results.map((v) => ({ ...v, check: checkResult(root, v, all) })), files: found.files, outputs: found.outputs, reads: found.reads, elsewhere: found.elsewhere });
  }
  // Every number in one of the repository's documents, traced. Without a
  // path, the documents there are to choose from.
  if (url.pathname === "/api/check") {
    const path = q.get("path");
    if (!path) {
      const listed = gitOrNull(root, ["ls-files", "--cached", "--others", "--exclude-standard", "*.md", "*.markdown", "*.tex", "*.rst"]) ?? "";
      return Response.json({ documents: listed.split("\n").filter((p: string) => p && !p.startsWith("node_modules/")).slice(0, 2000) });
    }
    const abs = resolve(root, path);
    const rel = below(root, abs);
    const found = rel ? statSync(abs, { throwIfNoEntry: false }) : undefined;
    if (!found) return Response.json({ error: `There's no ${path} in this repository.` }, { status: 404 });
    if (!found.isFile()) return Response.json({ error: `${path} is a folder. Choose a document in it.` }, { status: 400 });
    return Response.json({ path: rel, rows: checkDocument(root, abs) });
  }

  // Local only, from Settings. Guarded like every other write.
  if (url.pathname === "/api/local") {
    if (request.method === "POST") {
      if (!fromPage()) return Response.json({ error: "refused: local only can only be changed from the anvc page" }, { status: 403 });
      const body = (await request.json().catch(() => ({}))) as { on?: unknown };
      if (typeof body.on !== "boolean") return Response.json({ error: "needs on: true or false" }, { status: 400 });
      const { unset } = setLocalOnly(repo, body.on);
      return Response.json({ on: body.on, unset });
    }
    return Response.json({ on: isLocalOnly(repo) });
  }

  // Remove ANVC from this project after a backup, and restore one. Guarded
  // like every other write; deleting on a remote also needs the person to have
  // typed its name, and only a backup of this project can be restored.
  if (url.pathname === "/api/remove") {
    return route<{ remotes?: unknown; confirm?: unknown }>("refused: ANVC can only be removed from the anvc page", () => removalPlan(root), (body) => {
      const remotes = Array.isArray(body.remotes) ? body.remotes.map(String) : [];
      if (remotes.length && body.confirm !== remotes.join(", ")) throw new Error(`Type ${remotes.join(", ")} to delete there too.`);
      return remove(root, { remotes });
    });
  }
  if (url.pathname === "/api/restore") {
    return route<{ file?: unknown }>("refused: backups can only be restored from the anvc page", () => ({ backups: backups(root) }), ({ file }) => {
      const found = backups(root).find((b) => b.file === file);
      if (!found) throw new Error("That isn't a backup of this project.");
      return { restored: restore(root, found.file), backups: backups(root) };
    });
  }

  // What the person has already seen, kept for this computer. The page's own
  // storage is per port, and a second desktop window, on the next port, showed
  // the tour and the first choice again.
  if (url.pathname === "/api/seen") {
    const file = join(stateHome(), "seen.json");
    return route<{ key?: unknown }>("refused: this can only be changed from the anvc page", () => readJson<Record<string, boolean>>(file, {}), ({ key }) => {
      if (key !== "tour" && key !== "choose") throw new Error("needs key: tour or choose");
      writeJson(file, { ...readJson<Record<string, boolean>>(file, {}), [key]: true });
    });
  }

  // Ctrl+N in the desktop app. The page can't reach the app, which is the
  // point, so the app names itself to this server, which starts another copy.
  if (url.pathname === "/api/window" && request.method === "POST") {
    const app = process.env.ANVC_DESKTOP_APP;
    if (!fromPage() || !app) return Response.json({ error: "refused: a new window opens only from the desktop app" }, { status: 403 });
    Bun.spawn([app], { detached: true, stdio: ["ignore", "ignore", "ignore"] }).unref();
    return Response.json({ ok: true });
  }

  // Everything `anvc options` lists for this project, and the three switches
  // it offers here that no other section covers. Each runs what the CLI's own
  // command runs, and only a switch that list offers can be flipped: not git
  // push under local only, and no push check in the desktop app.
  if (url.pathname === "/api/options") {
    return route<{ key?: string; on?: unknown }>("refused: this can only be changed from the anvc page", () => options(root, root), ({ key, on }) => {
      const switches: Record<string, [() => unknown, () => unknown]> = {
        push: [() => configureRemote(root), () => unconfigureRemote(root)],
        prepush: [() => installPrePush(root), () => removePrePush(root)],
        instructions: [() => addInstructions(root), () => removeInstructions(root)],
        approvegoals: [() => setApproval(root, true), () => setApproval(root, false)],
      };
      if (typeof on !== "boolean" || !key || !Object.hasOwn(switches, key)) throw new Error(`needs a key (${Object.keys(switches).join(", ")}) and on: true or false`);
      if (!options(root, root).settings.some((s) => s.key === key)) throw new Error(`${key} can't be changed in this project`);
      switches[key]![on ? 0 : 1]();
    });
  }

  // What this project saves. Reading is open; changing it is guarded, because
  // this server listens on 127.0.0.1 and any page open in the browser can
  // send it a request. A custom header forces a cross-site request through a
  // preflight this server never answers, and the Origin must be this server.
  // Reads a pasted policy line without saving it, so the page can show the
  // error in place before anything changes.
  if (url.pathname === "/api/policy/parse") return attempt(() => importPolicy(q.get("line") ?? ""));
  if (url.pathname === "/api/policy") {
    if (request.method === "PUT" && !fromPage()) return Response.json({ error: "refused: settings can only be changed from the anvc page" }, { status: 403 });
    return attempt(async () => {
      if (request.method === "PUT") writePolicy(repo, (await request.json()) as Policy);
      return { ...readPolicy(repo), fields_meta: FIELDS, presets: PRESETS, line: exportPolicy(readPolicy(repo)) };
    });
  }
  // Retirement proposals and retired records, and the person's answer to
  // each. Answering is guarded the same way as changing settings.
  if (url.pathname === "/api/retirements") {
    if (request.method === "POST" && !fromPage()) return Response.json({ error: "refused: retirements can only be answered from the anvc page" }, { status: 403 });
    return attempt(async () => {
      if (request.method === "POST") {
        const body = (await request.json()) as { target?: string; decision?: string };
        const decision = body.decision === "retire" || body.decision === "decline" || body.decision === "restore" ? body.decision : null;
        if (!body.target || !decision) throw new Error("needs a target and a decision: retire, decline or restore");
        withIndex((db) => personDecide(db, repo, body.target!, decision));
      }
      return withIndex((db) => {
        const { pending, retired } = retirements(db);
        return { mode: readPolicy(repo).retire, pending, retired };
      });
    });
  }
  // What `anvc open` asks the server its record names: which project it
  // shows now, since the Folders page can change that, which process it is,
  // and a code for the browser it opens.
  if (url.pathname === "/api/open" && request.method === "POST") return Response.json({ repo, pid: process.pid, code: newCode() });
  // Which anvc this is and whether it has fallen behind. A day-old answer
  // starts a fresh check in the background.
  if (url.pathname === "/api/version") {
    return attempt(() => {
      checkDaily();
      const u = readUpdate();
      const [atRoot, atRepo] = [isRepo(root), isRepo(repo)];
      const mine = installs().filter((i) => atRoot(i.repo) || atRepo(i.repo));
      return {
        version: version(), managed: managedBy(), checked: u?.checked ?? null, behind: u?.behind ?? 0, changes: u?.changes ?? [],
        error: u?.error ?? null, hooksBehind: mine.some((i) => hooksBehind(i.repo, i.agent)),
        // How the page's commands start and end: anvc, and this project,
        // since a terminal can be anywhere.
        cli: anvcCommand(), repo: `--repo ${shellWord(root)}`,
      };
    });
  }
  // The Update button: checks, and installs what's new. A clone's new code
  // only runs in a new server, so once this answer is sent, this one lets go
  // of its port, starts the new one on it the way `anvc open` does, and
  // exits. The page reloads once the new one answers.
  if (url.pathname === "/api/update" && request.method === "POST") {
    if (!fromPage()) return Response.json({ error: "refused: updates can only be started from the anvc page" }, { status: 403 });
    return attempt(() => {
      const result = update();
      const restart = result.changed && managedBy() === "git" && ownPort !== undefined;
      if (restart) {
        setTimeout(async () => {
          await server.stop(true);
          try { await startServer(repo, String(ownPort)); } catch (error) {
            // The new code didn't start, so this one takes its port back
            // rather than leave nothing running.
            console.error(error instanceof Error ? error.message : error);
            server = listen(ownPort);
            return;
          }
          process.exit(0);
        }, 300);
      }
      return { ...result, restart };
    });
  }
  if (url.pathname === "/api/map") return attempt(() => mapView(repo));

  return new Response("not found", { status: 404 });
}

// Never the token: `bun run ui` keeps this output in a log file that other
// users may be able to read, and prints the link itself.
console.log(`anvc on http://127.0.0.1:${server.port}`);
console.log(`  repository: ${repo}`);
// The desktop app passes a token and waits for this line from its own child
// before it points the window at the port.
if (process.env.ANVC_UI_TOKEN) console.log(`anvc listening 127.0.0.1:${server.port}`);
// Which desktop app is installed, for the agent's update offer: it can't
// tell from outside on every system.
if (managedBy() === "desktop") try { writeJson(desktopFile(), { version: version() }); } catch { /* offered without it */ }
