import type { Channel } from "@/lib/types";

export type LlmTask = "draft" | "outline" | "review";
export type BlogLlmTask = "html" | "visual";
export type CardnewsLlmTask = "cardnews";

export function getModelForCardnewsTask(): string {
  const cardnews = process.env.ANTHROPIC_CARDNEWS_MODEL?.trim();
  if (cardnews) {
    return cardnews;
  }
  const visual = process.env.ANTHROPIC_BLOG_VISUAL_MODEL?.trim();
  if (visual) {
    return visual;
  }
  return getModelForTask("draft");
}

export function getModelForTask(task: LlmTask = "draft"): string {
  const map: Record<LlmTask, string | undefined> = {
    draft: process.env.ANTHROPIC_DRAFT_MODEL,
    outline: process.env.ANTHROPIC_OUTLINE_MODEL,
    review: process.env.ANTHROPIC_REVIEW_MODEL,
  };

  const model = map[task] ?? process.env.ANTHROPIC_DRAFT_MODEL;
  if (!model) {
    throw new Error(
      "ANTHROPIC_DRAFT_MODEL이 설정되지 않았습니다. .env.local 파일을 확인하세요."
    );
  }
  return model;
}

export function getModelForBlogTask(task: BlogLlmTask): string {
  const map: Record<BlogLlmTask, string | undefined> = {
    html: process.env.ANTHROPIC_BLOG_HTML_MODEL,
    visual: process.env.ANTHROPIC_BLOG_VISUAL_MODEL,
  };

  const model = map[task]?.trim();
  if (model) {
    return model;
  }
  return getModelForTask("draft");
}

export function getMaxTokensForChannel(channel: Channel): number {
  if (channel === "Blog") {
    return 5000;
  }
  if (channel === "Magazine") {
    return 6000;
  }
  if (channel === "Instagram") {
    return 1200;
  }
  return 2000;
}

/** Magazine HTML 포맷 변환 max_tokens (기존 6000 → 10000) */
export function getMagazineHtmlMaxTokens(): number {
  return 10000;
}
