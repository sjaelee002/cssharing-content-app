"use client";

import { useCallback } from "react";

import { buildPrompt } from "@/lib/prompts/build-prompt";
import { NAVER_BLOG_GUIDE_MARKER } from "@/lib/prompts/channel-guides/naver-blog-guide";
import { GENERATION_DELAY_MS, MVP_CHANNELS } from "@/lib/prompts/constants";
import { toPromptContext } from "@/lib/local-storage";
import type { Channel, ContentState, LogType } from "@/lib/types";

interface UseGenerationOptions {
  state: ContentState;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: (action: any) => void;
  addLog: (msg: string, type?: LogType) => void;
  onToast?: (msg: string) => void;
  onBlogGenerated?: (content: string) => void;
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
  };

  if (!response.ok) {
    throw new Error(data.error || "생성에 실패했습니다.");
  }

  if (!data.content) {
    throw new Error("응답에 콘텐츠가 없습니다.");
  }

  return data.content;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useGeneration({
  state,
  dispatch,
  addLog,
  onToast,
  onBlogGenerated,
}: UseGenerationOptions) {
  const hasDraft = state.draft.trim().length > 0;

  const generateChannel = useCallback(
    async (channel: Channel, extraInstruction?: string) => {
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
        const prompt = buildPrompt(
          channel,
          toPromptContext(state),
          extraInstruction
        );
        if (channel === "Blog") {
          addLog(`Blog 프롬프트에 ${NAVER_BLOG_GUIDE_MARKER} 포함 확인`, "info");
        }
        const content = await callGenerateApi(prompt, channel);

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

        if (isRefinement) {
          onToast?.("✅ 고도화 완료! 다음 생성 시 자동 반영됩니다.");
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "생성 실패";
        dispatch({
          type: "SET_OUTPUT_ERROR",
          payload: { channel, message },
        });
        addLog(`${channel} 오류: ${message}`, "error");
        onToast?.(`❌ 생성 실패: ${message}`);
      } finally {
        dispatch({
          type: "SET_GENERATING",
          payload: { channel, value: false },
        });
      }
    },
    [addLog, dispatch, hasDraft, onBlogGenerated, onToast, state]
  );

  const generateAll = useCallback(async () => {
    if (!hasDraft) {
      onToast?.("⚠️ 초안을 입력해주세요");
      return;
    }

    for (let i = 0; i < MVP_CHANNELS.length; i++) {
      const channel = MVP_CHANNELS[i];
      await generateChannel(channel);
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
