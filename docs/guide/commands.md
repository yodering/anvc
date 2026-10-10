# Commands and tools

## Tools your agent gets

Twenty-seven MCP tools. The agent writes records with the first one.

| tool | what it answers |
|---|---|
| `anvc_checkpoint` | save a record of this attempt, how it ended, and why |
| `anvc_dead_ends` | what has been abandoned here? No search term needed |
| `anvc_detail` | what is behind this one-line summary? Output, reasoning, what was ruled out |
| `anvc_revisions` | has this record been corrected since? Which version is current? |
| `anvc_feedback` | report that a record was wrong, out of date, or no help |
| `anvc_retire` | stop showing a record that's no longer true, within the project's rules |
| `anvc_search` | has anyone seen this error, command or file before? Searches every record, the private command log and the sources agents read |
| `anvc_tried` | what was already attempted for this goal? |
| `anvc_abandoned_touching` | what was abandoned on this path? |
| `anvc_why` | why does this file look like this? |
| `anvc_failed` | which attempts failed, and with what error? |
| `anvc_red_to_green` | which attempt turned the tests green? |
| `anvc_session` | what happened in one session, in order? |
| `anvc_overlap` | how much do concurrent sessions touch the same files? |
| `anvc_ingest` | turn captured events into records |
| `anvc_result` | record a number the project relies on, or change a result's status |
| `anvc_results` | where did this number come from? Which results need a look? Checks a whole document too |
| `anvc_sources` | was this page or paper read here before? The pages, searches and documents agents read, with the text they got back |
| `anvc_status` | what's in progress here now, what was done recently and where it stands, and what's up next? |
| `anvc_status_item` | add something the person asked for to Up next, or mark an item doing, done or dropped |
| `anvc_goals` | what are this project's goals, and which are done? |
| `anvc_goal` | add a goal or sub-goal, or change one's status or title, with a reason |
| `anvc_rules` | which writing rules does this project keep? With a path or `commit`, the text of the ones that cover it |
| `anvc_rule` | add, change or remove a rule set |
| `anvc_tools` | which tools does each agent have here, is each on, and when should I use which? |
| `anvc_tool_note` | note when to use a tool, for every agent that works here |
| `anvc_open` | open this project's work log in the person's browser |

## Commands

```bash
bun run anvc open                  # this project's work log in the browser; --desktop for the desktop app
bun run anvc init                  # make records travel with push and fetch; --off stops them
bun run anvc catch-up              # bring in the sessions from before ANVC was on, and list the files that hold numbers
bun run anvc abandoned src/api.ts  # abandoned work touching a file
bun run anvc search "ETIMEDOUT"    # every record and the command log; a date such as 2026-10-07 keeps that day's
bun run anvc export --out docs/log # the records as Markdown, one page a day; private ones only with --private
bun run anvc sources arxiv.org     # pages, searches and documents agents read; with an id, the text kept
bun run anvc tried "cache layer"   # what was already attempted
bun run anvc why src/api.ts:42     # the attempts behind a line, or a whole file
bun run anvc failed                # attempts that errored
bun run anvc red-to-green          # attempts that turned tests green
bun run anvc session <run-id>      # one session in order
bun run anvc overlap               # file overlap between sessions
bun run anvc stats                 # how much has been recorded
bun run anvc tiers                 # what is private, what is shared
bun run anvc ingest                # scrape captured events into private records
bun run anvc policy                # what this project saves and pushes, field by field
bun run anvc retire                # records taken out of what agents are shown
bun run anvc brief                 # what happened since you last looked
bun run anvc updates ask           # ask before installing a release, instead of two days after it comes out
bun run anvc review                # go through what your next push will share
bun run anvc forget <id>           # delete a private record for good
bun run anvc sessions --keep       # keep private copies of this repo's sessions
bun run anvc sync --remote mine    # private history to and from a remote only you can read
bun run anvc remove --remote origin  # back up, delete the records here and on origin, and uninstall
bun run anvc restore <file>        # bring a backup back; without a file, list this project's backups
bun run anvc results               # recorded results, and whether what they depend on changed
bun run anvc whence 88.1%          # where a number came from
bun run anvc check notes/eval.md   # where every number in a document came from: notes, a README, a paper
bun run anvc run -- python a.py    # run something yourself, logged so its numbers can be traced
bun run anvc result lock <id>      # lock a result; also unlock and invalid
bun run anvc data off              # stop keeping track of results in this project
bun run anvc status                # what's in progress, done recently and up next
bun run anvc status add "Tauri port"  # add an item to Up next; --goal <id> links it to a goal
bun run anvc status <id> done      # next, doing, done or dropped; up and down move it in Up next
bun run anvc goals                 # the project's goals and sub-goals, with their status
bun run anvc goal add "Ship it"    # add a goal; --parent <id> makes it a sub-goal
bun run anvc goal <id> done        # todo, doing, done or dropped; --why says why
bun run anvc approve-goals on      # an agent's goal changes wait until you accept them
bun run anvc goal accept <id>      # accept what an agent proposed; decline turns it down
bun run anvc tools                 # each agent's MCP servers, plugins, skills and hooks, and the notes on them
bun run anvc tool note ponytail-audit "cleanup audits"  # when to use a tool; agents hear it at session start
```

`bun run anvc push-check on` adds an optional git hook that prints one line on
each push saying which records it shares, and stops the push if one of them
holds something shaped like a credential. A pre-push hook you already have
keeps running, first. `anvc push-check off` takes the check out and puts
yours back.

`bun run anvc instructions on` adds two lines to AGENTS.md or CLAUDE.md asking
your agent to check past dead ends and record its work, and `off` takes them
out. The project commits that file, so commit the change.

## Writing rules

A rule set says where the rules for one kind of text are written, usually a
heading in AGENTS.md, and which files it covers. Your agent gets the list when
a session starts or its context is compacted, and a rule set's text the first
time in a session it's about to write a file the rule set covers, or make a
commit when it covers `commit`.

```bash
bun run anvc rules                           # every rule set, and where its text is
bun run anvc rules --for README.md           # the text of the rule sets covering a file
bun run anvc rules --for commit              # the rules for commit messages
bun run anvc rule add "Commit messages" --applies commit --from "AGENTS.md#Commit messages"
bun run anvc rule add "Docs" --applies "README.md,docs/**/*.md" --from "AGENTS.md#Writing"
bun run anvc rule add "Paper" --applies "paper/**/*.tex" --text "One claim per paragraph."
bun run anvc rule change <id> --applies "README.md"   # also --name, --from, --text
bun run anvc rule remove <id>
```

A section runs from its heading to the next heading of the same or a higher
level, so `AGENTS.md#Writing` takes in every heading under Writing. Without a
heading, `--from` takes the whole file. Globs match from the repository's
root: `*.md` is the Markdown files at the top, `**/*.md` all of them.
