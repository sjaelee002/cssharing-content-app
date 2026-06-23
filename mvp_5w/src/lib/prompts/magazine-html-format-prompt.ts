import { NO_FAKE_NUMBERS_RULES } from "@/lib/blog/dataIntegrityRules";

const ALLOWED_TAGS = [
  "h2",
  "h3",
  "p",
  "ul",
  "ol",
  "li",
  "blockquote",
  "strong",
  "br",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
] as const;

export function buildMagazineHtmlFormatPrompt(
  rawText: string,
  title: string
): string {
  return `당신은 홈페이지 매거진용 HTML 포맷터입니다.
아래 순수 원문(raw)을 읽고, CMS/웹페이지에 붙여넣기 좋은 안전한 HTML로 **구조화만** 하세요.

## 매거진 제목 (참고용, h1은 넣지 마세요)
${title}

## 순수 원문 (raw) — 아래 전체를 빠짐없이 HTML로 변환
${rawText}

## 핵심 규칙 (반드시 준수)
1. **요약·축약·생략 금지** — raw의 모든 문단, 소제목, FAQ, 오늘의 핵심, CTA를 그대로 포함하세요.
2. raw에 없는 문장·수치·사례를 새로 만들지 마세요.
3. 소제목은 h2/h3, 본문은 p, 목록은 ul/li, 인용은 blockquote, 강조는 strong을 사용하세요.
4. raw에 있는 허용 이모티콘(1️⃣ 2️⃣ 3️⃣ ✅ 🔎 📌 👉 ✨ 🤔 💸)은 그대로 유지하세요.
5. 비교·대조 내용이 문장형으로 있으면 **table 1개만** 구성하세요. 비교 맥락이 없으면 표를 만들지 마세요.
6. 시각화 placeholder는 넣지 마세요. (코드에서 후처리로 삽입됩니다.)
7. inline style, class, id를 넣지 마세요. (스타일은 코드 후처리에서 적용됩니다.)
8. Markdown 기호(#, **, ---, |표|)는 HTML에 넣지 마세요.
9. FAQ 섹션 제목에 '자주 묻는 질문', 오늘의 핵심 섹션 제목에 '오늘의 핵심' 문구를 반드시 포함하세요.

## 허용 HTML 태그
${ALLOWED_TAGS.join(", ")}

## 금지
- script, iframe, external stylesheet, JavaScript, event handler attribute
- h1 태그
- raw에 없는 내용 추가·삭제
- div 태그

${NO_FAKE_NUMBERS_RULES}

## 출력 형식
HTML 코드만 출력하세요. 설명, 마크다운 코드펜스, JSON 없이 순수 HTML만 반환하세요.`;
}

export { stripHtmlFences } from "@/lib/prompts/blog-html-format-prompt";
