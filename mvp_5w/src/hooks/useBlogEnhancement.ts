"use client";

import { useCallback } from "react";

import { parseBlogContent } from "@/lib/blog/parseBlogContent";
import type { BlogEnhancementState } from "@/lib/blog/types";
import type { LogType } from "@/lib/types";

interface UseBlogEnhancementOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: (action: any) => void;
  addLog: (msg: string, type?: LogType) => void;
  onToast?: (msg: string) => void;
}

async function callBlogHtmlFormatApi(
  bodyText: string,
  mainTitle: string,
  imageSuggestions: NonNullable<BlogEnhancementState["blogParsed"]>["imageSuggestions"]
) {
  const response = await fetch("/api/blog-html-format", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bodyText, mainTitle, imageSuggestions }),
  });

  const data = (await response.json()) as { html?: string; error?: string };
  if (!response.ok || !data.html) {
    throw new Error(data.error || "HTML 포맷 변환에 실패했습니다.");
  }
  return data.html;
}

export function useBlogEnhancement({
  dispatch,
  addLog,
  onToast,
}: UseBlogEnhancementOptions) {
  const processBlogContent = useCallback(
    async (rawContent: string) => {
      const parsed = parseBlogContent(rawContent);

      dispatch({
        type: "SET_BLOG_ENHANCEMENT",
        payload: {
          blogContentRaw: rawContent,
          blogParsed: parsed,
          blogContentHtml: "",
          htmlFormatting: true,
        },
      });

      addLog("블로그 원문 파싱 완료, HTML 포맷 변환 시작...", "info");

      try {
        const html = await callBlogHtmlFormatApi(
          parsed.bodyText,
          parsed.mainTitle,
          parsed.imageSuggestions
        );

        dispatch({
          type: "SET_BLOG_ENHANCEMENT",
          payload: {
            blogContentHtml: html,
            htmlFormatting: false,
          },
        });

        addLog("블로그 HTML 미리보기 생성 완료", "success");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "HTML 포맷 변환 실패";
        dispatch({
          type: "SET_BLOG_ENHANCEMENT",
          payload: { htmlFormatting: false },
        });
        addLog(`블로그 HTML 변환 오류: ${message}`, "error");
        onToast?.(`❌ HTML 변환 실패: ${message}`);
      }
    },
    [addLog, dispatch, onToast]
  );

  return {
    processBlogContent,
  };
}
