import { Fragment, render } from "preact";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import { Sprite } from "./icons";
import { HelpedBlock } from "./helped";
import { StatsPage } from "./stats";
import { Settings } from "./settings";
import { Tour } from "./tour";
import { Choose } from "./choose";
import { ProjectPage } from "./project";
import { Copy, CopyButton, Field, getJson, Hint, Icon, Modal, OutcomeBadge, plural, send, Source, Track } from "./widgets";
import {
  duration,
  fileLink,
  filterTurns,
  inOutcome,
  groupSessions,
  turnTitle,
  type Outcome,
  type Turn,
  type WorkRepo,
} from "./work-model";
import { exampleWork } from "./example-work";
import { FolderSwitch, FoldersPage, OffBanner, useFolders } from "./folders";
import { ResultsHub } from "./results";
import { FaqPage } from "./faq";
import { anvc, useInstall, type Install } from "./install";
import "./ui.css";

const POLL_MS = 10_000;
const EMPTY: WorkRepo = {
  forge: null,
  turns: [],
  stats: { records: 0, sessions: 0, abandoned: 0 },
};
const FILTERS: { value: Outcome; label: string }[] = [
  { value: "all", label: "All" },
  { value: "kept", label: "Kept" },
  { value: "abandoned", label: "Abandoned" },
  { value: "unexplained", label: "No reason" },
];
const DAY = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });


type Page = "project" | "work" | "results" | "stats" | "settings" | "folders" | "faq";
/** The sidebar's pages after the work log; choosing the open one goes back to it. */
const PAGES: Array<[Page, string, string]> = [
  ["project", "target", "Project"],
  ["results", "database", "Results"],
  ["stats", "chart-column", "Stats"],
  ["folders", "folder", "Folders"],
];
const TITLE: Record<Page, string> = {
  project: "Project", work: "Work log", results: "Results and sources", stats: "Stats", settings: "Settings", folders: "Folders", faq: "Questions",
};

/**
 * Light or dark. The system's setting decides until the person picks one with
 * the Mode button, and their pick is kept in this browser. Set before the
 * first render, so the page never flashes the other palette.
 */
type Mode = "light" | "dark";
const pickedMode = (): Mode | null => {
  try { const m = localStorage.getItem("anvc.mode"); return m === "light" || m === "dark" ? m : null; } catch { return null; }
};
const systemMode = (): Mode => (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
const showMode = (m: Mode) => { document.documentElement.dataset.mode = m; };
showMode(pickedMode() ?? systemMode());

function ModeButton() {
  const [mode, setMode] = useState<Mode>(() => pickedMode() ?? systemMode());
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: light)");
    const follow = () => { if (!pickedMode()) { const m = systemMode(); showMode(m); setMode(m); } };
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, []);
  const next: Mode = mode === "dark" ? "light" : "dark";
  return (
    <button class="nav-item" type="button" aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}
      onClick={() => { showMode(next); setMode(next); try { localStorage.setItem("anvc.mode", next); } catch { /* fine */ } }}>
      <Icon name={mode === "dark" ? "moon" : "sun"} />
      <span>Mode: {mode === "dark" ? "Dark" : "Light"}</span>
    </button>
  );
}

const SIDEBAR_MIN = 180, SIDEBAR_MAX = 420, SIDEBAR_DEFAULT = 240;
const clampSidebar = (w: number) => Math.round(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, w)));

/** How to connect an agent, for the way this copy of ANVC is installed. */
function SetupStep({ install }: { install: Install }) {
  if (install.managed === "plugin") return (
    <>
      <p>In Claude Code, run this in your project. Your agent goes through the settings with you.</p>
      <Copy text="/anvc:setup" />
      <p>Codex and Cursor need ANVC from a clone of its repository: github.com/yodering/anvc.</p>
    </>
  );
  if (install.managed === "desktop") return (
    <>
      <p>In Claude Code, install the plugin, then run <code>/anvc:setup</code> in your project.</p>
      <Copy text="/plugin marketplace add yodering/anvc" />
      <Copy text="/plugin install anvc@anvc" />
      <p>For another agent, run <code>bun run setup</code> from the ANVC folder you built this app in.</p>
    </>
  );
  return (
    <>
      <p>Run this from your ANVC folder. It prints the config for your agent.</p>
      <div class="copy-block">
        <code>bun run setup {install.repo} --agent &lt;your agent&gt;</code>
      </div>
    </>
  );
}

