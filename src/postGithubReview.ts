import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Verdict } from "./types";
import { defaultGhRunner, type GhRunner } from "./fetchPr";

function reviewFlag(verdict: Verdict): "--approve" | "--request-changes" {
  return verdict === "changes_requested" ? "--request-changes" : "--approve";
}

/**
 * Body goes through --body-file (a temp file), not --body <string>: a
 * review body sourced from reviewCommand findings/PR content could start with "-" and
 * be misread as a gh flag by argv parsing, and a large body could hit OS
 * argv length limits. A file sidesteps both.
 */
export async function postGithubReview(
  prUrl: string,
  verdict: Verdict,
  body: string,
  runGh: GhRunner = defaultGhRunner,
): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "manager-squad-review-"));
  const bodyPath = join(dir, "body.md");
  try {
    writeFileSync(bodyPath, body);
    const result = await runGh(["pr", "review", prUrl, reviewFlag(verdict), "--body-file", bodyPath]);
    if (result.exitCode !== 0) {
      throw new Error(`gh pr review failed for ${prUrl}: ${result.stderr.trim()}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
