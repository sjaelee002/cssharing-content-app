"use client";

import { useCallback } from "react";

import { parseBlogContent } from "@/lib/blog/parseBlogContent";
import type { BlogParsed } from "@/lib/blog/types";
import {
  getBlogSourceForMagazine,
  getBlogSourceForSocial,
} from "@/lib/blog/getBlogContentForStorage";
import { logMagazinePipeline } from "@/lib/magazine/magazineDebug";
import { parseMagazineContent } from "@/lib/magazine/parseMagazineContent";
import { sanitizeMagazineRaw } from "@/lib/magazine/sanitizeMagazineRaw";
import {
  MAGAZINE_LENGTH_TARGET,
  MAGAZINE_RETRY_INSTRUCTION,
  shouldRetryMagazineGeneration,
  validateMagazineRaw,
} from "@/lib/magazine/validateMagazineRaw";
import { buildPrompt } from "@/lib/prompts/build-prompt";
import { NAVER_BLOG_GUIDE_MARKER } from "@/lib/prompts/channel-guides/naver-blog-guide";
import { GENERATION_DELAY_MS, MVP_CHANNELS } from "@/lib/prompts/constants";
import { getMaxTokensForChannel } from "@/lib/llm/models";
import { toPromptContext } from "@/lib/local-storage";
import type { Channel, ContentState, LogType } from "@/lib/types";

interface UseGenerationOptions {
  state: ContentState;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: (action: any) => void;
  addLog: (msg: string, type?: LogType) => void;
  onToast?: (msg: string) => void;
  onBlogGenerated?: (content: string) => void;
  onMagazineGenerated?: (
    content: string,
    blogParsed?: BlogParsed | null
  ) => void;
}

interface GenerateChannelOptions {
  blogOutputOverride?: string;
  blogParsedOverride?: BlogParsed | null;
}

interface GenerateApiMeta {
  stopReason?: string | null;
  maxTokens?: number;
  outputLength?: number;
}

async function callGenerateApi(prompt: string, channel: Channel) {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, channel }),
  });

  const data = (await response.json()) as {
    content?: string;
    error?: string;
    meta?: GenerateApiMeta;
  };

  if (!response.ok) {
    throw new Error(data.error || "생성에 실패했습니다.");
  }

  if (!data.content) {
    throw new Error("응답에 콘텐츠가 없습니다.");
  }

  return { content: data.content, meta: data.meta };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveBlogSource(
  channel: Channel,
  state: ContentState,
  options?: GenerateChannelOptions
) {
  const isSocial =
    channel === "Instagram" ||
    channel === "Facebook" ||
    channel === "LinkedIn";

  if (channel !== "Magazine" && !isSocial) {
    return { blogSource: null, sourceType: "draft-fallback" as const };
  }

  const blogEnhancementLike = options?.blogParsedOverride
    ? { blogParsed: options.blogParsedOverride }
    : state.blogEnhancement;

  const blogOutput =
    options?.blogOutputOverride ?? state.outputs.Blog?.content ?? "";

  const getter = isSocial ? getBlogSourceForSocial : getBlogSourceForMagazine;
  const blogSource = getter(blogEnhancementLike, blogOutput);

  return {
    blogSource,
    sourceType: blogSource ? ("blog-clean" as const) : ("draft-fallback" as const),
  };
}