function Setup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const install = useInstall();
  return (
    <Modal open={open} onClose={onClose} class="setup-dialog" aria-labelledby="setup-title">
      <div class="dialog-head">
        <button class="icon-button" aria-label="Close setup" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <h2 id="setup-title">Connect an agent</h2>
      <ol class="setup-steps">
        <li>
          <div>
            <h3>Set it up</h3>
            {install && <SetupStep install={install} />}
          </div>
        </li>
        <li>
          <div>
            <h3>Record work</h3>
            <p>Setup tells your agent to do this. To ask it directly:</p>
            <Copy text="Record this attempt with anvc_checkpoint." />
          </div>
        </li>
      </ol>
      {install && (
        <div class="setup-note">
          <Icon name="file-text" />
          <p>
            To turn captured sessions into records, run{" "}
            <code>{anvc(install, "ingest")}</code>{install.managed === "desktop" && " from your ANVC folder"}.
          </p>
        </div>
      )}
      <button class="button primary" onClick={onClose}>
        Done
      </button>
    </Modal>
  );
}

/**
 * Which anvc this is, and a button that updates it: it checks, and installs
 * whatever is new. After a clone updates, its server restarts, and the page
 * reloads once the new one answers.
 */
function Version() {
  const v = useInstall();
  const [run, setRun] = useState<{ busy: boolean; text?: string; lines?: string }>({ busy: false });
  if (!v) return null;
  const status = run.text ?? (v.behind
    ? `${plural(v.behind, "update")} ready`
    : v.hooksBehind ? "Hooks here are out of date"
      : v.managed === "desktop" ? "Desktop app"
        : v.error ? "Couldn't check for updates" : v.checked ? "Up to date" : null);
  const act = !run.text && (v.behind > 0 || v.hooksBehind);
  const updateNow = async () => {
    setRun({ busy: true, text: "Checking for updates…" });
    try {
      const r = await (await send("/api/update", {})).json() as { ok?: boolean; changed?: boolean; restart?: boolean; lines?: string[]; error?: string };
      const lines = (r.lines ?? [r.error ?? ""]).join("\n");
      if (!r.ok) return setRun({ busy: false, text: "Couldn't update", lines });
      if (!r.restart) return setRun({ busy: false, text: r.changed ? "Updated. Restart your agents to use it." : "Up to date", lines });
      setRun({ busy: true, text: "Updated. Reloading…", lines });
      // The old server exits; the new one takes the same port.
      for (let i = 0; i < 60; i++) {
        await new Promise((ok) => setTimeout(ok, 1000));
        if (await fetch("/api/version").then((res) => res.ok, () => false)) return location.reload();
      }
      setRun({ busy: false, text: "Updated. Run bun run ui to open the new version.", lines });
    } catch {
      setRun({ busy: false, text: "Couldn't update" });
    }
  };
  return (
    <div class={`version${act ? " is-behind" : ""}`} title={run.lines || (v.changes.length ? v.changes.map((c) => `• ${c}`).join("\n") : undefined)}>
      <span>ANVC {v.version} beta</span>
      {status && <span class="version-status" role="status">{status}</span>}
      <button type="button" class="link-button version-update" onClick={updateNow} disabled={run.busy}>
        {run.busy ? "Updating…" : status === "Up to date" ? "Check again" : "Update"}
      </button>
    </div>
  );
}

/** What /api/start answers: the agents with ANVC's hooks here, and the sessions from before to import. */
interface Start { agents: string[]; earlier: number }

/**
 * The work log with nothing in it. It used to say "Connect an agent" even
 * with an agent connected, and an agent sent to fix that debugged a
 * connection that worked. It says which of three it is: ANVC is off, no
 * agent is connected, or one is and has saved nothing yet. In the last two
 * it offers to import the sessions from before ANVC was on.
 */
