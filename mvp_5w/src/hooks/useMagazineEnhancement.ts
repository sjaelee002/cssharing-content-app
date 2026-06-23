"use client";

import { useCallback } from "react";

import type { BlogParsed } from "@/lib/blog/types";
import { logMagazinePipeline } from "@/lib/magazine/magazineDebug";
import { parseMagazineContent } from "@/lib/magazine/parseMagazineContent";
import { sanitizeMagazineRaw } from "@/lib/magazine/sanitizeMagazineRaw";
import { validateMagazineRaw } from "@/lib/magazine/validateMagazineRaw";
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
  visualSuggestions: Array<{
    index: number;
    position: string;
    imageType: string;
    description: string;
    captionKeywords: string;
  }>
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

function buildRawLengthWarning(raw: string): string {
  const validation = validateMagazineRaw(raw);
  if (!validation.shouldWarn && validation.missingSections.length === 0) {
    return "";
  }

  const parts: string[] = [];
  if (validation.isTooShort) {
    parts.push(
      `원고가 기준 길이(공백 포함 3,200~3,800자)보다 짧습니다. 현재 ${validation.charCountWithSpaces}자.`
    );
  } else if (validation.shouldWarn) {
    parts.push(
      `원고가 권장 길이보다 다소 짧습니다. 현재 ${validation.charCountWithSpaces}자.`
    );
  }
  if (validation.missingSections.length > 0) {
    parts.push(
      `누락된 섹션: ${validation.missingSections.join(", ")}. 재생성을 권장합니다.`
    );
  }
  return parts.join(" ");
}

export function useMagazineEnhancement({
  dispatch,
  addLog,
  onToast,
}: UseMagazineEnhancementOptions) {
  const processMagazineContent = useCallback(
    async (
      rawContent: string,
      blogParsed?: BlogParsed | null
    ) => {
      const parsed = parseMagazineContent(rawContent);
      const sanitizeBeforeLength = parsed.bodyText.length;
      const magazineContentRaw = sanitizeMagazineRaw(parsed);
      const validation = validateMagazineRaw(magazineContentRaw);
      const rawLengthWarning = buildRawLengthWarning(magazineContentRaw);
      const visualSuggestions = blogParsed?.imageSuggestions ?? [];

      logMagazinePipeline({
        stage: "client-sanitize",
        llmOutputLength: rawContent.length,
        sanitizeBeforeLength,
        sanitizeAfterLength: magazineContentRaw.length,
        validation: {
          charCountWithSpaces: validation.charCountWithSpaces,
          isTooShort: validation.isTooShort,
          missingSections: validation.missingSections,
        },
      });

      dispatch({
        type: "SET_MAGAZINE_ENHANCEMENT",
        payload: {
          magazineContentRaw,
          magazineParsed: parsed,
          magazineContentHtml: "",
          htmlFormatting: true,
          rawLengthWarning,
        },
      });

      if (rawLengthWarning) {
        addLog(`매거진 원문 길이 경고: ${rawLengthWarning}`, "warn");
      } else {
        addLog("매거진 원문 정제 완료, HTML 포맷 변환 시작...", "info");
      }

      try {
        const html = await callMagazineHtmlFormatApi(
          magazineContentRaw,
          parsed.title,
          visualSuggestions
        );

        logMagazinePipeline({
          stage: "client-html",
          htmlInputLength: magazineContentRaw.length,
          htmlOutputLength: html.length,
        });

        dispatch({
          type: "SET_MAGAZINE_ENHANCEMENT",
          payload: {
            magazineContentHtml: html,
            htmlFormatting: false,
            rawLengthWarning,
          },
        });

        addLog("매거진 HTML 미리보기 생성 완료", "success");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "HTML 포맷 변환 실패";
        dispatch({
          type: "SET_MAGAZINE_ENHANCEMENT",
          payload: { htmlFormatting: false, rawLengthWarning },
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
