# 채널 프롬프트·source·저장 위치 가이드

채널별 콘텐츠 생성·저장 로직을 수정할 때 참고하세요.

## 채널별 기본 프롬프트 (BASE_PROMPTS)

| 채널 | 파일 |
|------|------|
| Instagram | `src/lib/prompts/base-prompts.ts` |
| Facebook | `src/lib/prompts/base-prompts.ts` |
| LinkedIn | `src/lib/prompts/base-prompts.ts` |
| Magazine | `src/lib/prompts/base-prompts.ts` |
| Blog | `src/lib/prompts/base-prompts.ts` |

Blog 상세 지침: `src/lib/prompts/channel-guides/naver-blog-guide.ts`

## 프롬프트 조립 (규칙·source·초안)

- `src/lib/prompts/build-prompt.ts` — `buildPrompt()` 공통 조립
- Magazine/Magazine·소셜 blog source 규칙: 동 파일 내 `MAGAZINE_FROM_BLOG_RULES`, `DOWNSTREAM_FROM_BLOG_RULES`
- Magazine 이모티콘·구조 규칙: `src/lib/magazine/emojiRules.ts`

## 채널별 HTML/후처리 프롬프트

| 용도 | 파일 |
|------|------|
| Blog HTML 포맷 | `src/lib/prompts/blog-html-format-prompt.ts` |
| Magazine HTML 포맷 | `src/lib/prompts/magazine-html-format-prompt.ts` |
| Magazine HTML 후처리 | `src/lib/magazine/formatMagazineHtml.ts` — `normalizeMagazineTable()`, `styleMagazineTables()`, placeholder/FAQ |
| Magazine standalone HTML | `src/lib/magazine/buildMagazineStandaloneHtml.ts` |

## source 우선순위

| 채널 | helper | 파일 |
|------|--------|------|
| Blog | (초안 직접) | `src/hooks/useGeneration.ts` |
| Magazine | `getBlogSourceForMagazine()` | `src/lib/blog/getBlogContentForStorage.ts` |
| Instagram/Facebook/LinkedIn | `getBlogSourceForSocial()` | `src/lib/blog/getBlogContentForStorage.ts` |
| 소스 조립 | `buildPrompt(..., blogSource)` | `src/lib/prompts/build-prompt.ts` |
| 생성 트리거 | `useGeneration` | `src/hooks/useGeneration.ts` |

우선순위: Blog clean content(제목+본문, 이모티콘 제거) → 없으면 사용자 초안

## Supabase 저장용 sanitize

| 채널 | helper | 파일 |
|------|--------|------|
| Blog | `getBlogContentForStorage()` | `src/lib/blog/getBlogContentForStorage.ts` |
| Magazine | `getMagazineContentForStorage()` | `src/lib/magazine/sanitizeMagazineRaw.ts` |
| Instagram/Facebook/LinkedIn | `getSocialContentForStorage()` | `src/lib/social/sanitizeSocialContent.ts` |
| 저장 분기 | `resolveContentForSave()` | `src/app/page.tsx` |

## UI 표시

| 채널 | 컴포넌트 |
|------|----------|
| Blog | `src/components/blog/BlogOutputPanel.tsx` |
| Magazine | `src/components/magazine/MagazineOutputPanel.tsx` |
| Instagram | `src/components/instagram/InstagramOutputPanel.tsx` → `SocialOutputPanel` |
| Facebook/LinkedIn | `src/components/social/SocialOutputPanel.tsx` |
| 소셜 UI 정제 | `formatSocialContentForDisplay()` in `src/lib/social/sanitizeSocialContent.ts` |

## 테스트 스크립트

| 스크립트 | 용도 |
|----------|------|
| `scripts/test-magazine-html-format.ts` | table 정규화, placeholder, standalone HTML |
| `scripts/test-content-storage.ts` | Blog/Magazine 저장 분리 |
| `scripts/test-e2e-llm-pipeline.ts` | Blog→Magazine→Social LLM + Supabase E2E |
| `scripts/capture-readme-screenshots.ts` | README용 샘플 UI 스크린샷 HTML/PNG |

## max_tokens

`src/lib/llm/models.ts` — `getMaxTokensForChannel()`, `getMagazineHtmlMaxTokens()`
