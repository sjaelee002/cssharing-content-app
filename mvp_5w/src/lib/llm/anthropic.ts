import Anthropic from "@anthropic-ai/sdk";

import {
  getMaxTokensForChannel,
  getModelForCardnewsTask,
  getModelForTask,
} from "@/lib/llm/models";
import type { Channel } from "@/lib/types";

function getApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY가 설정되지 않았습니다. mvp_5w/.env.local 파일에 API 키를 추가하세요."
    );
  }
  return key;
}

export async function generateWithAnthropic(
  prompt: string,
  channel: Channel
): Promise<{ content: string; model: string; stopReason: string | null }> {
  return generateWithAnthropicRaw(prompt, {
    maxTokens: getMaxTokensForChannel(channel),
  });
}

export async function generateWithAnthropicRaw(
  prompt: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
    task?: "draft" | "outline" | "review";
    model?: string;
  }
): Promise<{ content: string; model: string; stopReason: string | null }> {
  const model = options?.model ?? getModelForTask(options?.task ?? "draft");
  const client = new Anthropic({ apiKey: getApiKey() });
  const maxTokens = options?.maxTokens ?? 4000;

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature: options?.temperature ?? 0.7,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("모델이 텍스트 응답을 반환하지 않았습니다.");
  }

  return {
    content: textBlock.text,
    model,
    stopReason: response.stop_reason ?? null,
  };
}

/** 카드뉴스 designer mode — Opus adaptive thinking 지원 시 적용 */
export async function generateWithAnthropicCardnews(
  prompt: string,
  options?: { maxTokens?: number }
): Promise<{ content: string; model: string }> {
  const model = getModelForCardnewsTask();
  const client = new Anthropic({ apiKey: getApiKey() });

  const thinkingMode = process.env.ANTHROPIC_CARDNEWS_THINKING?.trim();
  const effort = process.env.ANTHROPIC_CARDNEWS_EFFORT?.trim();

  const baseParams = {
    model,
    max_tokens: options?.maxTokens ?? 16000,
    messages: [{ role: "user" as const, content: prompt }],
  };

  const extendedParams = {
    ...baseParams,
    ...(thinkingMode === "adaptive"
      ? { thinking: { type: "adaptive" as const } }
      : {}),
    ...(effort ? { effort } : {}),
  };

  console.log(
    `[instagram-cardnews] model=${model} thinking=${thinkingMode || "off"} effort=${effort || "default"}`
  );

  let response: Awaited<ReturnType<typeof client.messages.create>>;
  try {
    response = await client.messages.create(
      extendedParams as unknown as Parameters<
        typeof client.messages.create
      >[0]
    );
  } catch (extendedError) {
    if (thinkingMode || effort) {
      console.log(
        "[instagram-cardnews] extended params rejected, falling back to base request"
      );
      response = await client.messages.create(baseParams);
    } else {
      throw extendedError;
    }
  }

  if (!("content" in response)) {
    throw new Error("모델이 스트리밍 응답을 반환했습니다.");
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("모델이 텍스트 응답을 반환하지 않았습니다.");
  }

  return { content: textBlock.text, model };
}
