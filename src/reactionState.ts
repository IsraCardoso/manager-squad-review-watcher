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
      return `${mention} Aprovado ✔️`;
    case "approved_with_comment":
      return `${mention}, adicionei um comentário caso ache pertinente! De toda forma, já está aprovado✔️`;
    case "changes_requested":
      return `${mention}, analisando seu PR encontramos alguns problemas que necessitam correção ou esclarecimento! Após resolver essas questões por favor me marque aqui de novo para que eu possa revisar novamente 🤝`;
  }
}

/**
 * Most Slack MCP servers have no remove-reaction tool today — the watcher
 * never claims to have removed `eyes`, it just leaves it alongside the
 * terminal reaction. This is a known, documented limitation (see README),
 * not something surfaced inline in every reply.
 */
