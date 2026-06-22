import { NextResponse } from "next/server";

import { generateWithAnthropicRaw } from "@/lib/llm/anthropic";
import { getModelForBlogTask } from "@/lib/llm/models";
import {
  buildBlogHtmlFormatPrompt,
  stripHtmlFences,
} from "@/lib/prompts/blog-html-format-prompt";
import type { BlogImageSuggestion } from "@/lib/blog/types";

interface BlogHtmlFormatBody {
  bodyText?: string;
  mainTitle?: string;
  imageSuggestions?: BlogImageSuggestion[];
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

    const body = (await request.json()) as BlogHtmlFormatBody;
    const { bodyText, mainTitle, imageSuggestions } = body;

    if (!bodyText?.trim()) {
      return NextResponse.json(
        { error: "본문(bodyText)이 비어 있습니다." },
        { status: 400 }
      );
    }

    const prompt = buildBlogHtmlFormatPrompt(
      bodyText,
      mainTitle || "",
      imageSuggestions || []
    );

    const model = getModelForBlogTask("html");
    console.log(
      `[blog-html-format] model=${model} (ANTHROPIC_BLOG_HTML_MODEL || ANTHROPIC_DRAFT_MODEL)`
    );

    const result = await generateWithAnthropicRaw(prompt, {
      model,
      maxTokens: 6000,
      temperature: 0.5,
    });

    const html = stripHtmlFences(result.content);

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
