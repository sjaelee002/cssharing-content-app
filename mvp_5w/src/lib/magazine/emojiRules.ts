/** 홈페이지 매거진에서 허용되는 이모티콘 (긴 문자열 우선 매칭) */
export const ALLOWED_MAGAZINE_EMOJIS = [
  "1️⃣",
  "2️⃣",
  "3️⃣",
  "✅",
  "🔎",
  "📌",
  "👉",
  "✨",
  "🤔",
  "💸",
] as const;

const EMOJI_CLUSTER_PATTERN =
  /(?:\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*|\d\uFE0F?\u20E3)/u;

const EMOJI_CLUSTER_GLOBAL =
  /(?:\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*|\d\uFE0F?\u20E3)/gu;

/** 블로그 source용: 모든 이모티콘 제거 */
export function stripAllEmojis(text: string): string {
  return text
    .replace(EMOJI_CLUSTER_GLOBAL, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 매거진 raw용: 허용 세트만 유지 */
export function retainOnlyAllowedMagazineEmojis(text: string): string {
  let result = "";
  let i = 0;

  while (i < text.length) {
    let matchedAllowed = false;
    for (const emoji of ALLOWED_MAGAZINE_EMOJIS) {
      if (text.slice(i, i + emoji.length) === emoji) {
        result += emoji;
        i += emoji.length;
        matchedAllowed = true;
        break;
      }
    }
    if (matchedAllowed) {
      continue;
    }

    const remaining = text.slice(i);
    const clusterMatch = remaining.match(EMOJI_CLUSTER_PATTERN);
    if (clusterMatch && clusterMatch.index === 0) {
      i += clusterMatch[0].length;
      continue;
    }

    const codePoint = text.codePointAt(i);
    if (codePoint === undefined) {
      break;
    }
    const charLen = codePoint > 0xffff ? 2 : 1;
    result += String.fromCodePoint(codePoint);
    i += charLen;
  }

  return result;
}

export const MAGAZINE_EMOJI_PROMPT_RULES = `■ 홈페이지 매거진 이모티콘 규칙
- 블로그 원문 이모티콘을 그대로 복사하지 마세요. 매거진 톤에 맞게 아래 허용 세트만 제한적으로 새로 배치하세요.
- 허용 이모티콘: 1️⃣ 2️⃣ 3️⃣ (숫자형 섹션), ✅ (체크/FAQ 답변), 🔎 (자주 묻는 질문), 📌 (오늘의 핵심), 👉 ✨ 🤔 💸 (강조/전환, 각각 콘텐츠당 최대 1회)
- 전체 이모티콘은 본문 기준 8개 이내
- 소제목/FAQ/핵심 요약 등 구조를 잡는 위치에만 사용하고, 문장 중간에 과하게 남발하지 마세요`;

export const MAGAZINE_STRUCTURE_PROMPT_RULES = `■ 홈페이지 매거진 고정 구조 (본문 후반부에 가능하면 포함)
1. 🔎 자주 묻는 질문
   - 질문 3개 (검색 질의처럼 자연스러운 문장)
   - 답변 2~3문장, 답변 앞에 ✅ 사용 가능

2. 📌 오늘의 핵심 3가지
   - 1️⃣ 2️⃣ 3️⃣ 형식 사용
   - 각 항목은 한 문장으로 요약

3. CTA
   - CS쉐어링 문의/상담 유도

■ 비교/표현 규칙
- 비교 내용은 Markdown/HTML 표 문법 없이 문장형으로 작성하세요.
- 예: "직접 인력 확충과 CS쉐어링 시간제 서비스는 빈 시간대, 휴가 공백, 문의 폭주 처리 방식에서 차이가 있습니다. 빈 시간대의 경우 직접 인력 확충은 야간·주말 수당 부담이 발생하지만, CS쉐어링 시간제 서비스는 필요한 시간만 선택 운영할 수 있습니다."
- 시각화 자료 placeholder는 raw에 넣지 마세요. (HTML 변환 단계에서만 삽입)`;
