import type { Rule } from "@/lib/types";

export const DEFAULT_GLOBAL_RULES: Rule[] = [
  {
    id: "gr1",
    text: "레버리지·시너지·파라다임 전환·파괴적 등 진부한 단어 사용 금지",
    enabled: true,
  },
  {
    id: "gr2",
    text: "수동태 금지 — 모든 문장은 능동태로 작성",
    enabled: true,
  },
  {
    id: "gr3",
    text: "검증되지 않은 통계 사용 금지",
    enabled: true,
  },
  {
    id: "gr4",
    text: '최상급 표현 금지: "최고","최대","세계 최고"',
    enabled: true,
  },
  {
    id: "gr5",
    text: "평균 문장 길이 20단어 이내",
    enabled: false,
  },
];

export function createDefaultGlobalRules(): Rule[] {
  return DEFAULT_GLOBAL_RULES.map((r) => ({ ...r }));
}
