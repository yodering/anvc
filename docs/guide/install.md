# Install

You need [Bun](https://bun.com) and git.

### Claude Code, as a plugin

In Claude Code:

```
/plugin marketplace add yodering/anvc
/plugin install anvc@anvc
```

If you reach GitHub over SSH, add the marketplace by its SSH address instead:
`/plugin marketplace add git@github.com:yodering/anvc.git`.

Start a new session, then run `/anvc:setup` in your project to go through the
settings, or `/anvc:init` to only make its records travel with git push and
fetch. To have everyone who opens a project asked to install the plugin, run
`bun run setup --repo <project> --agent claude-code --plugin` from a clone and
commit the `.claude/settings.json` it writes.

### Any agent, from a clone

```bash
git clone https://github.com/yodering/anvc.git ~/anvc && cd ~/anvc   # or git@github.com:yodering/anvc.git over SSH
bun install
bun run setup
```

In a terminal, setup asks a few questions and then does the rest: which
agents, every project or one, how much ANVC tells your agent on its own, who
can read what's saved, and, for one project, whether to add a line to its
AGENTS.md and whether records go with git push. To skip the questions, name
everything with flags, as below; `bun run setup --help` lists them.

```bash
bun run setup --repo /path/to/your/project --agent claude-code
```

Replace `claude-code` with the agent you use: `codex`, `cursor`, or the name of
any other agent that supports MCP. Setup configures git so records are pushed
and fetched with your code, and prints how to register ANVC with your agent.
To connect several, name them with commas, `--agent claude-code,codex`, or
use `--agent all` for every one of Claude Code, Codex and Cursor installed.

To install once for every project your agents open, instead of one at a
time:

```bash
bun run setup --global --agent claude-code,codex,cursor
```

ANVC then runs in every git repository those agents work in. Each folder has
an on/off switch at the top of the work log, and the Folders page lists every
folder ANVC has run in with its switch. Below them it lists the other git
repositories in the folders those are in, and in any folder you add there.
Where ANVC is set up one project at a time, each has a Set up button that
shows what setup will change before it runs. From a terminal, `bun run anvc off
--repo /path/to/project` turns one off. Off means nothing is captured, shown
to the agent or saved there. Records stay on your computer until you run `bun
run anvc init` in a project to share them with git push.

| agent | what it gets |
|---|---|
| Claude Code, Codex, Cursor | the MCP tools, plus hooks that record each session, show the agent past dead ends without being asked, and remind it to save a record |
| other MCP agents | the MCP tools, plus two lines in your project instructions asking the agent to check for dead ends and save a record |

They can work in the same repository, one after another or at once. When a
session starts, it is told what the last session left: which agent, what it
changed, what failed, and where its session file is. Codex asks you to trust
the hooks the first time it runs them. With other agents nothing is recorded
automatically, and the agent calls the tools itself.

### Install with your agent

Paste this into your coding agent, opened in your project:

```text
Set up this project with anvc, following https://github.com/yodering/anvc#install.
If Bun isn't installed, ask me before installing it.
Clone the repository to ~/anvc, since the MCP server runs from that folder, and run bun install there.
Run bun run setup with --repo set to this project's path and --agent set to the agent you are: claude-code, codex, cursor, or your own name.
Register the MCP server the way setup's output says.
Add the lines setup suggests to this project's AGENTS.md or CLAUDE.md.
Then tell me everything setup changed.
```

Start a new session afterwards. Agents load MCP servers, and Claude Code loads
hooks, when a session starts.

### Import earlier Claude Code sessions

If you've used Claude Code in this project before, ANVC can build records from
the transcripts Claude Code saved:

```bash
bun run anvc backfill --repo /path/to/your/project          # reports what it found
bun run anvc backfill --repo /path/to/your/project --write  # creates the records
```

Nothing is written until you pass `--write`, and the records it creates are
private. A transcript shows what the agent did, including which commands
failed, but not whether it gave up on something, so these records can't say
whether an attempt was kept or abandoned.

### Open the work log

In Claude Code, run `/anvc:open` in your project. From a clone:

```bash
bun run anvc open --repo /path/to/your/project
```

Either one opens the project's work log in your browser, signed in with a
token other users on this computer don't have. Each project gets its own
server and address, and opening a project again uses the server it already
has. An agent can open it for you with the `anvc_open` tool.

`--no-browser` prints a link that signs in, instead of opening the browser.
`--desktop` opens the project in the desktop app. The plugin doesn't include
the app. `bun run setup` offers to install it, and `bun run anvc desktop
install` downloads this computer's installer from the latest release and
starts it. In a clone, `bun run desktop:build` builds it yourself, which needs
Rust.

`bun run ui --repo /path/to/your/project` is the same command, shorter.

## Updating

Installed as a Claude Code plugin, ANVC updates itself. It checks once a day
for a new release, and installs one when it has been out for two days with
nothing newer, so a release that needed a quick fix is skipped. The session
that starts next runs it. To be asked first instead, run `anvc updates ask`.

Installed from a clone, ANVC never updates itself. It checks once a day
whether a newer version is out, and says so in the line it prints when a
session ends and at the bottom of the work log's sidebar. To update, click
Update there, or run:

```bash
bun run anvc update
```

That pulls the new version, installs any new dependencies, sets up again
every repository you set it up in, so hooks added since are installed, and
updates the Claude Code plugin if it's installed. The work log restarts on
the new version by itself. Restart your agents afterwards so their ANVC tools
use it. To update the desktop app, run `bun run anvc desktop install` again.
