/**
 * Records as dated Markdown pages, readable without ANVC.
 */
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { exportDays } from "../protocol/export";
import { appendRecord } from "../protocol/record";
import { cli, gitRepo, rec, tmp } from "./helpers";

test("each day's records become one page, and private ones stay out unless asked for", () => {
  const repo = gitRepo();
  appendRecord(repo, rec({
    ts: "2026-10-07T12:00:00.000Z", intent: { goal: "Score the 7B traces at the boundary token", why: "The rise could be a token artifact." },
    outcome: { status: "abandoned", recheck: "python score.py --check" }, delta: { files: ["scripts/score.py"] },
    detail: { not_investigated: ["Qwen3-8B scores"] },
  }));
  appendRecord(repo, rec({ ts: "2026-10-07T13:00:00.000Z", intent: { goal: "Keep the customer's name out of the log" } }), { tier: "private" });
  appendRecord(repo, rec({ ts: "2026-10-09T12:00:00.000Z", intent: { goal: "Rewrite the abstract" } }));

  const { days, leftOut } = exportDays(repo, { dates: ["2026-10-07"] });
  expect(leftOut).toBe(1);
  expect(days.map((d) => d.day)).toEqual(["2026-10-07"]);
  const page = days[0]!.page;
  expect(page).toContain("1 attempt recorded, 1 abandoned.");
  expect(page).toContain("✗ Abandoned: Score the 7B traces at the boundary token");
  expect(page).toContain("- Why: The rise could be a token artifact.");
  expect(page).toContain("- Files: `scripts/score.py`");
  expect(page).toContain("- Not checked: Qwen3-8B scores");
  expect(page).toContain("- To check it's still true: `python score.py --check`");
  expect(page).not.toContain("customer");
  expect(exportDays(repo, { dates: ["2026-10-07"], private: true }).days[0]!.page).toContain("customer");

  const out = tmp("anvc-export-");
  expect(cli(repo, "export", "--out", out).out).toContain("Wrote 2 pages");
  expect(readFileSync(join(out, "2026-10-09.md"), "utf8")).toContain("✓ Kept: Rewrite the abstract");
});