function Welcome({
  on,
  again,
  onTurnOn,
  onSetup,
  onExample,
  onImported,
}: {
  /** Null until the folder list arrives. */
  on: boolean | null;
  /** Read again when this changes: the setup dialog closing can connect an agent. */
  again: unknown;
  onTurnOn: () => void;
  onSetup: () => void;
  onExample: () => void;
  onImported: () => void;
}) {
  const [start, setStart] = useState<Start | null>(null);
  const [importing, setImporting] = useState(false);
  const [said, setSaid] = useState("");
  useEffect(() => { void getJson<Start>("/api/start").then(setStart).catch(() => {}); }, [again]);

  const importEarlier = async () => {
    setImporting(true);
    try {
      const done = await (await send("/api/start", {})).json() as { written?: number; sessions?: number; error?: string };
      if (done.error) setSaid(`Couldn't import: ${done.error}`);
      else if (done.written) { setSaid(`Imported ${plural(done.written, "record")} from ${plural(done.sessions ?? 0, "session")}.`); onImported(); }
      else setSaid("Those sessions had nothing to import.");
      void getJson<Start>("/api/start").then(setStart).catch(() => {});
    } catch {
      setSaid("Couldn't reach the ANVC server.");
    } finally {
      setImporting(false);
    }
  };

  const example = (
    <button class="button" onClick={onExample}>
      View example
      <Icon name="arrow-right" />
    </button>
  );
  if (on === false) return (
    <div class="welcome">
      <h2>ANVC is off for this project</h2>
      <p>Nothing is saved here or shown to agents.</p>
      <div class="welcome-actions">
        <button class="button primary" onClick={onTurnOn}>Turn on</button>
        {example}
      </div>
    </div>
  );
  // Nothing more is said until the server answers, so it never says the wrong one first.
  const connected = start && start.agents.length > 0;
  const earlier = start?.earlier ? (
    <button class={`button${connected ? " primary" : ""}`} onClick={importEarlier} disabled={importing}>
      {importing ? "Importing…" : `Import ${plural(start.earlier, "earlier session")}`}
    </button>
  ) : null;
  return (
    <div class="welcome">
      <h2>Nothing recorded yet</h2>
      {start && <p>{connected ? "ANVC is on. Records appear here when your agent saves its work or a session ends." : "Connect an agent to start."}</p>}
      {start && (
        <div class="welcome-actions">
          {!connected && (
            <button class="button primary" onClick={onSetup}>
              <Icon name="plus" />
              Connect an agent
            </button>
          )}
          {earlier}
          {example}
        </div>
      )}
      {said && <p class="welcome-said" role="status">{said}</p>}
    </div>
  );
}

