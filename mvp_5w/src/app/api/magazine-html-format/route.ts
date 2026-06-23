import { NextResponse } from "next/server";

import type { BlogImageSuggestion } from "@/lib/blog/types";
import { formatMagazineHtml } from "@/lib/magazine/formatMagazineHtml";
import { logMagazinePipeline } from "@/lib/magazine/magazineDebug";
import { generateWithAnthropicRaw } from "@/lib/llm/anthropic";
import { getMagazineHtmlMaxTokens, getModelForBlogTask } from "@/lib/llm/models";
import {
  buildMagazineHtmlFormatPrompt,
  stripHtmlFences,
} from "@/lib/prompts/magazine-html-format-prompt";

interface MagazineHtmlFormatBody {
  rawText?: string;
  title?: string;
  visualSuggestions?: BlogImageSuggestion[];
}

export async function POST(request: Request) {
  try {
    if (process.env.LLM_PROVIDER !== "anthropic") {
      return NextResponse.json(
        {
          error:
            "LLM_PROVIDER가 anthropic으로 설정되지 않았습니다. .env.local을 확인하세요.",
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as MagazineHtmlFormatBody;
    const { rawText, title, visualSuggestions } = body;

    if (!rawText?.trim()) {
      return NextResponse.json(
        { error: "원문(rawText)이 비어 있습니다." },
        { status: 400 }
      );
    }

    const prompt = buildMagazineHtmlFormatPrompt(rawText, title || "");
    const model = getModelForBlogTask("html");
    const maxTokens = getMagazineHtmlMaxTokens();

    const result = await generateWithAnthropicRaw(prompt, {
      model,
      maxTokens,
      temperature: 0.3,
    });

    const rawHtml = stripHtmlFences(result.content);
    const html = formatMagazineHtml(rawHtml, visualSuggestions || []);

    logMagazinePipeline({
      stage: "api-html-format",
      maxTokens,
      stopReason: result.stopReason,
      htmlInputLength: rawText.length,
      htmlOutputLength: html.length,
    });

    return NextResponse.json({
      html,
      model: result.model,
      provider: "anthropic",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "HTML 포맷 변환 중 알 수 없는 오류가 발생했습니다.";

    const status = message.includes("ANTHROPIC_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
