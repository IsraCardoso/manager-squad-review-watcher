export interface PrMetadata {
  title: string;
  body: string;
  files: { path: string; additions: number; deletions: number }[];
  additions: number;
  deletions: number;
  baseRefName: string;
  headRefName: string;
}

export interface PrContext {
  diff: string;
  metadata: PrMetadata;
}

export interface GhRunner {
  (args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

export async function defaultGhRunner(args: string[]) {
  const proc = Bun.spawn(["gh", ...args], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
}

/**
 * Fetches diff and metadata via `gh` only — no local clone/checkout of the
 * PR branch (KTD: "Sem checkout local do branch").
 */
export async function fetchPr(prUrl: string, runGh: GhRunner = defaultGhRunner): Promise<PrContext> {
  const [diffResult, viewResult] = await Promise.all([
    runGh(["pr", "diff", prUrl]),
    runGh([
      "pr",
      "view",
      prUrl,
      "--json",
      "title,body,files,additions,deletions,baseRefName,headRefName",
    ]),
  ]);

  if (diffResult.exitCode !== 0) {
    throw new Error(`gh pr diff failed for ${prUrl}: ${diffResult.stderr.trim()}`);
  }
  if (viewResult.exitCode !== 0) {
    throw new Error(`gh pr view failed for ${prUrl}: ${viewResult.stderr.trim()}`);
  }

  let metadata: PrMetadata;
  try {
    metadata = JSON.parse(viewResult.stdout) as PrMetadata;
  } catch {
    throw new Error(`gh pr view returned unparseable JSON for ${prUrl}`);
  }
  return { diff: diffResult.stdout, metadata };
}
