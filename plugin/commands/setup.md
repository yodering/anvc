---
description: Go through ANVC's settings, or set the recommended ones
---
Run this and read the settings it lists:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/dist/cli.js" options --json --repo "$(git rev-parse --show-toplevel)"
```

Below, `<cli>` is the command in its `cli` field, such as `anvc`.

Tell the user in two or three lines what ANVC can set up here. Then ask one question: use the recommended settings, go through them one by one, or set only the ones that stay on this computer.

- Recommended: set each recommended choice that differs from the current one, except in settings with `"asks": true`. Then ask, one at a time, about each setting with `"asks": true` whose recommended choice differs from the current one.
- One by one: one short line per setting, with its choices and the recommended one. Set what the user picks.
- Only this computer: as for recommended, but keep the other settings with `"asks": true` as they are, and offer to turn Local only on.

Whichever the user picks, ask once about `absorb` (goals, writing rules and the project map from their sessions) unless `chosen` is true: say in one sentence what it does and what it costs, from its `what`, and turn it on only if they say yes.

If no recommended choice differs from the current one, say the recommended settings are already in effect. `chosen` is false where a value is still the default, and `overriddenBy` names the setting that decides this one for now.

To set a choice, run the setting's `set` with the choice's value in place of `<value>`, and with `--everywhere` if the user wants it for every project and `set` ends in `[--everywhere]`. Where `set` lists a command for each choice, run that one. A setting's `parts` follow its choice; go into them only if the user asks, with `setPart`, and `<cli> options` describes them. A setting with `"asks": true` decides what leaves this computer, changes a file the project commits, or spends tokens on the user's plan, such as sharing, git push, AGENTS.md and absorb. Change one only after the user says yes to it.

When the settings are done, run `<cli> options`, and show the user what is set now and how to change each.

Next, if `earlier` is more than 0, ask one short question before anything else, such as "Import the <earlier> earlier sessions from this project? They stay private." Recommend yes. On a yes, run `<cli> catch-up`, which imports them as private records and lists the files that hold numbers.

Then offer these, and ask before each one:

- The numbers in the files catch-up listed, if it listed any. Offer to record the ones the user relies on with `anvc_result`, several to a call, and from a subagent if you can start one, so this conversation stays short.
- Goals. Read the README, the docs and the code, and draft the project's goals, each with its sub-goals. Write only goals those files support; don't invent any. Show the user the list first. Add the ones they agree to with `anvc_goal`, a sub-goal with `parent` set to its goal's id. A goal is `todo` unless the code shows it done or in progress.
- Writing rules. Look for rules the project already has for its text: headings in AGENTS.md or CLAUDE.md, a CONTRIBUTING file, a style guide. Offer one rule set for each kind of text they cover, such as commit messages or the README. Add the ones the user agrees to with `anvc_rule`, with `source` set to the file and heading, so the rules stay where they are. Don't write new rules. If the project has none, say so.
- The desktop app, which opens the work log in its own window. Offer it only if `<cli> desktop` says it isn't installed. To install it, run `<cli> desktop install`.
