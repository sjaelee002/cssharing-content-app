import type { BlogImageSuggestion } from "@/lib/blog/types";
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
  "hr",
  "span",
  "div",
] as const;

export function buildBlogHtmlFormatPrompt(
  bodyText: string,
  mainTitle: string,
  imageSuggestions: BlogImageSuggestion[]
): string {
  const imageList =
    imageSuggestions.length > 0
      ? imageSuggestions
          .map(
            (img) =>
              `- 이미지 ${img.index}: 위치="${img.position}", 유형="${img.imageType}", 내용="${img.description}", 캡션키워드="${img.captionKeywords}"`
          )
          .join("\n")
      : "(시각화 자료 삽입 제안 없음)";

  return `당신은 네이버 블로그 스마트에디터용 HTML 포맷터입니다.
아래 블로그 본문을 읽고, 독자가 읽기 좋은 HTML로 변환하세요.

## 제목 (참고용, HTML에 h1은 넣지 마세요)
${mainTitle}

## 본문 원문
${bodyText}

## 시각화 자료 삽입 제안 (placeholder 삽입 참고)
${imageList}

## 역할
1. 본문을 읽고 어떤 문장을 h2/h3/p/ul/li/blockquote로 만들지 판단하세요.
2. 핵심 키워드, 수치, 문제 상황, 해결책, CTA 문구를 strong 또는 span으로 강조하세요 (한 섹션당 1~2개).
3. 긴 문단을 독자가 읽기 좋게 나누세요.
4. 시각화 자료 삽입 제안에 맞춰 본문 중 적절한 위치에 placeholder를 삽입하세요.
   형식: <div class="blog-image-placeholder">[시각화 자료 N: 설명]</div>
5. 추천 태그, 대체 제목, 자기점검, 시각화 자료 삽입 제안 표는 HTML에 넣지 마세요.
6. 네이버 블로그 스마트에디터에 복사/붙여넣기 하기 좋은 단순 HTML을 생성하세요.

## 허용 HTML 태그
${ALLOWED_TAGS.join(", ")}

## 금지
- script, iframe, external stylesheet, JavaScript, event handler attribute
- 원본에 없는 과장된 주장 추가
- 추천 태그/대체 제목/자기점검을 본문 HTML에 섞는 것
- h1 태그

${NO_FAKE_NUMBERS_RULES}
- 원본에 없는 수치를 HTML에 새로 추가하지 마세요.

## 스타일 방향
- 강조 색상: #2ab2f5 (span style="color:#2ab2f5" 사용 가능, 과하지 않게)
- 소제목(이모지 포함 한 줄)은 h2 또는 h3로 변환
- 목차 영역은 ul/li로 변환 가능
- 이모지는 그대로 유지

## 출력 형식
HTML 코드만 출력하세요. 설명, 마크다운 코드펜스, JSON 없이 순수 HTML만 반환하세요.`;
}

export function stripHtmlFences(html: string): string {
  let result = html.trim();
  if (result.startsWith("```html")) {
    result = result.slice(7);
  } else if (result.startsWith("```")) {
    result = result.slice(3);
  }
  if (result.endsWith("```")) {
    result = result.slice(0, -3);
  }
  return result.trim();
}