export function useGeneration({
  state,
  dispatch,
  addLog,
  onToast,
  onBlogGenerated,
  onMagazineGenerated,
}: UseGenerationOptions) {
  const hasDraft = state.draft.trim().length > 0;

  const generateChannel = useCallback(
    async (
      channel: Channel,
      extraInstruction?: string,
      options?: GenerateChannelOptions
    ): Promise<string | undefined> => {
      if (!hasDraft) {
        onToast?.("⚠️ 초안을 입력해주세요");
        return;
      }

      const isRefinement = Boolean(extraInstruction?.trim());
      dispatch({ type: "SET_GENERATING", payload: { channel, value: true } });
      addLog(
        `${channel}${isRefinement ? " 고도화" : ""} 생성 중${
          channel === "Blog" ? " (네이버 블로그 지침 적용)" : ""
        }...`,
        "info"
      );

      try {
        const { blogSource, sourceType } = resolveBlogSource(
          channel,
          state,
          options
        );
        const prompt = buildPrompt(
          channel,
          toPromptContext(state),
          extraInstruction,
          blogSource
        );

        if (channel === "Blog") {
          addLog(`Blog 프롬프트에 ${NAVER_BLOG_GUIDE_MARKER} 포함 확인`, "info");
        }
        if (channel === "Magazine") {
          addLog(
            `Magazine source: ${sourceType === "blog-clean" ? "Blog clean content" : "draft fallback"}`,
            sourceType === "blog-clean" ? "info" : "warn"
          );
          logMagazinePipeline({
            stage: "client-prompt",
            channel,
            sourceType,
            sourceLength: blogSource
              ? blogSource.title.length + blogSource.body.length
              : state.draft.length,
            promptLength: prompt.length,
            hasLengthTargetInPrompt: prompt.includes(MAGAZINE_LENGTH_TARGET),
            maxTokens: getMaxTokensForChannel("Magazine"),
          });
        } else if (blogSource && channel !== "Blog") {
          addLog(`${channel} 생성: 네이버 블로그 본문 source 사용`, "info");
        }

        let { content, meta } = await callGenerateApi(prompt, channel);

        if (channel === "Magazine") {
          const firstParsed = parseMagazineContent(content);
          const firstRaw = sanitizeMagazineRaw(firstParsed);
          const firstValidation = validateMagazineRaw(firstRaw);

          logMagazinePipeline({
            stage: "client-post-llm",
            channel,
            stopReason: meta?.stopReason ?? null,
            maxTokens: meta?.maxTokens ?? getMaxTokensForChannel("Magazine"),
            llmOutputLength: content.length,
            sanitizeBeforeLength: firstParsed.bodyText.length,
            sanitizeAfterLength: firstRaw.length,
            validation: {
              charCountWithSpaces: firstValidation.charCountWithSpaces,
              isTooShort: firstValidation.isTooShort,
              missingSections: firstValidation.missingSections,
            },
          });

          if (shouldRetryMagazineGeneration(firstValidation)) {
            addLog(
              "매거진 원고가 기준보다 짧음 — 1회 재생성 시도",
              "warn"
            );
            const retry = await callGenerateApi(
              `${prompt}\n\n${MAGAZINE_RETRY_INSTRUCTION}`,
              channel
            );
            content = retry.content;
            meta = retry.meta;
          }
        }

        dispatch({
          type: "SET_OUTPUT",
          payload: {
            channel,
            content,
            isRefinement,
            instruction: extraInstruction,
          },
        });

        addLog(
          `${channel}${isRefinement ? " 고도화" : ""} 완료`,
          "success"
        );

        if (channel === "Blog" && !content.startsWith("생성 실패")) {
          onBlogGenerated?.(content);
        }

        if (channel === "Magazine" && !content.startsWith("생성 실패")) {
          const blogParsed =
            options?.blogParsedOverride ??
            (options?.blogOutputOverride
              ? parseBlogContent(options.blogOutputOverride)
              : state.blogEnhancement.blogParsed);
          onMagazineGenerated?.(content, blogParsed);
        }

        if (isRefinement) {
          onToast?.("✅ 고도화 완료! 다음 생성 시 자동 반영됩니다.");
        }

        return content;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "생성 실패";
        dispatch({
          type: "SET_OUTPUT_ERROR",
          payload: { channel, message },
        });
        addLog(`${channel} 오류: ${message}`, "error");
        onToast?.(`❌ 생성 실패: ${message}`);
        return undefined;
      } finally {
        dispatch({
          type: "SET_GENERATING",
          payload: { channel, value: false },
        });
      }
    },
    [addLog, dispatch, hasDraft, onBlogGenerated, onMagazineGenerated, onToast, state]
  );

  const generateAll = useCallback(async () => {
    if (!hasDraft) {
      onToast?.("⚠️ 초안을 입력해주세요");
      return;
    }

    let latestBlogOutput: string | undefined;
    let latestBlogParsed: BlogParsed | null = null;

    for (let i = 0; i < MVP_CHANNELS.length; i++) {
      const channel = MVP_CHANNELS[i];
      const content = await generateChannel(channel, undefined, {
        blogOutputOverride: latestBlogOutput,
        blogParsedOverride: latestBlogParsed,
      });

      if (channel === "Blog" && content) {
        latestBlogOutput = content;
        latestBlogParsed = parseBlogContent(content);
      }

      if (i < MVP_CHANNELS.length - 1) {
        await delay(GENERATION_DELAY_MS);
      }
    }
  }, [generateChannel, hasDraft, onToast]);

  const refineActiveChannel = useCallback(
    async (instruction: string) => {
      const channel = state.activeTab;
      const out = state.outputs[channel];
      if (!out?.content || out.content.startsWith("생성 실패")) {
        onToast?.(`⚠️ 먼저 ${channel} 글을 생성해주세요`);
        return;
      }
      if (!instruction.trim()) {
        onToast?.("⚠️ 지시사항을 입력해주세요");
        return;
      }
      await generateChannel(channel, instruction);
      dispatch({ type: "SET_REFINE_PROMPT", payload: "" });
    },
    [dispatch, generateChannel, onToast, state.activeTab, state.outputs]
  );

  return {
    hasDraft,
    generateChannel,
    generateAll,
    refineActiveChannel,
  };
}
