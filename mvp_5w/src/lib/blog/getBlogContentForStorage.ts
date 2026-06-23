import { parseBlogContent } from "@/lib/blog/parseBlogContent";
import type { BlogEnhancementState } from "@/lib/blog/types";
import { stripAllEmojis } from "@/lib/magazine/emojiRules";

export interface BlogChannelSource {
  title: string;
  body: string;
}

type BlogEnhancementLike = Pick<BlogEnhancementState, "blogParsed"> | null | undefined;

function resolveParsed(
  outputContent: string,
  blogEnhancement?: BlogEnhancementLike
) {
  if (blogEnhancement?.blogParsed?.bodyText?.trim()) {
    return blogEnhancement.blogParsed;
  }
  if (outputContent.trim()) {
    return parseBlogContent(outputContent);
  }
  return null;
}

/** Supabase 저장용: 채택 제목 + 본문만 반환 */
export function getBlogContentForStorage(
  outputContent: string,
  blogEnhancement?: BlogEnhancementLike
): string {
  const parsed = resolveParsed(outputContent, blogEnhancement);
  if (!parsed) {
    return outputContent.trim();
  }

  const title = parsed.mainTitle.trim();
  const body = parsed.bodyText.trim();

  if (title && body) {
    return `${title}\n\n${body}`;
  }
  if (body) {
    return body;
  }
  if (title) {
    return title;
  }
  return outputContent.trim();
}

/** 파생 채널 생성 source: 제목 + 본문 (메타 섹션 제외) */
export function getBlogSourceForChannels(
  blogEnhancement?: BlogEnhancementLike,
  blogOutput?: string
): BlogChannelSource | null {
  const parsed = resolveParsed(blogOutput ?? "", blogEnhancement);
  if (!parsed?.bodyText?.trim()) {
    return null;
  }

  return {
    title: parsed.mainTitle.trim(),
    body: parsed.bodyText.trim(),
  };
}

/** 매거진·소셜 채널 생성 source: clean content + 이모티콘 제거 */
export function getBlogSourceForMagazine(
  blogEnhancement?: BlogEnhancementLike,
  blogOutput?: string
): BlogChannelSource | null {
  const source = getBlogSourceForChannels(blogEnhancement, blogOutput);
  if (!source) {
    return null;
  }

  return {
    title: stripAllEmojis(source.title),
    body: stripAllEmojis(source.body),
  };
}

/** Instagram/Facebook/LinkedIn primary source (getBlogSourceForMagazine와 동일) */
export const getBlogSourceForSocial = getBlogSourceForMagazine;
