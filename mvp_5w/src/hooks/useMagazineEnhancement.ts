"use client";

import { useCallback } from "react";

import type { BlogEnhancementState } from "@/lib/blog/types";
import { parseMagazineContent } from "@/lib/magazine/parseMagazineContent";
import { sanitizeMagazineRaw } from "@/lib/magazine/sanitizeMagazineRaw";
import type { LogType } from "@/lib/types";

interface UseMagazineEnhancementOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: (action: any) => void;
  addLog: (msg: string, type?: LogType) => void;
  onToast?: (msg: string) => void;
}

async function callMagazineHtmlFormatApi(
  rawText: string,
  title: string,
  visualSuggestions: NonNullable<BlogEnhancementState["blogParsed"]>["imageSuggestions"]
) {
  const response = await fetch("/api/magazine-html-format", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawText, title, visualSuggestions }),
  });

  const data = (await response.json()) as { html?: string; error?: string };
  if (!response.ok || !data.html) {
    throw new Error(data.error || "HTML 포맷 변환에 실패했습니다.");
  }
  return data.html;
}

export function useMagazineEnhancement({
  dispatch,
  addLog,
  onToast,
}: UseMagazineEnhancementOptions) {
  const processMagazineContent = useCallback(
    async (
      rawContent: string,
      blogEnhancement?: Pick<BlogEnhancementState, "blogParsed">
    ) => {
      const parsed = parseMagazineContent(rawContent);
      const magazineContentRaw = sanitizeMagazineRaw(parsed);
      const visualSuggestions =
        blogEnhancement?.blogParsed?.imageSuggestions ?? [];

      dispatch({
        type: "SET_MAGAZINE_ENHANCEMENT",
        payload: {
          magazineContentRaw,
          magazineParsed: parsed,
          magazineContentHtml: "",
          htmlFormatting: true,
        },
      });

      addLog("매거진 원문 정제 완료, HTML 포맷 변환 시작...", "info");

      try {
        const html = await callMagazineHtmlFormatApi(
          magazineContentRaw,
          parsed.title,
          visualSuggestions
        );

        dispatch({
          type: "SET_MAGAZINE_ENHANCEMENT",
          payload: {
            magazineContentHtml: html,
            htmlFormatting: false,
          },
        });

        addLog("매거진 HTML 미리보기 생성 완료", "success");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "HTML 포맷 변환 실패";
        dispatch({
          type: "SET_MAGAZINE_ENHANCEMENT",
          payload: { htmlFormatting: false },
        });
        addLog(`매거진 HTML 변환 오류: ${message}`, "error");
        onToast?.(`❌ HTML 변환 실패: ${message}`);
      }
    },
    [addLog, dispatch, onToast]
  );

  return {
    processMagazineContent,
  };
}
