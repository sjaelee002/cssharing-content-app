# 콘텐츠 운영 OS — MVP (Step 1~4)

Next.js 기반 콘텐츠 운영 OS MVP입니다. 기존 Google Apps Script `콘텐츠 만능이`의 **두뇌**(프롬프트·조립 로직)를 이식하여, 업그레이드된 웹앱으로 재구축했습니다.

## 현재 구현 범위

`제품_사용설명서_콘텐츠운영OS.md`의 **## 3. 사용 순서 (제품의 핵심 흐름)** 기준 **Step 1~4**만 구현되어 있습니다.

| Step | 기능 | 상태 |
|------|------|------|
| Step 1 | 초안 입력 | ✅ |
| Step 2 | 유형·목표·톤 선택 | ✅ |
| Step 3 | 전체 채널 생성 (5채널 순차) | ✅ |
| Step 4 | 채널별 확인·복사·재생성·고도화·버전 되돌리기 | ✅ |
| Step 5 | 카드뉴스 (Canva) | 🔜 다음 단계 |
| Step 6 | 저장 & 글감 누적 (DB) | 🔜 다음 단계 |
| Step 7 | 발행 | 🔜 다음 단계 (MVP: 사람이 복사) |

### MVP 5채널

- `Blog` — 네이버 블로그
- `Magazine` — 홈페이지 매거진
- `Instagram` — 인스타그램
- `Facebook` — 페이스북
- `LinkedIn` — 링크드인

## 로컬 실행 방법

```bash
cd mvp_5w
npm install
cp .env.example .env.local
# .env.local에 ANTHROPIC_API_KEY 설정
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

## 환경변수 설정

`mvp_5w/.env.local` 파일을 생성하고 아래 값을 설정합니다.

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_DRAFT_MODEL=claude-sonnet-4-6
```

| 변수 | 필수 | 설명 |
|------|------|------|
| `LLM_PROVIDER` | ✅ | `anthropic` (현재 지원 provider) |
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API 키. **코드에 직접 넣지 마세요.** |
| `ANTHROPIC_DRAFT_MODEL` | ✅ | Step 1~4 콘텐츠 생성에 사용 |
| `ANTHROPIC_OUTLINE_MODEL` | 선택 | 향후 아웃라인 단계용 |
| `ANTHROPIC_REVIEW_MODEL` | 선택 | 향후 품질 검수용 |

API 키는 서버 API Route(`src/app/api/generate/route.ts`)에서만 사용되며, 클라이언트에 노출되지 않습니다.

## 이번 구현에서 제외한 기능

- Canva 실제 연동 / 카드뉴스 생성
- Supabase / Google Sheet / Google Docs 저장
- 고성과 참고자료 저장·조회
- 인증 (비밀번호·도메인 게이트)
- 자동 발행
- 성과 분석 대시보드
- CRM 연동

## 데이터 저장

Step 1~4에서는 DB 없이 **브라우저 `localStorage`**에 다음 항목을 저장합니다.

- `draft`, `contentType`, `goal`, `tone`
- `outputs`, `refinements`, `history`
- `globalRules`, `channelRules`, `channelExtra`

## 이식한 핵심 로직

`.shared_cssharing/` 참고용 코드에서 순수 JS 로직만 이식했습니다.

- `BASE_PROMPTS` (MVP 5채널)
- `buildPrompt()`
- `DEFAULT_GLOBAL_RULES`
- `TONES`, `TYPES`, `GOAL_CHANNELS` (채널 생성은 5채널 고정)
- 고도화 이력 반영 (최근 3개 → 다음 `buildPrompt()`에 자동 반영)
- 규칙 반영 (전역 + 채널별 ON/OFF)

## 프로젝트 구조

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/generate/route.ts
├── components/
│   ├── DraftPanel.tsx
│   ├── GenerationControls.tsx
│   ├── ChannelTabs.tsx
│   ├── ChannelOutput.tsx
│   └── RightPanel.tsx
├── hooks/
│   ├── useContentState.ts
│   └── useGeneration.ts
└── lib/
    ├── prompts/
    ├── llm/
    ├── types.ts
    └── local-storage.ts
```

## 스크립트

```bash
npm run dev    # 개발 서버
npm run build  # 프로덕션 빌드
npm run lint   # ESLint
```
