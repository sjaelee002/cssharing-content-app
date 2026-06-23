import { stripAllEmojis } from "@/lib/magazine/emojiRules";
import type { Channel } from "@/lib/types";

const CHANNEL_LABEL_PATTERNS: Record<
  "Instagram" | "Facebook" | "LinkedIn",
  RegExp[]
> = {
  Instagram: [
    /^#\s*Instagram\s*포스트\s*$/gim,
    /^Instagram\s*포스트\s*$/gim,
  ],
  Facebook: [
    /^#\s*Facebook\s*포스트\s*$/gim,
    /^Facebook\s*포스트\s*$/gim,
  ],
  LinkedIn: [
    /^#\s*LinkedIn\s*포스트\s*$/gim,
    /^LinkedIn\s*포스트\s*$/gim,
  ],
};

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripMarkdownArtifacts(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^---+$/gm, "");
}

function stripChannelLabels(
  channel: "Instagram" | "Facebook" | "LinkedIn",
  text: string
): string {
  let result = text;
  for (const pattern of CHANNEL_LABEL_PATTERNS[channel]) {
    result = result.replace(pattern, "");
  }
  return result;
}

/** UI 표시용: 채널 라벨·Markdown heading·구분선 제거 */
export function formatSocialContentForDisplay(
  channel: "Instagram" | "Facebook" | "LinkedIn",
  content: string
): string {
  let result = stripChannelLabels(channel, content);
  result = stripMarkdownArtifacts(result);
  return normalizeWhitespace(result);
}

/** Supabase 저장용 clean text */
export function getSocialContentForStorage(
  channel: "Instagram" | "Facebook" | "LinkedIn",
  content: string
): string {
  let result = formatSocialContentForDisplay(channel, content);
  result = stripAllEmojis(result);

  result = result.replace(
    /(^|\n)#([\w가-힣]+(?:\s+#[\w가-힣]+)*)\s*$/gm,
    "$1"
  );

  return normalizeWhitespace(result.replace(/\n{3,}/g, "\n\n"));
}

export function parseLinkedInContent(content: string): {
  title: string;
  body: string;
} {
  const display = formatSocialContentForDisplay("LinkedIn", content);
  const lines = display.split("\n").map((line) => line.trim());
  const nonEmpty = lines.filter(Boolean);
  if (!nonEmpty.length) {
    return { title: "", body: "" };
  }
  return {
    title: nonEmpty[0],
    body: nonEmpty.slice(1).join("\n\n"),
  };
}

export function isSocialChannel(
  channel: Channel
): channel is "Instagram" | "Facebook" | "LinkedIn" {
  return (
    channel === "Instagram" ||
    channel === "Facebook" ||
    channel === "LinkedIn"
  );
}
