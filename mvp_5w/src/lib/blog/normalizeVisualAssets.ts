import { hasTimeSeriesData } from "@/lib/blog/extractSourceNumbers";
import { inferVisualType } from "@/lib/blog/inferVisualType";
import type {
  BlogImageSuggestion,
  GeneratedVisual,
  VisualOutputMode,
  VisualType,
} from "@/lib/blog/types";

type NarrativeRole = "intro" | "problem_structure" | "solution" | "cta";

interface ScoredSuggestion {
  suggestion: BlogImageSuggestion;
  role: NarrativeRole;
  visualType: VisualType;
  score: number;
}

function inferNarrativeRole(suggestion: BlogImageSuggestion): NarrativeRole {
  const text = `${suggestion.position} ${suggestion.imageType} ${suggestion.description} ${suggestion.captionKeywords}`;

  if (/CTA|배너|상담\s*신청|다운로드\s*배너/i.test(text)) {
    return "cta";
  }
  if (/도입|현황|급증|증가|변화|경고|문의량|추이|그래프/i.test(text)) {
    return "intro";
  }
  if (/번아웃|악순환|병목|원인|순환|반복|구조적/i.test(text)) {
    return "problem_structure";
  }
  if (/해결|운영|체크|전후|비교|개선|성과|KPI|흐름|절차/i.test(text)) {
    return "solution";
  }

  if (/^도입|서론|opening/i.test(suggestion.position)) {
    return "intro";
  }
  if (/본문|중반|문제/i.test(suggestion.position)) {
    return "problem_structure";
  }

  return "solution";
}

function scoreSuggestion(
  suggestion: BlogImageSuggestion,
  role: NarrativeRole,
  visualType: VisualType,
  sourceNumbers: string[],
  bodyText: string
): number {
  const text = `${suggestion.position} ${suggestion.imageType} ${suggestion.description}`;
  let score = 0;

  if (role === "cta") {
    score -= 80;
  }
  if (role === "intro") {
    score += 40;
  }
  if (role === "problem_structure") {
    score += 35;
  }
  if (role === "solution") {
    score += 30;
  }

  if (/핵심|메인|대표|중요/i.test(text)) {
    score += 15;
  }
  if (/도입|첫|서론/i.test(suggestion.position)) {
    score += 10;
  }

  const canUseLineChart =
    sourceNumbers.length > 0 &&
    hasTimeSeriesData(sourceNumbers, `${bodyText} ${text}`);

  if (role === "intro" && visualType === "line_chart" && canUseLineChart) {
    score += 12;
  } else if (visualType === "line_chart" && !canUseLineChart) {
    score -= 50;
  }

  if (role === "intro" && visualType === "metric_cards" && sourceNumbers.length > 0) {
    score += 8;
  }
  if (role === "problem_structure" && visualType === "cycle_diagram") {
    score += 12;
  }
  if (role === "problem_structure" && visualType === "flowchart") {
    score += 8;
  }
  if (role === "solution" && ["checklist", "comparison", "flowchart"].includes(visualType)) {
    score += 10;
  }

  score += Math.max(0, 12 - suggestion.index);

  return score;
}

function pickBestCandidate(
  candidates: ScoredSuggestion[],
  usedTypes: Set<VisualType>,
  picked: BlogImageSuggestion[]
): ScoredSuggestion | null {
  const available = candidates
    .filter((c) => !picked.includes(c.suggestion))
    .sort((a, b) => b.score - a.score);

  if (!available.length) {
    return null;
  }

  const diverse = available.find((c) => !usedTypes.has(c.visualType));
  return diverse ?? available[0];
}

