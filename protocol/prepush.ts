/**
 * What a push is about to share, checked before it leaves.
 *
 * Runs from an optional pre-push hook. It prints one line saying which
 * records are going and how many stay private, and it stops the push when a
 * record being sent holds something shaped like a credential. The scrubber
 * already redacts at capture; this is the second check, because the first one
 * catching a key was, the day it mattered, luck of the pattern.
 *
 * It also keeps private history from leaving under any name. Only pushes to
 * `refs/anvc/` used to be read, so a push of `refs/anvc-private/*` or of the
 * raw log's refs to the team's remote went out without a word.
 *
 * A push of code alone passes through in silence.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { quoted } from "../scripts/hookfiles";
import { isLocalOnly, LOCAL_ONLY_REFUSAL } from "./localonly";
import { git, readRefs } from "./git";
import { below, samePath } from "./rawlog";
import { findSecrets } from "./scrub";
import { TIER_PREFIX, type CheckpointRecord } from "./record";
import { checkPrivateRemote, PRIVATE_REFS, privateRemote } from "./sync";
import { anvcCommand, notePointer, pointerFile } from "./version";

const ZERO = /^0+$/;

/** The line ANVC's hook is recognised by. */
const MARK = "anvc: runs the pre-push hook";
const hookFile = (repo: string) => resolve(repo, git(repo, ["rev-parse", "--git-path", "hooks"]), "pre-push");

/** Whether the pre-push check is installed here. */
export function prePushOn(repo: string): boolean {
  const hook = hookFile(repo);
  return existsSync(hook) && readFileSync(hook, "utf8").includes(MARK);
}

/**
 * The hook's script. A plugin update moves ANVC's command line, so the hook
 * runs the one named in ~/.anvc/cli, which each session start keeps current,
 * and a check that's gone mustn't stop every push. A POSIX sh script on every
 * system: Git for Windows runs hooks with the sh it ships.
 */
function prePushScript(before: string): string {
  const pointer = pointerFile();
  const missing = `anvc: push check skipped. The ANVC command line named in ${pointer} isn't there. Start a new agent session, and it's named again.`;
  return `#!/bin/sh
# anvc: runs the pre-push hook that was here first, then checks the records
# this push shares. To undo: anvc push-check off
input=$(cat)
if [ -x ${quoted(before)} ]; then
  printf '%s\\n' "$input" | ${quoted(before)} "$@" || exit $?
fi
cli=$(cat ${quoted(pointer)} 2>/dev/null)
if [ ! -f "$cli" ]; then
  printf '%s\\n' ${quoted(missing)} >&2
  exit 0
fi
printf '%s\\n' "$input" | bun "$cli" pre-push --repo "$(git rev-parse --show-toplevel)" "$@"
`;
}

/**
 * Installs the pre-push check. A hook already there moves aside and runs
 * first, and its answer stands. Throws where hooks live inside the project
 * (core.hooksPath, as husky sets it): a hook written there would be committed,
 * naming this computer's paths.
 */
export function installPrePush(repo: string): string {
  const dir = samePath(resolve(hookFile(repo), ".."));
  const hook = resolve(dir, "pre-push");
  if (below(samePath(git(repo, ["rev-parse", "--path-format=absolute", "--git-common-dir"])), dir) === null) {
    throw new Error(`hooks here live in ${dir}, which is part of the project; add this line to your pre-push hook instead:\n    ${anvcCommand()} pre-push --repo "$(git rev-parse --show-toplevel)" "$@"`);
  }
  notePointer();
  const before = `${hook}.before-anvc`;
  mkdirSync(dir, { recursive: true });
  const current = existsSync(hook) ? readFileSync(hook, "utf8") : "";
  if (current && !current.includes(MARK)) renameSync(hook, before);
  writeFileSync(hook, prePushScript(before));
  chmodSync(hook, 0o755);
  return `pre-push hook installed${current && !current.includes("anvc:") ? "; your earlier one runs first, from pre-push.before-anvc" : ""}`;
}

/**
 * Writes this version's check over one an earlier ANVC installed. Until 0.4.10
 * the check named the command line by its path, which a plugin update
 * removes. Session starts call this, and with no hook it reads one missing
 * file. Hooks outside .git/hooks are left as they are.
 */
export function refreshPrePush(root: string): void {
  try {
    const text = readFileSync(join(root, ".git", "hooks", "pre-push"), "utf8");
    if (text.includes(MARK) && !text.includes(`cat ${quoted(pointerFile())}`)) installPrePush(root);
  } catch { /* no check here, or it stays as it was */ }
}

