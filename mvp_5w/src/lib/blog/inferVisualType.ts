import {
  hasTimeSeriesData,
} from "@/lib/blog/extractSourceNumbers";
import type { BlogImageSuggestion, VisualType } from "@/lib/blog/types";

export interface InferVisualTypeOptions {
  sourceNumbers?: string[];
  bodyText?: string;
}

const NUMERIC_CHART_PATTERN =
  /그래프|추이|증가|변화|차트|line|라인|pie|파이|수치\s*그래프|numerical/i;

function pickNonNumericFallback(text: string): VisualType {
  if (/순환|반복|악순환|cycle|루프/i.test(text)) {
    return "cycle_diagram";
  }
  if (/흐름|절차|구조|flow|프로세스|단계/i.test(text)) {
    return "flowchart";
  }
  if (/체크|기준|checklist|점검/i.test(text)) {
    return "checklist";
  }
  if (/전후|비교|before|after|대비/i.test(text)) {
    return "comparison";
  }
  return "checklist";
}

export function inferVisualType(
  suggestion: BlogImageSuggestion,
  options: InferVisualTypeOptions = {}
): VisualType {
  const text = `${suggestion.imageType} ${suggestion.description} ${suggestion.captionKeywords}`;
  const sourceNumbers = options.sourceNumbers ?? [];
  const bodyText = options.bodyText ?? "";
  const canUseLineChart =
    sourceNumbers.length > 0 &&
    hasTimeSeriesData(sourceNumbers, `${bodyText} ${text}`);

  if (NUMERIC_CHART_PATTERN.test(text)) {
    if (canUseLineChart) {
      return "line_chart";
    }
    return pickNonNumericFallback(text);
  }

  if (/순환|반복|악순환|cycle|루프/i.test(text)) {
    return "cycle_diagram";
  }
  if (/흐름|절차|구조|flow|프로세스|단계/i.test(text)) {
    return "flowchart";
  }
  if (/체크|기준|checklist|점검/i.test(text)) {
    return "checklist";
  }
  if (/전후|비교|before|after|대비/i.test(text)) {
    return "comparison";
  }
  if (/수치|KPI|결과|metric|지표|퍼센트|%/i.test(text)) {
    if (sourceNumbers.length > 0) {
      return "metric_cards";
    }
    return "comparison";
  }

  return "checklist";
}

export const VISUAL_TYPE_LABELS: Record<VisualType, string> = {
  line_chart: "라인 차트",
  cycle_diagram: "순환 다이어그램",
  flowchart: "플로우차트",
  checklist: "체크리스트",
  comparison: "전후 비교",
  metric_cards: "핵심 수치 카드",
};

export function getVisualTypeConstraints(
  visualType: VisualType,
  sourceNumbers: string[] = []
): string {
  const noNumbers = sourceNumbers.length === 0;

  const common = `- 핵심 메시지 1개만
- 제목 최대 2줄, subtitle 최대 1줄 (프레임이 렌더링 — core에는 넣지 말 것)
${noNumbers ? "- 구체 숫자·퍼센트·건수 사용 금지 (정성 라벨만)" : `- 핵심 수치는 sourceNumbers에 있는 값만 (최대 2~3개)`}
- 본문성 설명 최소화
- 텍스트 박스 최대 5개
- 최소 폰트 크기 24px 권장 (18px 미만 금지)
- 작은 축 라벨/범례/주석/캡션 동시 사용 금지
- PPT 도형 나열 금지 — 인포그래픽처럼 여백·위계·white card 감각 유지`;

  const perType: Record<VisualType, string> = {
    line_chart: `- 실제 시계열 데이터가 있을 때만 사용
- y축 숫자 3개 이하, 월별 전체 라벨 금지
- 핵심 peak 또는 변화 방향만 강조`,
    cycle_diagram: `- 노드 최대 5개, 각 노드 라벨 최대 12자
- 중앙 메시지 짧게
- 화살표·노드 간 간격 넉넉히`,
    flowchart: `- 단계 최대 4개, 한 단계당 문구 최대 14자
- 화살표 단순화, 긴 설명 금지`,
    checklist: `- 체크 항목 최대 4개, 각 항목 최대 18자
- 큰 체크 아이콘 + 넉넉한 줄간격`,
    comparison: `- 좌우 비교 구조 명확히
- 각 열 bullet 최대 3개
- 색상 대비 명확히${noNumbers ? ", 숫자 없이 정성 비교만" : ", 숫자는 sourceNumbers에 있을 때만"}`,
    metric_cards: noNumbers
      ? `- 카드 최대 3개, 숫자 없이 짧은 라벨만 (4~10자)`
      : `- 카드 최대 3개, sourceNumbers 수치만 사용`,
  };

  return `${common}\n${perType[visualType]}`;
}
