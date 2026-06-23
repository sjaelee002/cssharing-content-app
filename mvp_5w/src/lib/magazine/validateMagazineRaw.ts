export const MAGAZINE_LENGTH_TARGET =
  "공백 포함 3,200~3,800자, 공백 제외 2,400~2,800자";

export const MAGAZINE_WARN_CHARS_WITH_SPACES = 2800;
export const MAGAZINE_MIN_CHARS_WITH_SPACES = 2400;

export interface MagazineRawValidation {
  charCountWithSpaces: number;
  charCountWithoutSpaces: number;
  hasFaq: boolean;
  hasKeyTakeaways: boolean;
  hasCta: boolean;
  isTooShort: boolean;
  shouldWarn: boolean;
  missingSections: string[];
}

export function validateMagazineRaw(raw: string): MagazineRawValidation {
  const trimmed = raw.trim();
  const charCountWithSpaces = trimmed.length;
  const charCountWithoutSpaces = trimmed.replace(/\s/g, "").length;

  const hasFaq = /자주\s*묻는\s*질문/i.test(trimmed);
  const hasKeyTakeaways = /오늘의\s*핵심/i.test(trimmed);
  const hasCta =
    /(문의|상담|연락|도입\s*문의|CS쉐어링)/i.test(trimmed) &&
    /(문의|상담|CTA)/i.test(trimmed.slice(-600));

  const missingSections: string[] = [];
  if (!hasFaq) {
    missingSections.push("FAQ");
  }
  if (!hasKeyTakeaways) {
    missingSections.push("오늘의 핵심");
  }
  if (!hasCta) {
    missingSections.push("CTA");
  }

  return {
    charCountWithSpaces,
    charCountWithoutSpaces,
    hasFaq,
    hasKeyTakeaways,
    hasCta,
    isTooShort: charCountWithSpaces < MAGAZINE_MIN_CHARS_WITH_SPACES,
    shouldWarn: charCountWithSpaces < MAGAZINE_WARN_CHARS_WITH_SPACES,
    missingSections,
  };
}

export const MAGAZINE_RETRY_INSTRUCTION = `[재생성 지시]
이전 출력이 기준보다 짧거나 FAQ/오늘의 핵심/CTA가 부족합니다.
- 길이: 공백 포함 3,200~3,800자, 공백 제외 2,400~2,800자 (FAQ/오늘의 핵심/CTA 포함 전체 원고 기준)
- 원문에 없는 수치/사례를 새로 만들어 길이를 맞추지 말 것
- 🔎 자주 묻는 질문, 📌 오늘의 핵심 3가지, CTA를 반드시 포함
- 허용 이모티콘(1️⃣2️⃣3️⃣ ✅ 🔎 📌)을 구조 위치에 배치`;

export function shouldRetryMagazineGeneration(
  validation: MagazineRawValidation
): boolean {
  return (
    validation.isTooShort || validation.missingSections.length > 0
  );
}