export function selectRecommendedVisuals(
  suggestions: BlogImageSuggestion[],
  maxCount: number,
  sourceNumbers: string[] = [],
  bodyText: string = ""
): BlogImageSuggestion[] {
  if (!suggestions.length) {
    return [];
  }

  const count = Math.min(Math.max(1, maxCount), suggestions.length);
  if (suggestions.length <= count) {
    return [...suggestions];
  }

  const inferOptions = { sourceNumbers, bodyText };

  const scored: ScoredSuggestion[] = suggestions.map((suggestion) => {
    const role = inferNarrativeRole(suggestion);
    const visualType = inferVisualType(suggestion, inferOptions);
    return {
      suggestion,
      role,
      visualType,
      score: scoreSuggestion(
        suggestion,
        role,
        visualType,
        sourceNumbers,
        bodyText
      ),
    };
  });

  const picked: BlogImageSuggestion[] = [];
  const usedTypes = new Set<VisualType>();

  const roleOrder: NarrativeRole[] = ["intro", "problem_structure", "solution"];

  for (const role of roleOrder) {
    if (picked.length >= count) {
      break;
    }
    const roleCandidates = scored.filter((c) => c.role === role);
    const best = pickBestCandidate(roleCandidates, usedTypes, picked);
    if (best) {
      picked.push(best.suggestion);
      usedTypes.add(best.visualType);
    }
  }

  const remaining = scored
    .filter((c) => !picked.includes(c.suggestion) && c.role !== "cta")
    .sort((a, b) => b.score - a.score);

  for (const candidate of remaining) {
    if (picked.length >= count) {
      break;
    }
    if (
      usedTypes.has(candidate.visualType) &&
      remaining.some(
        (r) =>
          !picked.includes(r.suggestion) &&
          !usedTypes.has(r.visualType) &&
          r.score >= candidate.score - 5
      )
    ) {
      continue;
    }
    picked.push(candidate.suggestion);
    usedTypes.add(candidate.visualType);
  }

  if (picked.length < count) {
    const ctaFallback = scored
      .filter((c) => !picked.includes(c.suggestion))
      .sort((a, b) => b.score - a.score);
    for (const candidate of ctaFallback) {
      if (picked.length >= count) {
        break;
      }
      picked.push(candidate.suggestion);
    }
  }

  return picked.slice(0, count);
}

export function createVisualId(
  batchId: string,
  suggestionIndex: number,
  outputMode: VisualOutputMode,
  orderIndex: number
): string {
  return `visual-${batchId}-${suggestionIndex}-${outputMode}-${orderIndex}`;
}

export function getVisualReactKey(
  visual: Pick<GeneratedVisual, "id" | "index">,
  listIndex: number
): string {
  if (visual.id) {
    return visual.id;
  }
  return `visual-fallback-${visual.index ?? listIndex}-${listIndex}`;
}

interface LegacyVisual {
  id?: string;
  index?: number;
  title?: string;
  subtitle?: string;
  visualType?: GeneratedVisual["visualType"];
  outputMode?: VisualOutputMode;
  mode?: VisualOutputMode;
  position?: string;
  imageType?: string;
  description?: string;
  coreMarkup?: string;
  framedMarkup?: string;
  content?: string;
  designBrief?: string;
  recommendedAssets?: string[];
  usedLogoAsset?: string;
  isFallback?: boolean;
  fallbackReason?: string;
  altText?: string;
}

export function normalizeVisualAssets(
  assets: unknown,
  outputModeFallback: VisualOutputMode = "svg"
): GeneratedVisual[] {
  if (!Array.isArray(assets)) {
    return [];
  }

  const seenIds = new Set<string>();

  return assets.flatMap((raw, listIndex) => {
      const item = raw as LegacyVisual;
      const outputMode =
        item.outputMode ?? item.mode ?? outputModeFallback;
      const index =
        typeof item.index === "number" && item.index > 0
          ? item.index
          : listIndex + 1;

      let id = item.id?.trim();
      if (!id) {
        id = `visual-legacy-${index}-${listIndex}-${outputMode}`;
      }
      while (seenIds.has(id)) {
        id = `${id}-dup-${listIndex}`;
      }
      seenIds.add(id);

      const coreMarkup = item.coreMarkup ?? "";
      const framedMarkup = item.framedMarkup ?? item.content ?? "";
      const title = item.title ?? item.description ?? `시각화 자료 ${index}`;
      const description = item.description ?? title;

      if (!framedMarkup && !coreMarkup) {
        return [];
      }

      const visual: GeneratedVisual = {
        id,
        index,
        title,
        subtitle: item.subtitle ?? "",
        visualType: item.visualType ?? inferVisualType({
          index,
          position: item.position ?? "",
          imageType: item.imageType ?? "",
          description,
          captionKeywords: "",
        }),
        outputMode,
        position: item.position ?? "",
        imageType: item.imageType ?? "",
        description,
        coreMarkup,
        framedMarkup: framedMarkup || coreMarkup,
        designBrief: item.designBrief ?? description,
        recommendedAssets: Array.isArray(item.recommendedAssets)
          ? item.recommendedAssets
          : [],
        usedLogoAsset: item.usedLogoAsset,
        isFallback: item.isFallback,
        fallbackReason: item.fallbackReason,
        altText: item.altText ?? title,
      };

      return [visual];
    });
}

export function normalizeBlogEnhancement(
  enhancement: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!enhancement) {
    return undefined;
  }

  const outputMode =
    enhancement.visualOutputMode === "html_css" ? "html_css" : "svg";

  return {
    ...enhancement,
    visualAssets: normalizeVisualAssets(
      enhancement.visualAssets,
      outputMode
    ),
    visualMaxCount:
      typeof enhancement.visualMaxCount === "number"
        ? enhancement.visualMaxCount
        : 3,
    visualOutputMode: outputMode,
  };
}
