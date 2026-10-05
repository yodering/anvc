/**
 * The questions people ask before they trust ANVC with their work, each
 * answered in a sentence or two.
 *
 * Every figure here was measured, on the computer ANVC is developed on, and
 * each answer was checked against the code it describes. When that code
 * changes, the answer changes with it: the saving, the sharing and the
 * scrubbing are in protocol/, the size of a session's copy in protocol/keep.ts,
 * and the limit on what an agent is told at once in
 * emitters/claude-code/inject.ts.
 */
import type { ComponentChildren } from "preact";
import "./faq.css";

const QUESTIONS: Array<[string, ComponentChildren]> = [
  ["What does ANVC save?", <>
    What your agent tried in this repository: each attempt's goal, whether it worked, and why it ended, kept as a small git ref. It also keeps a log of the commands, output and files of each session, and a copy of the session, in <code>~/.anvc</code> on this computer.
  </>],
  ["Does anything leave my computer?", <>
    Shared records go to your own remote when you <code>git push</code>, and nothing is sent to ANVC's authors. If you set up <code>anvc sync</code>, your private history also goes to a remote only you can read. Once a day ANVC checks for an update: a git clone runs <code>git fetch</code> on its own folder, and the plugin asks GitHub for the newest release's version number.
  </>],
  ["Who can read my records?", <>
    Anyone who can fetch the repository can read its shared records. Private records aren't pushed with your code, and in a project that's Local only, every record is private.
  </>],
  ["Will records clutter my GitHub?", <>
    No. They're refs under <code>refs/anvc</code>, which don't show up as branches, commits or files.
  </>],
  ["Does it save my passwords or API keys?", <>
    Passwords, API keys and tokens it recognises are removed before anything is written, in the log and in records. It finds them by their shape, so one it doesn't recognise can get through.
  </>],
  ["Does it wear out my SSD?", <>
    It writes only what your agent adds. A session's copy grows by just the new part, measured at 0.15 MB for an hour of a long session, and a record is at most 64 KiB.
  </>],
  ["How much disk space does it use?", <>
    About 170 MB after ten days of daily use, most of it copies of sessions. To stop keeping them, turn off Saved sessions in Settings, under Raw log.
  </>],
  ["Does it slow my agent down?", <>
    In a repository with about 100 records, the hooks took 36 ms before each tool call and 13 ms after it. Whatever ANVC tells the agent at once stays under 9,000 characters.
  </>],
  ["I turned ANVC on in a project I'd already worked on. Can it catch up?", <>
    Yes. The first session after, your agent asks whether to import the earlier sessions, then offers to record the numbers already in your files. The empty work log has a button for the import, and in a terminal <code>anvc catch-up</code> does it and lists those files.
  </>],
  ["Can an old record mislead my agent?", <>
    It can, so each record is shown with when it was written, and a dead end's check can run first to see if it still fails. A record that's no longer true can be retired, and then it isn't shown.
  </>],
  ["How do my teammates get my records?", <>
    They set ANVC up in their own clone. After that, <code>git fetch</code> and <code>git pull</code> bring your shared records, and their agents are shown them.
  </>],
  ["How do I turn it off or remove it?", <>
    Turn a folder off on the Folders page, or with <code>anvc off</code>. Remove ANVC, in Settings, backs up the project's records to a file and then deletes them. <code>anvc uninstall</code> takes out only what setup added.
  </>],
  ["Which agents does it work with?", <>
    Claude Code, Codex and Cursor. Claude Code can install it as a plugin, and the others through <code>bun run setup</code> in a clone of ANVC.
  </>],
  ["Is it free?", <>
    Yes. It's open source, under the Apache 2.0 license.
  </>],
];

export function FaqPage() {
  return (
    <div class="faq">
      {QUESTIONS.map(([q, a]) => (
        <section key={q}>
          <h2>{q}</h2>
          <p>{a}</p>
        </section>
      ))}
    </div>
  );
}
