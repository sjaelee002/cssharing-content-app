import Anthropic from "@anthropic-ai/sdk";

import { getMaxTokensForChannel, getModelForTask } from "@/lib/llm/models";
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
): Promise<{ content: string; model: string }> {
  const model = getModelForTask("draft");
  const client = new Anthropic({ apiKey: getApiKey() });

  const response = await client.messages.create({
    model,
    max_tokens: getMaxTokensForChannel(channel),
    temperature: 0.7,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("모델이 텍스트 응답을 반환하지 않았습니다.");
  }

  return { content: textBlock.text, model };
}
