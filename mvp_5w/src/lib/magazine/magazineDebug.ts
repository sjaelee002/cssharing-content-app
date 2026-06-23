/** Magazine 파이프라인 debug log (민감값 출력 금지) */

export interface MagazinePipelineLog {
  stage: string;
  channel?: string;
  sourceType?: "blog-clean" | "draft-fallback";
  sourceLength?: number;
  promptLength?: number;
  hasLengthTargetInPrompt?: boolean;
  maxTokens?: number;
  stopReason?: string | null;
  llmOutputLength?: number;
  sanitizeBeforeLength?: number;
  sanitizeAfterLength?: number;
  htmlInputLength?: number;
  htmlOutputLength?: number;
  validation?: {
    charCountWithSpaces: number;
    isTooShort: boolean;
    missingSections: string[];
  };
}

export function logMagazinePipeline(data: MagazinePipelineLog): void {
  const isServerStage = data.stage.startsWith("api-");
  if (
    !isServerStage &&
    process.env.MAGAZINE_DEBUG !== "1" &&
    process.env.NODE_ENV === "production"
  ) {
    return;
  }
  console.log("[magazine-pipeline]", JSON.stringify(data));
}
