const SOURCE_NUMBER_PATTERNS: RegExp[] = [
  /\d{1,3}(?:,\d{3})+(?:\.\d+)?%?/g,
  /\d+(?:\.\d+)?%/g,
  /\+\d+(?:\.\d+)?%/g,
  /\d+건/g,
  /\d+명/g,
  /\d+배/g,
  /\d{4}년/g,
  /\d+개월/g,
  /\d+\s*~\s*\d+/g,
  /\d+\s*→\s*\d+/g,
  /\d+p/g,
];

/**
 * 블로그 원문·사용자 초안에서 실제 제공된 숫자/퍼센트/건수/기간 표현을 추출한다.
 */
export function extractSourceNumbers(text: string): string[] {
  if (!text?.trim()) {
    return [];
  }

  const withoutMeta = text
    .replace(/\[자기점검\][\s\S]*/i, "")
    .replace(/공백\s*제외\s*본문\s*약?\s*[\d,]+자/gi, "");

  const found = new Set<string>();

  for (const pattern of SOURCE_NUMBER_PATTERNS) {
    for (const match of withoutMeta.matchAll(pattern)) {
      const value = match[0].trim();
      if (value.length > 0) {
        found.add(value);
      }
    }
  }

  return [...found].sort((a, b) => a.localeCompare(b, "ko"));
}

/**
 * 시계열 차트에 쓸 만한 데이터가 있는지 판단한다.
 */
export function hasTimeSeriesData(
  sourceNumbers: string[],
  text: string
): boolean {
  const combined = `${text} ${sourceNumbers.join(" ")}`;
  const hasTimeLabels =
    /월별|분기별|시계열|추이\s*그래프|트렌드|\d{1,2}월|Q[1-4]|주차|연도별|일별/i.test(
      combined
    );
  const numericPoints = sourceNumbers.filter(
    (n) => /\d/.test(n) && !/^\d{4}년$/.test(n)
  );

  return hasTimeLabels && numericPoints.length >= 2;
}

const MARKUP_NUMBER_PATTERN =
  /\d{1,3}(?:,\d{3})+(?:\.\d+)?%?|\d+(?:\.\d+)?%|\d+건|\d+명/g;

/**
 * 시각화 core에 sourceNumbers에 없는 구체 수치가 포함됐는지 검사한다.
 */
export function containsUnauthorizedNumbers(
  markup: string,
  sourceNumbers: string[]
): boolean {
  const foundInMarkup = new Set<string>();
  for (const match of markup.matchAll(MARKUP_NUMBER_PATTERN)) {
    foundInMarkup.add(match[0]);
  }

  if (foundInMarkup.size === 0) {
    return false;
  }

  if (sourceNumbers.length === 0) {
    return true;
  }

  const sourceBlob = sourceNumbers.join(" ");
  for (const num of foundInMarkup) {
    const normalized = num.replace(/,/g, "");
    const inSource = sourceNumbers.some(
      (s) => s.includes(num) || s.replace(/,/g, "").includes(normalized)
    );
    if (!inSource && !sourceBlob.includes(num)) {
      return true;
    }
  }

  return false;
}
