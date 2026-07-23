import type { Verdict } from "./types";

export const START_REACTION = "eyes";

/**
 * eyes -> terminal emoji, per the existing convention in
 * ~/.claude/skills/review/SKILL.md:11-16 — not invented here.
 */
export function terminalReaction(verdict: Verdict): "heavy_check_mark" | "speech_balloon" {
  return verdict === "changes_requested" ? "speech_balloon" : "heavy_check_mark";
}

export function replyMessage(verdict: Verdict, mentionedUserId: string): string {
  const mention = `<@${mentionedUserId}>`;
  switch (verdict) {
    case "approved":
      return `${mention} Revisado e aprovado ✔️`;
    case "approved_with_comment":
      return `${mention} Aprovado ✔️ Deixei um comentário no PR, mas é só sugestão — não bloqueia o merge.`;
    case "changes_requested":
      return `${mention} Revisão feita — achados no PR. *Me marca aqui de novo quando ajustar* 🤝`;
  }
}

/**
 * Most Slack MCP servers have no remove-reaction tool today — the watcher
 * never claims to have removed `eyes`, it just leaves it alongside the
 * terminal reaction. This is a known, documented limitation (see README),
 * not something surfaced inline in every reply.
 */