function TurnRow({
  turn,
  selected,
  onSelect,
}: {
  turn: Turn;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      class={`work-row${selected ? " selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
      aria-controls="attempt-detail"
      data-turn-id={turn.id}
    >
      <span
        class={`row-mark ${turn.status === "abandoned" ? "abandoned" : "kept"}`}
      >
        <Icon
          name={turn.status === "abandoned" ? "circle-x" : "circle-check"}
          size={18}
        />
      </span>
      <span class="row-content">
        <span class="row-title">
          {turnTitle(turn)}
        </span>
        {/* The outcome is already the icon and the colour of this row, and
            "Agent-written" is the normal case — printing either on every row
            was four pieces of furniture where one fact belonged. Only the
            unusual case earns a word. */}
        {/* The reason comes straight after the title: it is what people open
            a work log to find, and the diff cannot tell them. */}
        {turn.why && (
          <span class={`row-why${turn.status === "abandoned" ? " is-lost" : ""}`}>
            <b>Why</b>
            <span>{turn.why}</span>
          </span>
        )}
        {/* Where the reason would be, the fact that there isn't one. Built
            from the raw log because the agent recorded nothing. */}
        {!turn.authored && (
          <span class="row-why is-missing">
            <b>Why</b>
            <span>Your agent didn't say.</span>
          </span>
        )}
        {/* Each part names itself with an icon, and what ended up happening
            to the attempt is a pill, so the line reads at a glance. */}
        <span class="row-meta">
          {turn.filesWritten.length > 0 && (
            <span class="meta-item" title={`Files it changed:\n${turn.filesWritten.slice(0, 20).join("\n")}`}><Icon name="file-text" size={13} />{changedLine(turn.filesWritten)}</span>
          )}
          {/* Elapsed time is only news when there was any: a row reading "1s"
              on every line is a column of noise. */}
          {turn.seconds > 5 && <span class="meta-item" title="How long it took"><Icon name="clock" size={13} />took {duration(turn.seconds)}</span>}
          {turn.tier === "private" && (
            <span class="meta-item row-private" title="Kept only on this computer. Rows without this are shared: they go out with git push once sharing is on."><Icon name="hard-drive" size={13} />Private</span>
          )}
          {turn.retired && <span class="meta-pill" title="No longer shown to agents">Retired</span>}
          {turn.replacedBy && <span class="meta-pill" title="A later version replaced this">Replaced</span>}
          {turn.openDeadEnd && <span class="meta-pill is-open" title="Nobody has tried this again since it was abandoned">Not tried again</span>}
        </span>
      </span>
    </button>
  );
}

/**
 * The files an attempt changed, in words: "4 files in cloud/ and docs/". A
 * folder's name alone ("cloud") read as where it ran; the slash and the
 * words say they're folders.
 */
function changedLine(paths: string[]): string {
  const files = plural(paths.length, "file");
  const dirs = [...new Set(paths.map((p) => (p.includes("/") ? `${p.split("/")[0]}/` : "")))];
  if (dirs.includes("")) return files;
  return `${files} in ${dirs.length > 2 ? `${dirs.slice(0, 2).join(", ")} and ${dirs.length - 2} more` : dirs.join(" and ")}`;
}

function AttemptDetail({
  turn,
  turns,
  forge,
  onSelect,
  onClose,
  onSession,
}: {
  turn: Turn;
  /** All loaded turns, so a parent id can be shown as what it actually was. */
  turns: Turn[];
  forge: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  /** Narrows the work log to this attempt's session. */
  onSession?: (run: string) => void;
}) {
  const install = useInstall();
  // The edge points backwards, which is the wrong direction for a reader:
  // "what did we try before this" is useful, and "what finally worked" is more
  // useful still, so both directions are resolved here.
  const find = (id: string | null) => (id ? turns.filter((t) => t.id === id) : []);
  const retries = [
    ...find(turn.parent).map((other) => ({ label: "Retried after", other })),
    ...turns.filter((t) => t.parent === turn.id).map((other) => ({ label: "Retried by", other })),
  ];
  const versions = [
    ...find(turn.supersedes).map((other) => ({ label: "Replaces", other })),
    ...find(turn.replacedBy).map((other) => ({ label: "Replaced by", other })),
  ];
  const lineage = [...retries, ...versions];
  const tierCommand = install && anvc(install, `${turn.tier === "private" ? "share" : "unshare"} ${turn.id}`);
  const title = useRef<HTMLHeadingElement>(null);
  // Beside the list on a wide screen; over it, as a modal, on a narrow one.
  const [overlay, setOverlay] = useState(
    () => matchMedia("(max-width: 900px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(max-width: 900px)");
    const update = () => setOverlay(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, [turn.id]);
  const content = (
    <>
      <div class="detail-top">
        <h2 ref={title} tabIndex={-1}>{turnTitle(turn)}</h2>
        <button class="icon-button" onClick={onClose} aria-label="Close details">
          <Icon name="close" />
        </button>
      </div>
      <div class="detail-content">
        <OutcomeBadge status={turn.status} />
        {turn.why && (
          <div
            class={`reason-box ${turn.status === "abandoned" ? "abandoned" : ""}`}
          >
            <p>{turn.why}</p>
          </div>
        )}
        {!turn.authored && (
          <div class="reason-box missing">
            <Icon name="triangle-alert" size={18} />
            <p>
              Your agent didn't say why. ANVC saved this from the log: the commands, files and what failed.
            </p>
          </div>
        )}
        {turn.detail?.narrative && (
          <Field title="What happened">
            <p class="detail-prose">{turn.detail.narrative}</p>
          </Field>
        )}
        {turn.detail?.output && (
          <Field title="Output" hint="output">
            <pre class="detail-output">{turn.detail.output}</pre>
          </Field>
        )}
        {(turn.detail?.ruled_out?.length ?? 0) > 0 && (
          <Field title="Ruled out" hint="ruled-out">
            <ul class="ruled-out">
              {turn.detail!.ruled_out!.map((item) => (
                <li key={item.approach}>
                  <span class="ruled-approach">{item.approach}</span>
                  <span class="ruled-because">{item.because}</span>
                </li>
              ))}
            </ul>
          </Field>
        )}
        {(turn.detail?.not_investigated?.length ?? 0) > 0 && (
          <Field title="Not checked" hint="not-investigated">
            <ul class="constraints open-questions">
              {turn.detail!.not_investigated!.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Field>
        )}
        {turn.recheck && (
          <Field title="Recheck command" hint="recheck">
            <code class="recheck">{turn.recheck}</code>
          </Field>
        )}
        {(turn.detail?.commands?.length ?? 0) > 0 && (
          <details class="provenance">
            <summary>Commands run · {turn.detail!.commands!.length}</summary>
            <pre>{turn.detail!.commands!.join("\n")}</pre>
          </details>
        )}
        {lineage.length > 0 && (
          <Field title={!versions.length ? "Retries" : !retries.length ? "Versions" : "Retries and versions"} hint={retries.length ? "continued" : undefined}>
            <ul class="lineage">
              {lineage.map(({ label, other }) => (
                <li key={other.id}>
                  <span class="lineage-label">{label}</span>
                  <button class="lineage-goal" onClick={() => onSelect(other.id)}>{turnTitle(other)}<Icon name="arrow-right" size={14} /></button>
                  <span class={`lineage-outcome ${other.status}`}>
                    {other.status === "abandoned" ? "abandoned" : "kept"}
                  </span>
                </li>
              ))}
            </ul>
          </Field>
        )}
        {turn.constraints.length > 0 && (
          <Field title="Constraints">
            <ul class="constraints">
              {turn.constraints.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Field>
        )}
        {/* Empty sections are left out: "Files · 0, No file changes recorded"
            took two lines to say nothing. */}
        {turn.filesWritten.length > 0 && (
        <Field title={`Files · ${turn.filesWritten.length}`}>
            <ul class="file-list">
              {turn.filesWritten.map((path) => {
                const href = forge
                  ? fileLink(forge, path, turn.anchorCommit)
                  : null;
                return (
                  <li key={path}>
                    <Icon name="file-text" size={15} />
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        {path}
                        <Icon name="external-link" size={12} />
                      </a>
                    ) : (
                      <code>{path}</code>
                    )}
                  </li>
                );
              })}
            </ul>
        </Field>
        )}
        {turn.actions.length > 0 && (
        <Field title={`Steps · ${turn.actions.length}`} hint="steps">
            <>
              <Track actions={turn.actions} seconds={turn.seconds} />
              <div class="track-labels">
                <span>0s</span>
                <div>
                  {turn.actions.some((action) => action.kind === "read") && <span class="read">Read</span>}
                  {turn.actions.some((action) => action.kind === "write") && <span class="write">Write</span>}
                  {turn.actions.some((action) => action.kind === "shell") && <span class="shell">Command</span>}
                </div>
                <span>{duration(turn.seconds)}</span>
              </div>
              <ol class="activity-list">
                {turn.actions.map((action, i) => (
                  <li key={`${turn.id}-${i}`}>
                    <span class={`action-symbol ${action.kind}`}>
                      <Icon
                        name={
                          action.kind === "read"
                            ? "eye"
                            : action.kind === "write"
                              ? "pencil"
                              : "terminal"
                        }
                        size={14}
                      />
                    </span>
                    <details>
                      <summary>
                        <span>{action.label}</span>
                        <time>+{duration(action.at)}</time>
                      </summary>
                      <pre>{action.full}</pre>
                    </details>
                  </li>
                ))}
              </ol>
            </>
        </Field>
        )}
        {turn.anchorCommit && (
          <Field title="Commit" hint="anchor">
            {forge ? (
              <a
                class="commit-link"
                href={`${forge}/commit/${turn.anchorCommit}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="git-commit-horizontal" />
                <code>{turn.anchorCommit.slice(0, 12)}</code>
                <Icon name="external-link" size={12} />
              </a>
            ) : (
              <code>{turn.anchorCommit.slice(0, 12)}</code>
            )}
          </Field>
        )}
        {!turn.authored && (
          <details class="provenance">
            <summary>Your prompt</summary>
            <p>The agent didn't give this a title.</p>
            <pre>{turn.intent}</pre>
          </details>
        )}
        {/* Who can read this, and the one command that changes it. A person
            runs it rather than the agent: publishing is theirs to decide. */}
        <div class={`tier-note is-${turn.tier}`}>
          <Icon name={turn.tier === "private" ? "lock" : "users"} size={17} />
          <div>
            <Hint id={turn.tier}>
              <b>{turn.tier === "private" ? "Private" : "Shared"}</b>
            </Hint>
            <span>
              {turn.tier === "private"
                ? "Only on this computer."
                : "Pushed with your code."}
            </span>
            {tierCommand && (
              <span class="tier-command">
                <code>{tierCommand}</code>
                <CopyButton text={tierCommand} />
              </span>
            )}
          </div>
        </div>
        <div class="record-metadata">
        <p class="detail-time">
          <Icon name="clock" size={14} />
          <time dateTime={turn.start}>
            {new Date(turn.start).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </time>
          <span>·</span>
          {duration(turn.seconds)}
        </p>
          <Hint id={turn.authored ? "authored" : "captured"}>
            <Source authored={turn.authored} />
          </Hint>
        </div>
        <div class="record-footer">
          <span>Session</span>
          <code>{turn.run || "Unknown"}</code>
          {turn.run && onSession && (
            <button type="button" class="link-button" onClick={() => onSession(turn.run)}>Show this session</button>
          )}
        </div>
      </div>
    </>
  );
  return overlay ? (
    <Modal open onClose={onClose} class="detail-panel" id="attempt-detail" aria-label="Attempt details">{content}</Modal>
  ) : (
    <aside class="detail-panel" id="attempt-detail" aria-label="Attempt details">{content}</aside>
  );
}

