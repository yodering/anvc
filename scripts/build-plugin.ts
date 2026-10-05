/**
 * Builds anvc as a Claude Code plugin: the hooks, the MCP server, the CLI and
 * the work log's server bundled into self-contained files, with a manifest
 * and a hooks file that point inside the plugin.
 *
 *   bun scripts/build-plugin.ts [OUT]      (default: plugin/)
 *
 * Installed as a plugin, anvc is updated by the agent's own plugin manager
 * and carries its hooks with it: no absolute paths in anyone's settings, and
 * no setup to re-run when a version adds a hook. The bundle needs Bun at run
 * time and nothing else; there is no install step in a plugin.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { claudeHooks } from "./hookfiles";

const root = resolve(import.meta.dir, "..");
const out = resolve(process.argv[2] ?? join(root, "plugin"));
const pkg = (await Bun.file(join(root, "package.json")).json()) as { version: string };

rmSync(join(out, "dist"), { recursive: true, force: true });
// The work log's server brings its page: the HTML it imports is built into
// ui.html, with hashed chunks beside it. The bundle finds them, and the map's
// layout worker, by paths relative to the folder it runs in, so `anvc open`
// runs it from dist/.
const built = await Bun.build({
  entrypoints: ["emitters/claude-code/capture.ts", "emitters/claude-code/inject.ts", "emitters/claude-code/stop.ts",
    "protocol/mcp.ts", "protocol/cli.ts", "server/inspect.ts"].map((e) => join(root, e)),
  outdir: join(out, "dist"),
  target: "bun",
  // Not "[name].js", which would write the page as ui.js.
  naming: "[name].[ext]",
});
if (!built.success) {
  for (const log of built.logs) console.error(log);
  process.exit(1);
}

// Quoted like $CLAUDE_PROJECT_DIR in setup, so a path with spaces still runs.
const run = (script: string) => `bun "\${CLAUDE_PLUGIN_ROOT}"/dist/${script}.js`;
const write = (file: string, body: unknown) => {
  mkdirSync(join(out, file, ".."), { recursive: true });
  writeFileSync(join(out, file), typeof body === "string" ? body : `${JSON.stringify(body, null, 2)}\n`);
};

write(".claude-plugin/plugin.json", {
  name: "anvc",
  version: pkg.version,
  description: "Keeps what your coding agents tried, kept and abandoned, and shows them past dead ends before they repeat one.",
  author: { name: "ANVC contributors", url: "https://github.com/yodering/anvc" },
  license: "Apache-2.0",
  homepage: "https://github.com/yodering/anvc",
  repository: "https://github.com/yodering/anvc",
  mcpServers: {
    // ANVC_PLUGIN lets the server step aside where a project runs its own.
    anvc: { command: "bun", args: ["${CLAUDE_PLUGIN_ROOT}/dist/mcp.js"], env: { ANVC_AGENT: "claude-code", ANVC_PLUGIN: "1" } },
  },
});

const hooks = claudeHooks({ capture: run("capture"), inject: run("inject"), stop: run("stop") });
write("hooks/hooks.json", {
  hooks: Object.fromEntries(Object.entries(hooks).map(([event, entries]) => [event,
    entries.map((e) => ({ ...(e.matcher ? { matcher: e.matcher } : {}), hooks: [{ type: "command", command: e.command }] }))])),
});

const commands = {
  init: "Make this repository's anvc records travel with git push and fetch",
  // On and off are the switch for the folder Claude Code is working in, named
  // in the notice the plugin shows the first time it runs somewhere.
  on: "Turn ANVC on in this repository",
  off: "Turn ANVC off in this repository",
  open: "Open this repository's work log in the browser, or in the desktop app with --desktop",
};
// Claude Code puts what the user types after a command where $ARGUMENTS is.
// Pasted into the shell line, a quote or a semicolon in it would run as part
// of the command, so it's shown to the agent beside it and only the flags
// named here are passed on.
for (const [name, description] of Object.entries(commands)) {
  const allowed = name === "open" ? ["--desktop", "--no-browser"] : undefined;
  write(`commands/${name}.md`, `---
description: ${description}${allowed ? `\nargument-hint: "${allowed.map((f) => `[${f}]`).join(" ")}"` : ""}
---
Run this command and show the user its output:

\`\`\`bash
bun "\${CLAUDE_PLUGIN_ROOT}/dist/cli.js" ${name} --repo "$(git rev-parse --show-toplevel)"
\`\`\`
${allowed ? `
Arguments: $ARGUMENTS

Add to the command each of ${allowed.map((f) => `\`${f}\``).join(" and ")} that the arguments include. Leave out anything else in them, and never paste them into the command.
` : ""}`);
}

// Setting up is a conversation rather than one command: the agent reads every
// setting, and the person decides how much of it to hand over.
write("commands/setup.md", `---
description: Go through ANVC's settings, or set the recommended ones
---
Run this and read the settings it lists:

\`\`\`bash
bun "\${CLAUDE_PLUGIN_ROOT}/dist/cli.js" options --json --repo "$(git rev-parse --show-toplevel)"
\`\`\`

Below, \`<cli>\` is the command in its \`cli\` field, such as \`anvc\`.

Tell the user in two or three lines what ANVC can set up here. Then ask one question: use the recommended settings, go through them one by one, or set only the ones that stay on this computer.

- Recommended: set each recommended choice that differs from the current one, except in settings with \`"asks": true\`. Then ask, one at a time, about each setting with \`"asks": true\` whose recommended choice differs from the current one.
- One by one: one short line per setting, with its choices and the recommended one. Set what the user picks.
- Only this computer: as for recommended, but keep the other settings with \`"asks": true\` as they are, and offer to turn Local only on.

Whichever the user picks, ask once about \`absorb\` (goals, writing rules and the project map from their sessions) unless \`chosen\` is true: say in one sentence what it does and what it costs, from its \`what\`, and turn it on only if they say yes.

If no recommended choice differs from the current one, say the recommended settings are already in effect. \`chosen\` is false where a value is still the default, and \`overriddenBy\` names the setting that decides this one for now.

To set a choice, run the setting's \`set\` with the choice's value in place of \`<value>\`, and with \`--everywhere\` if the user wants it for every project and \`set\` ends in \`[--everywhere]\`. Where \`set\` lists a command for each choice, run that one. A setting's \`parts\` follow its choice; go into them only if the user asks, with \`setPart\`, and \`<cli> options\` describes them. A setting with \`"asks": true\` decides what leaves this computer, changes a file the project commits, or spends tokens on the user's plan, such as sharing, git push, AGENTS.md and absorb. Change one only after the user says yes to it.

When the settings are done, run \`<cli> options\`, and show the user what is set now and how to change each.

Next, if \`earlier\` is more than 0, ask one short question before anything else, such as "Import the <earlier> earlier sessions from this project? They stay private." Recommend yes. On a yes, run \`<cli> catch-up\`, which imports them as private records and lists the files that hold numbers.

Then offer these, and ask before each one:

- The numbers in the files catch-up listed, if it listed any. Offer to record the ones the user relies on with \`anvc_result\`, several to a call, and from a subagent if you can start one, so this conversation stays short.
- Goals. Read the README, the docs and the code, and draft the project's goals, each with its sub-goals. Write only goals those files support; don't invent any. Show the user the list first. Add the ones they agree to with \`anvc_goal\`, a sub-goal with \`parent\` set to its goal's id. A goal is \`todo\` unless the code shows it done or in progress.
- Writing rules. Look for rules the project already has for its text: headings in AGENTS.md or CLAUDE.md, a CONTRIBUTING file, a style guide. Offer one rule set for each kind of text they cover, such as commit messages or the README. Add the ones the user agrees to with \`anvc_rule\`, with \`source\` set to the file and heading, so the rules stay where they are. Don't write new rules. If the project has none, say so.
- The desktop app, which opens the work log in its own window. Offer it only if \`<cli> desktop\` says it isn't installed. To install it, run \`<cli> desktop install\`.
`);

console.log(`plugin ${pkg.version} built in ${out}`);
