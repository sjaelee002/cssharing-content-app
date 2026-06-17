import type { Channel } from "@/lib/types";

export type LlmTask = "draft" | "outline" | "review";

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

export function getMaxTokensForChannel(channel: Channel): number {
  if (channel === "Blog") {
    return 5000;
  }
  if (channel === "Magazine") {
    return 3000;
  }
  if (channel === "Instagram") {
    return 1200;
  }
  return 2000;
}