function App() {
  const [repo, setRepo] = useState<WorkRepo>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [everything, setEverything] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [example, setExample] = useState(
    () => new URLSearchParams(location.search).get("example") === "1",
  );
  const exampleData = useMemo(exampleWork, []);
  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("all");
  const [session, setSession] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [setup, setSetup] = useState(false);
  // Open on the first visit: what travels with git push and what never does is
  // the one thing to understand before trusting this with real work.
  const [tour, setTour] = useState(false);
  // The first choice, made once: after the tour, or on a later visit if the
  // tour was closed before it got there. Also opened for anyone set up before
  // ANVC asked how much to tell the agent, so that question reaches them once.
  const [choose, setChoose] = useState(false);
  useEffect(() => {
    void Promise.all([getJson("/api/seen"), getJson("/api/policy"), getJson("/api/assist")]).then(([seen, p, a]) => {
      // Seen in this browser before the server kept it.
      for (const key of ["tour", "choose"]) {
        try { if (!seen[key] && localStorage.getItem(`anvc.${key}.seen`) === "1") { seen[key] = true; void send("/api/seen", { key }); } } catch { /* fine */ }
      }
      if (!seen.tour) setTour(true);
      else if (!seen.choose && ((p && p.chosen === false) || (a && a.everywhere?.from === "default"))) setChoose(true);
    }).catch(() => {});
  }, []);
  // A second desktop window opens on the project list, to pick what it shows.
  const [page, setPage] = useState<Page>(() => (new URLSearchParams(location.search).get("page") === "folders" ? "folders" : "work"));
  // A project with goals opens on them.
  useEffect(() => {
    void getJson<{ goals?: unknown[] }>("/api/goals").then((v) => { if (v.goals?.length) setPage((p) => (p === "work" ? "project" : p)); }).catch(() => {});
  }, []);
  // Dragged by its edge, remembered in this browser.
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try { return clampSidebar(Number(localStorage.getItem("anvc.sidebar.width")) || SIDEBAR_DEFAULT); } catch { return SIDEBAR_DEFAULT; }
  });
  useEffect(() => { try { localStorage.setItem("anvc.sidebar.width", String(sidebarWidth)); } catch { /* fine */ } }, [sidebarWidth]);
  const folderState = useFolders();
  const search = useRef<HTMLInputElement>(null);
  const requesting = useRef(false);

  const load = useCallback(async () => {
    if (requesting.current) return;
    requesting.current = true;
    setBusy(true);
    try {
      const data = await getJson<WorkRepo>(everything ? "/api/repo?all" : "/api/repo", { signal: AbortSignal.timeout(8000) });
      if (!Array.isArray(data.turns) || !data.stats)
        throw new Error("Invalid repository response");
      setRepo(data);
      setLoaded(true);
      setError(false);
    } catch {
      setError(true);
    } finally {
      requesting.current = false;
      setBusy(false);
    }
  }, [everything]);
  useEffect(() => {
    void load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const data = example ? exampleData : repo;
  // The desktop app's window takes its title from this, so it follows a project opened from Folders.
  useEffect(() => { document.title = data.name ? `ANVC · ${data.name}` : "ANVC"; }, [data.name]);
  const sessions = useMemo(() => groupSessions(data.turns), [data.turns]);
  const shown = useMemo(
    () => filterTurns(data.turns, query, outcome, session),
    [data.turns, query, outcome, session],
  );
  const scope = useMemo(
    () => filterTurns(data.turns, "", "all", session),
    [data.turns, session],
  );
  const active = shown.find((turn) => turn.id === selected);
  const count = (tab: Outcome) => scope.filter((turn) => inOutcome(turn, tab)).length;
  const sessionTitle = sessions.find((item) => item.id === session)?.title;
  const reset = () => {
    setQuery("");
    setOutcome("all");
    setSession(null);
    setSelected(null);
  };
  const closeDetails = useCallback(() => {
    setSelected(null);
    requestAnimationFrame(() => {
      const row = [
        ...document.querySelectorAll<HTMLButtonElement>("[data-turn-id]"),
      ].find((item) => item.dataset.turnId === selected);
      row?.focus({ preventScroll: true });
    });
  }, [selected]);
  const switchExample = (value: boolean) => {
    setExample(value);
    reset();
    const url = new URL(location.href);
    if (value) url.searchParams.set("example", "1");
    else url.searchParams.delete("example");
    history.replaceState(null, "", url);
  };
  const install = useInstall();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Ctrl+N opens another window in the desktop app; a browser opens its own.
      if (install?.managed === "desktop" && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n" && !event.repeat) {
        event.preventDefault();
        void send("/api/window", {});
        return;
      }
      if (setup || tour || event.metaKey || event.ctrlKey || event.altKey) return;
      const element = event.target as HTMLElement;
      const editing =
        element.matches("input, textarea, select") || element.isContentEditable;
      if (event.key === "/" && !editing) {
        event.preventDefault();
        search.current?.focus();
      }
      if (event.key === "Escape") {
        if (active) closeDetails();
        else if (query) setQuery("");
        else if (outcome !== "all" || session) reset();
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [setup, tour, query, outcome, session, active, closeDetails, install?.managed]);

  return (
    <>
      <Sprite />
      <a class="skip-link" href="#work">
        Skip to work log
      </a>
      <div class="workspace" style={{ "--sidebar-w": `${sidebarWidth}px` }}>
        <aside class="sidebar" aria-label="Workspace navigation">
          <div
            class="sidebar-resize"
            role="separator"
            aria-orientation="vertical"
            aria-label="Sidebar width"
            aria-valuenow={sidebarWidth}
            aria-valuemin={SIDEBAR_MIN}
            aria-valuemax={SIDEBAR_MAX}
            tabIndex={0}
            onPointerDown={(event) => {
              event.preventDefault();
              const move = (e: PointerEvent) => setSidebarWidth(clampSidebar(e.clientX));
              const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); };
              addEventListener("pointermove", move);
              addEventListener("pointerup", up);
            }}
            onDblClick={() => setSidebarWidth(SIDEBAR_DEFAULT)}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") setSidebarWidth((w) => clampSidebar(w - 16));
              if (event.key === "ArrowRight") setSidebarWidth((w) => clampSidebar(w + 16));
            }}
          />
          <div class="brand" data-page={page === "work" && session ? "Session" : TITLE[page]}>
            <span class="brand-symbol">
              <Icon name="layers" size={17} />
            </span>
            <span>anvc</span>
          </div>
          <button
            class={`nav-item${!session && page === "work" ? " active" : ""}`}
            onClick={() => { setPage("work"); reset(); }}
          >
            <Icon name="history" />
            <span>Work log</span>
          </button>
          {PAGES.map(([id, icon, label]) => (
            <button key={id} class={`nav-item${page === id ? " active" : ""}`} onClick={() => setPage(page === id ? "work" : id)}>
              <Icon name={icon} />
              <span>{label}</span>
            </button>
          ))}
          <div class="sidebar-bottom">
            <ModeButton />
            <button class={`nav-item${page === "settings" ? " active" : ""}`} onClick={() => setPage("settings")}>
              <Icon name="sliders" />
              <span>Settings</span>
            </button>
            <button class="nav-item" onClick={() => setTour(true)}>
              <Icon name="circle-help" />
              <span>How it works</span>
            </button>
            <button class={`nav-item${page === "faq" ? " active" : ""}`} onClick={() => setPage(page === "faq" ? "work" : "faq")}>
              <Icon name="message-circle-question" />
              <span>Questions</span>
            </button>
            <button class="nav-item" onClick={() => setSetup(true)}>
              <Icon name="plus" />
              <span>Connect an agent</span>
            </button>
            <Version />

          </div>
        </aside>

        <main id="work" class="main" tabIndex={-1}>
          <header class="topbar">
            <div class="breadcrumb">
              <Icon name="folder" />
              <strong>{data.name ?? "Repository"}</strong>
            </div>
            <div class="topbar-actions">
              {!example && <FolderSwitch folders={folderState} />}
              {data.forge && (
                <a
                  href={data.forge}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="forge-link"
                >
                  Open repository
                  <Icon name="external-link" size={13} />
                </a>
              )}
              <button
                class="icon-button"
                aria-label="Refresh work log"
                disabled={busy || example}
                onClick={load}
              >
                <Icon name="refresh" />
              </button>
            </div>
          </header>
          {example && (
            <div class="example-banner">
              <span>
                <strong>Example data.</strong>
                <span class="banner-description"> Your repository isn't touched.</span>
              </span>
              <button onClick={() => switchExample(false)}>
                Back to my repository
                <Icon name="arrow-right" size={14} />
              </button>
            </div>
          )}
          {!example && error && (
            <div class="error-banner" role="alert">
              <span>
                {loaded
                  ? "Connection lost. Showing the last recorded work."
                  : "Can’t load this repository. Check that the ANVC server is still running."}
              </span>
              <button onClick={load} disabled={busy}>
                {busy ? "Retrying…" : "Try again"}
              </button>
            </div>
          )}
          <div class="page-heading">
            <div>
              <h1>{page === "work" && session ? "Session" : TITLE[page]}</h1>
              {page === "work" && sessionTitle && <p>{sessionTitle}</p>}
            </div>
            {(!example && (error || !loaded)) && (
              <span
                class={`sync-status${error && !example ? " offline" : ""}`}
                role="status"
              >
                <span class="connection-dot" />
                {error ? "Disconnected" : "Connecting…"}
              </span>
            )}
          </div>
          {page === "work" && !example && !(loaded && !data.turns.length) && <OffBanner folders={folderState} />}
          {page === "work" && !example && !session && loaded && <HelpedBlock />}
          {page === "folders" && <FoldersPage folders={folderState} />}
          {page === "results" && <ResultsHub />}
          {page === "stats" && <StatsPage />}
          {page === "project" && <ProjectPage />}
          {page === "settings" && <Settings />}
          {page === "faq" && <FaqPage />}
          {page === "work" && (loaded || example) && data.turns.length > 0 && (
            <>
              <div class="filterbar">
                <div
                  class="filter-tabs"
                  role="group"
                  aria-label="Filter by outcome"
                >
                  {FILTERS.filter((filter) => filter.value !== "unexplained" || outcome === "unexplained" || count("unexplained") > 0).map((filter) => (
                    <button
                      key={filter.value}
                      aria-pressed={outcome === filter.value}
                      onClick={() => {
                        setOutcome(filter.value);
                        setSelected(null);
                      }}
                      class={`${outcome === filter.value ? "current" : ""}${filter.value === "unexplained" ? " tab-missing" : ""}`}
                    >
                      {filter.label}
                      <span>{count(filter.value)}</span>
                    </button>
                  ))}
                </div>
                <label class="search">
                  <Icon name="search" />
                  <input
                    ref={search}
                    aria-label="Search work"
                    type="search"
                    placeholder="Search work…"
                    value={query}
                    onInput={(event) => setQuery(event.currentTarget.value)}
                  />
                  <kbd>{query ? "esc" : "/"}</kbd>
                </label>
              </div>
              <div class={`list-heading${query || session || outcome !== "all" ? " has-filters" : ""}`}>
                <span>
                  {session && (
                    <button
                      class="session-filter"
                      onClick={() => {
                        setSession(null);
                        setSelected(null);
                      }}
                      aria-label="Clear session filter"
                    >
                      Session
                      <Icon name="close" size={12} />
                    </button>
                  )}
                  {(query || session || outcome !== "all") && (
                    <span aria-live="polite">
                      {shown.length} of {data.turns.length}
                      {query ? ` matching “${query}”` : ""}
                    </span>
                  )}
                </span>
              </div>
              <div class={`work-layout${active ? " has-detail" : ""}`}>
                <div class="work-list">
                  {shown.length ? (
                    [...shown].sort((a, b) => b.start.localeCompare(a.start)).map((turn, i, sorted) => (
                      <Fragment key={turn.id}>
                        {(i === 0 || new Date(sorted[i - 1]!.start).toDateString() !== new Date(turn.start).toDateString()) && (
                          <h3 class="work-day">{DAY.format(new Date(turn.start))}</h3>
                        )}
                        <TurnRow
                          turn={turn}
                          selected={active?.id === turn.id}
                          onSelect={() => setSelected(turn.id)}
                        />
                      </Fragment>
                    ))
                  ) : (
                    <div class="no-results">
                      <Icon name="search" size={28} />
                      <h2>No matches</h2>
                      <p>
                        Try a file name or a word from the goal.
                      </p>
                      <button class="button" onClick={reset}>
                        Clear filters
                      </button>
                    </div>
                  )}
                  {data.stats.records > data.turns.length && (
                    <button type="button" class="button show-all" onClick={() => setEverything(true)}>
                      Show all {data.stats.records} attempts
                    </button>
                  )}
                </div>
                {active && (
                  <AttemptDetail
                    key={active.id}
                    turn={active}
                    turns={data.turns}
                    forge={data.forge}
                    onSelect={(id) => {
                      reset();
                      setSelected(id);
                    }}
                    onSession={(run) => {
                      reset();
                      setSession(run);
                    }}
                    onClose={closeDetails}
                  />
                )}
              </div>
            </>
          )}
          {page === "work" && !example && !loaded && !error && (
            <div class="loading-state" role="status">
              <div class="loading-line" />
              <div class="loading-line" />
              <div class="loading-line" />
              <span>Loading…</span>
            </div>
          )}
          {page === "work" && !example && loaded && !data.turns.length && (
            <Welcome
              on={folderState.here?.on ?? null}
              again={setup}
              onTurnOn={() => folderState.here && void folderState.set(folderState.here.repo, true)}
              onSetup={() => setSetup(true)}
              onExample={() => switchExample(true)}
              onImported={load}
            />
          )}
        </main>
      </div>
      <Setup open={setup} onClose={() => setSetup(false)} />
      <Tour open={tour} onClose={() => setTour(false)} onChoose={() => { setTour(false); setChoose(true); }} />
      <Choose open={choose} onClose={() => { void send("/api/seen", { key: "choose" }); setChoose(false); }} onCustomise={() => { setChoose(false); setPage("settings"); }} />
    </>
  );
}

render(<App />, document.getElementById("root")!);
