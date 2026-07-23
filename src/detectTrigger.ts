const PR_URL_RE = /github\.com\/[^/\s]+\/[^/\s]+\/pull\/\d+/;

// Any of these means a reviewer -- human or automated, ours or someone
// else's -- already gave this thread a verdict (approved OR changes
// requested). "Already handled" is the right skip condition, not "already
// approved": a real changes_requested review (speech_balloon) still means
// don't pile on a second, redundant review right behind it.
const ALREADY_REVIEWED_REACTIONS = new Set(["white_check_mark", "heavy_check_mark", "speech_balloon"]);

export interface TriggerConfig {
  managerSquadSubteamId: string;
  slackUserId: string;
}

export interface SlackMessageLike {
  text: string;
  ts: string;
  authorId?: string;
  reactions?: string[];
}

export interface TriggerResult {
  triggered: boolean;
  prUrl?: string;
  matchedTs?: string;
}

function mentionsWatcher(text: string, config: TriggerConfig): boolean {
  const groupMention = `<!subteam^${config.managerSquadSubteamId}>`;
  const userMention = `<@${config.slackUserId}>`;
  return text.includes(groupMention) || text.includes(userMention);
}

function extractPrUrl(text: string): string | undefined {
  const match = text.match(PR_URL_RE);
  return match ? `https://${match[0]}` : undefined;
}

function alreadyReviewed(message: SlackMessageLike): boolean {
  return (message.reactions ?? []).some((r) => ALREADY_REVIEWED_REACTIONS.has(r));
}

/**
 * Root message plus its thread replies (if any) are scanned together: a PR
 * link anywhere in the thread satisfies R2 even when the mention and the
 * link land in different messages.
 *
 * Two guards run before mention/PR matching, both keyed on the ROOT message
 * only (not any reply): threads the watcher's own owner started are never
 * reviewed (Israel, 2026-07-23 -- only review requests from others), and
 * threads already carrying a terminal review reaction (white_check_mark /
 * heavy_check_mark / speech_balloon) are treated as already reviewed by
 * someone -- human or automated -- and skipped, even when the verdict was
 * changes_requested rather than approved (a real PR#1102 case: a colleague's
 * own review landed with speech_balloon before this watcher's tick got to
 * it -- reviewing it again would be redundant, not corrective).
 */
export function detectTrigger(
  rootMessage: SlackMessageLike,
  threadReplies: SlackMessageLike[],
  config: TriggerConfig,
): TriggerResult {
  if (rootMessage.authorId === config.slackUserId) return { triggered: false };
  if (alreadyReviewed(rootMessage)) return { triggered: false };

  const allMessages = [rootMessage, ...threadReplies];
  const mentionMessage = allMessages.find((m) => mentionsWatcher(m.text, config));
  if (!mentionMessage) return { triggered: false };

  for (const message of allMessages) {
    const prUrl = extractPrUrl(message.text);
    if (prUrl) {
      return { triggered: true, prUrl, matchedTs: mentionMessage.ts };
    }
  }

  return { triggered: false };
}
