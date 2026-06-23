import { parseMagazineContent } from "@/lib/magazine/parseMagazineContent";
import { applyMagazineEmojiDefaults } from "@/lib/magazine/applyMagazineEmojiDefaults";
import { retainOnlyAllowedMagazineEmojis } from "@/lib/magazine/emojiRules";
import type { MagazineParsed } from "@/lib/magazine/types";
import type { MagazineEnhancementState } from "@/lib/magazine/types";

const BLOG_META_PATTERNS = [
  /^추천\s*태그\s*$/gim,
  /^대체\s*제목\s*$/gim,
  /^시각화\s*자료\s*삽입\s*제안\s*$/gim,
  /^\[자기점검\]\s*$/gim,
  /^키워드\s*반복\s*횟수\s*:.*$/gim,
  /^글자\s*수\s*:.*$/gim,
];

const VISUAL_PLACEHOLDER_PATTERNS = [
  /\[시각화\s*자료\s*\d+[^\]]*\]/gi,
  /<div[^>]*class="magazine-visual-placeholder"[^>]*>[\s\S]*?<\/div>/gi,
];

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, "");
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^---+$/gm, "")
    .replace(/^\|.+\|$/gm, "")
    .replace(/^\|[-\s:|]+\|$/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/`([^`]+)`/g, "$1");
}

function stripBlogMeta(text: string): string {
  let result = text;
  for (const pattern of BLOG_META_PATTERNS) {
    result = result.replace(pattern, "");
  }

  const selfCheckIdx = result.search(/^\[자기점검\]/gim);
  if (selfCheckIdx !== -1) {
    result = result.slice(0, selfCheckIdx);
  }

  return result;
}

function stripVisualPlaceholders(text: string): string {
  let result = text;
  for (const pattern of VISUAL_PLACEHOLDER_PATTERNS) {
    result = result.replace(pattern, "");
  }
  return result;
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 저장용 순수 원문: HTML/Markdown/시각화 placeholder 제거, 허용 이모티콘 보정·유지 */
export function sanitizeMagazineRaw(parsed: MagazineParsed): string {
  const title = normalizeWhitespace(
    retainOnlyAllowedMagazineEmojis(
      applyMagazineEmojiDefaults(
        stripVisualPlaceholders(
          stripBlogMeta(stripMarkdown(stripHtml(parsed.title)))
        )
      )
    )
  );
  const body = normalizeWhitespace(
    retainOnlyAllowedMagazineEmojis(
      applyMagazineEmojiDefaults(
        stripVisualPlaceholders(
          stripBlogMeta(stripMarkdown(stripHtml(parsed.bodyText)))
        )
      )
    )
  );

  if (title && body) {
    return `${title}\n\n${body}`;
  }
  if (body) {
    return body;
  }
  return title;
}

export function getMagazineContentForStorage(
  magazineEnhancement?: Pick<MagazineEnhancementState, "magazineContentRaw"> | null,
  outputContent?: string
): string {
  if (magazineEnhancement?.magazineContentRaw?.trim()) {
    return magazineEnhancement.magazineContentRaw.trim();
  }
  if (outputContent?.trim()) {
    const parsed = parseMagazineContent(outputContent);
    return sanitizeMagazineRaw(parsed);
  }
  return "";
}
