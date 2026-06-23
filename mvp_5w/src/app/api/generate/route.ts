import { NextResponse } from "next/server";

import { generateWithAnthropic } from "@/lib/llm/anthropic";
import { getMaxTokensForChannel } from "@/lib/llm/models";
import { MAGAZINE_LENGTH_TARGET } from "@/lib/magazine/validateMagazineRaw";
import { logMagazinePipeline } from "@/lib/magazine/magazineDebug";
import { MVP_CHANNELS } from "@/lib/prompts/constants";
import type { Channel } from "@/lib/types";

interface GenerateRequestBody {
  prompt?: string;
  channel?: string;
}

function isChannel(value: string): value is Channel {
  return (MVP_CHANNELS as string[]).includes(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateRequestBody;
    const { prompt, channel } = body;

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "프롬프트가 비어 있습니다." },
        { status: 400 }
      );
    }

    if (!channel || !isChannel(channel)) {
      return NextResponse.json(
        { error: "유효한 채널이 필요합니다." },
        { status: 400 }
      );
    }

    if (process.env.LLM_PROVIDER !== "anthropic") {
      return NextResponse.json(
        {
          error:
            "LLM_PROVIDER가 anthropic으로 설정되지 않았습니다. .env.local을 확인하세요.",
        },
        { status: 500 }
      );
    }

    const maxTokens = getMaxTokensForChannel(channel);
    const result = await generateWithAnthropic(prompt, channel);

    if (channel === "Magazine") {
      logMagazinePipeline({
        stage: "api-generate",
        channel,
        promptLength: prompt.length,
        hasLengthTargetInPrompt: prompt.includes(MAGAZINE_LENGTH_TARGET),
        maxTokens,
        stopReason: result.stopReason,
        llmOutputLength: result.content.length,
      });
    }

    return NextResponse.json({
      content: result.content,
      model: result.model,
      channel,
      provider: "anthropic",
      meta:
        channel === "Magazine"
          ? {
              stopReason: result.stopReason,
              maxTokens,
              outputLength: result.content.length,
            }
          : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "콘텐츠 생성 중 알 수 없는 오류가 발생했습니다.";

    const status = message.includes("ANTHROPIC_API_KEY") ? 503 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