/** Takes the check out, and puts back the hook it wrapped. Null when it isn't here. */
export function removePrePush(repo: string): string | null {
  if (!prePushOn(repo)) return null;
  const hook = hookFile(repo);
  rmSync(hook);
  if (!existsSync(`${hook}.before-anvc`)) return "the pre-push check";
  renameSync(`${hook}.before-anvc`, hook);
  return "the pre-push check; your earlier pre-push hook is back";
}

export interface Found { id: string; goal: string; field: string; kind: string; sample: string }

/** Where in a record a credential sits, as a field path, or null. */
function locate(value: unknown, path: string): { field: string; kind: string; sample: string } | null {
  if (typeof value === "string") {
    const [hit] = findSecrets(value);
    return hit ? { field: path, ...hit } : null;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const found = locate(value[i], `${path}[${i}]`);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      const found = locate(v, path ? `${path}.${k}` : k);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Records in a set of blob oids that carry a credential, and the oids that
 * aren't a record at all. Those can't be checked, so a push stops on them
 * instead of letting them through unread.
 */
export function scanRecords(repo: string, oids: string[]): { records: CheckpointRecord[]; found: Found[]; unreadable: string[] } {
  const records: CheckpointRecord[] = [];
  const found: Found[] = [];
  const unreadable: string[] = [];
  for (const oid of oids) {
    let record: CheckpointRecord;
    try {
      record = JSON.parse(git(repo, ["cat-file", "blob", oid])) as CheckpointRecord;
      if (!record || typeof record !== "object") throw new Error("not a record");
    } catch { unreadable.push(oid); continue; }
    records.push(record);
    const hit = locate(record, "");
    if (hit) found.push({ id: record.id, goal: record.intent?.goal ?? "(no goal)", ...hit });
  }
  return { records, found, unreadable };
}

const stopped = (why: string) => ({ ok: false, message: `ANVC  push stopped: ${why}\n  Nothing was pushed.` });

/**
 * The check a pre-push hook runs. `lines` is what git hands the hook on
 * stdin: "<local ref> <local oid> <remote ref> <remote oid>" per ref.
 * `remote` is the name git gives the hook as its first argument.
 */
export function prePush(repo: string, lines: string[], remote?: string): { ok: boolean; message: string | null } {
  // Local only: a push that names any ANVC ref is someone doing by hand what
  // the settings were changed to prevent.
  if (isLocalOnly(repo) && lines.some((l) => /\srefs\/anvc/.test(` ${l}`))) return stopped(LOCAL_ONLY_REFUSAL);
  const refs = lines.map((l) => l.trim().split(/\s+/)).filter((w) => w.length >= 4 && !ZERO.test(w[1]!))
    .map(([local, oid, to]) => ({ local: local!, oid: oid!, to: to! }));

  // Private history goes to one place: the remote anvc sync was pointed at,
  // and only while it still passes the check sync makes.
  const held = refs.filter((r) => PRIVATE_REFS.some((p) => r.local.startsWith(p)));
  if (held.length && !(remote && remote === privateRemote(repo) && checkPrivateRemote(repo, remote).ok)) {
    return stopped(`private history only goes to the remote anvc sync uses: ${held[0]!.local}${held.length > 1 ? ` and ${held.length - 1} more` : ""}`
      + (remote ? "" : "\n  This hook doesn't pass on which remote it is. Install it again with: bun run setup --pre-push"));
  }

  const outgoing = refs.filter((r) => r.local.startsWith(TIER_PREFIX.shared) || r.to.startsWith(TIER_PREFIX.shared));
  if (!outgoing.length) return { ok: true, message: null };

  const { records, found, unreadable } = scanRecords(repo, outgoing.map((r) => r.oid));
  if (unreadable.length) {
    const names = outgoing.filter((r) => unreadable.includes(r.oid)).map((r) => r.local);
    return stopped(`${names.join(", ")} isn't a record, so it can't be checked for secrets`);
  }
  if (found.length) {
    const lines = found.slice(0, 5).map((f) =>
      `  ${f.id}  "${f.goal.slice(0, 60)}"  ${f.field} holds what looks like a ${f.kind} (${f.sample})`);
    return stopped(`${found.length} record${found.length === 1 ? "" : "s"} would share a secret\n${lines.join("\n")}\n`
      + `  Make ${found.length === 1 ? "it" : "them"} private with: anvc unshare ${found.map((f) => f.id).join(" ")}`);
  }
  const kept = records.filter((r) => r.outcome?.status === "kept").length;
  const abandoned = records.length - kept;
  const privateCount = readRefs(repo, TIER_PREFIX.private).length;
  return {
    ok: true,
    message: `ANVC  sharing ${records.length} record${records.length === 1 ? "" : "s"} (${kept} kept, ${abandoned} abandoned)`
      + (privateCount ? ` · ${privateCount} private stay here` : ""),
  };
}
