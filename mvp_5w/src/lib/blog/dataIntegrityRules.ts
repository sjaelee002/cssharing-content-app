/**
 * 블로그 원문·시각화에서 가짜 수치 생성을 막기 위한 공통 규칙.
 */
export const NO_FAKE_NUMBERS_RULES = `■ 수치·데이터 무결성 (필수)
- 사용자 초안·입력에 없는 수치, 비율, 증가율, 건수, 기간별 데이터, KPI를 만들지 마세요.
- 실제 데이터가 없으면 정성 표현을 사용하세요.
  - 예: "문의량이 증가할 수 있음"
  - 예: "처리 부담이 커질 수 있음"
  - 예: "상담 인력 피로도가 높아질 수 있음"
- 실제 데이터가 없는데 아래 같은 표현을 생성하지 마세요.
  - 61%, 2,800건, +186%, 38% 상승, 전월 대비 n%, 월별 문의량 수치
- 사례·전후 비교 수치도 초안에 없으면 쓰지 마세요.`;

export const NO_FAKE_NUMBERS_IMAGE_RULES = `■ 시각화 자료 삽입 제안 — 데이터 없을 때
- 실제 데이터가 없으면 line chart, pie chart, numerical graph, 수치 그래프를 제안하지 마세요.
- 데이터가 없을 때 우선 제안할 유형:
  - 순환 구조도(cycle), 플로우차트(flow), 체크리스트(checklist), 전후 비교(comparison, 수치 없이)
  - 핵심 개념 카드(metric cards — 가짜 숫자 없이 라벨만)
- "문의량 급증 곡선", "월별 추이 차트", "퍼센트 파이 차트" 등 수치 시각화는 초안에 근거 데이터가 있을 때만 제안하세요.`;

export function formatSourceNumbersForPrompt(sourceNumbers: string[]): string {
  if (!sourceNumbers.length) {
    return `## 제공된 수치 (sourceNumbers)
(없음 — 구체 숫자·line chart·pie chart·수치 그래프 생성 금지. 정성 라벨·구조도만 사용)`;
  }

  return `## 제공된 수치 (sourceNumbers)
${sourceNumbers.map((n) => `- ${n}`).join("\n")}

- 위 목록에 없는 숫자는 생성하지 마세요.
- 시계열 데이터가 아니면 line chart를 만들지 마세요.`;
}
