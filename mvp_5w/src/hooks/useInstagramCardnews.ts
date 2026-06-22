"use client";

import { useCallback } from "react";

import type { InstagramCardnewsState } from "@/lib/instagram/types";
import type { BlogEnhancementState } from "@/lib/blog/types";
import type { LogType, Tone } from "@/lib/types";

const USER_ERROR =
  "인스타 카드뉴스 생성에 실패했습니다. 다시 시도해주세요.";

interface UseInstagramCardnewsOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: (action: any) => void;
  addLog: (msg: string, type?: LogType) => void;
  onToast?: (msg: string) => void;
}

export function useInstagramCardnews({
  dispatch,
  addLog,
  onToast,
}: UseInstagramCardnewsOptions) {
  const generateCardnews = useCallback(
    async (
      blogEnhancement: BlogEnhancementState,
      instagramDraftOutput: string | undefined,
      tone: Tone
    ) => {
      const parsed = blogEnhancement.blogParsed;
      const raw = blogEnhancement.blogContentRaw;

      if (!raw?.trim() || !parsed?.bodyText?.trim()) {
        onToast?.("⚠️ 먼저 네이버 블로그 원문을 생성해주세요.");
        return;
      }

      dispatch({
        type: "SET_INSTAGRAM_CARDNEWS",
        payload: { generating: true, error: null },
      });

      addLog("인스타 카드뉴스 + 캡션 생성 중...", "info");

      try {
        const response = await fetch("/api/instagram-cardnews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blogContentRaw: raw,
            blogParsed: parsed,
            visualSuggestions: parsed.imageSuggestions,
            instagramDraftOutput,
            tone,
            topic: parsed.mainTitle,
          }),
        });

        const data = (await response.json()) as {
          ok?: boolean;
          storyboard?: string;
          cardnewsHtml?: string;
          caption?: string;
          hashtags?: string;
          selfReview?: string;
          model?: string;
          error?: string;
        };

        if (!response.ok || !data.ok || !data.cardnewsHtml) {
          throw new Error(data.error || USER_ERROR);
        }

        dispatch({
          type: "SET_INSTAGRAM_CARDNEWS",
          payload: {
            storyboard: data.storyboard ?? "",
            cardnewsHtml: data.cardnewsHtml,
            caption: data.caption ?? "",
            hashtags: data.hashtags ?? "",
            selfReview: data.selfReview ?? "",
            model: data.model ?? null,
            generating: false,
            error: null,
          } satisfies Partial<InstagramCardnewsState>,
        });

        addLog("인스타 카드뉴스 생성 완료", "success");
        onToast?.("인스타 카드뉴스가 생성되었습니다.");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : USER_ERROR;
        dispatch({
          type: "SET_INSTAGRAM_CARDNEWS",
          payload: { generating: false, error: message },
        });
        addLog(`인스타 카드뉴스 생성 실패: ${message}`, "error");
        onToast?.(message);
      }
    },
    [addLog, dispatch, onToast]
  );

  return { generateCardnews };
}
