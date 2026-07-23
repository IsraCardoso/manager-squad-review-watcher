import { test, expect } from "bun:test";
import { postGithubReview } from "./postGithubReview";

const PR_URL = "https://github.com/acme-corp/backend-api/pull/1007";

test("approved verdict maps to gh pr review --approve", async () => {
  let capturedArgs: string[] = [];
  const runGh = async (args: string[]) => {
    capturedArgs = args;
    return { stdout: "", stderr: "", exitCode: 0 };
  };
  await postGithubReview(PR_URL, "approved", "Aprovado ✔️", runGh);
  expect(capturedArgs).toContain("--approve");
});

test("approved_with_comment verdict maps to gh pr review --approve", async () => {
  let capturedArgs: string[] = [];
  const runGh = async (args: string[]) => {
    capturedArgs = args;
    return { stdout: "", stderr: "", exitCode: 0 };
  };
  await postGithubReview(PR_URL, "approved_with_comment", "Aprovado com comentário", runGh);
  expect(capturedArgs).toContain("--approve");
});

test("changes_requested verdict maps to gh pr review --request-changes", async () => {
  let capturedArgs: string[] = [];
  const runGh = async (args: string[]) => {
    capturedArgs = args;
    return { stdout: "", stderr: "", exitCode: 0 };
  };
  await postGithubReview(PR_URL, "changes_requested", "Mudanças necessárias", runGh);
  expect(capturedArgs).toContain("--request-changes");
});

test("gh failure (no permission / already merged) propagates a clear error", async () => {
  const runGh = async () => ({ stdout: "", stderr: "pull request is closed", exitCode: 1 });
  await expect(postGithubReview(PR_URL, "approved", "body", runGh)).rejects.toThrow(
    /pull request is closed/,
  );
});
