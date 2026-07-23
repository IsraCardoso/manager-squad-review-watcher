import { test, expect } from "bun:test";
import { fetchPr, type GhRunner } from "./fetchPr";

const PR_URL = "https://github.com/acme-corp/backend-api/pull/1007";

test("happy path: valid URL returns parsed diff and metadata", async () => {
  const runGh: GhRunner = async (args) => {
    if (args[1] === "diff") return { stdout: "diff --git a/x b/x\n+added", stderr: "", exitCode: 0 };
    return {
      stdout: JSON.stringify({
        title: "chore(ci): add tsc gate",
        body: "desc",
        files: [{ path: "x.ts", additions: 1, deletions: 0 }],
        additions: 1,
        deletions: 0,
        baseRefName: "devel",
        headRefName: "feat/x",
      }),
      stderr: "",
      exitCode: 0,
    };
  };

  const result = await fetchPr(PR_URL, runGh);
  expect(result.diff).toContain("+added");
  expect(result.metadata.title).toBe("chore(ci): add tsc gate");
  expect(result.metadata.baseRefName).toBe("devel");
});

test("error path: gh pr diff failure propagates a clear error", async () => {
  const runGh: GhRunner = async (args) => {
    if (args[1] === "diff") return { stdout: "", stderr: "pull request not found", exitCode: 1 };
    return { stdout: "{}", stderr: "", exitCode: 0 };
  };

  await expect(fetchPr(PR_URL, runGh)).rejects.toThrow(/pull request not found/);
});

test("error path: gh pr view failure propagates a clear error", async () => {
  const runGh: GhRunner = async (args) => {
    if (args[1] === "diff") return { stdout: "diff", stderr: "", exitCode: 0 };
    return { stdout: "", stderr: "no permission", exitCode: 1 };
  };

  await expect(fetchPr(PR_URL, runGh)).rejects.toThrow(/no permission/);
});

test("error path: gh pr view exits 0 but returns unparseable JSON -- clear error, not a raw SyntaxError", async () => {
  const runGh: GhRunner = async (args) => {
    if (args[1] === "diff") return { stdout: "diff", stderr: "", exitCode: 0 };
    return { stdout: "not actually json", stderr: "", exitCode: 0 };
  };

  await expect(fetchPr(PR_URL, runGh)).rejects.toThrow(/unparseable JSON/);
});
