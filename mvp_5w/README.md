# 콘텐츠 운영 OS — MVP (Step 1~4 + Step 6)

Next.js 기반 콘텐츠 운영 OS MVP입니다. 기존 Google Apps Script `콘텐츠 만능이`의 **두뇌**(프롬프트·조립 로직)를 이식하여, 업그레이드된 웹앱으로 재구축했습니다.

## 현재 구현 범위

`제품_사용설명서_콘텐츠운영OS.md`의 **## 3. 사용 순서 (제품의 핵심 흐름)** 기준 **Step 1~4 + Step 6(MVP)**가 구현되어 있습니다.


| Step   | 기능                        | 상태                          |
| ------ | ------------------------- | --------------------------- |
| Step 1 | 초안 입력                     | ✅                           |
| Step 2 | 유형·목표·톤 선택                | ✅                           |
| Step 3 | 전체 채널 생성 (5채널 순차)         | ✅                           |
| Step 4 | 채널별 확인·복사·재생성·고도화·버전 되돌리기 | ✅                           |
| Step 5 | 카드뉴스 (Canva)              | 🔜 1차 배포 후 확장               |
| Step 6 | 저장 & 글감 누적 (Supabase)     | ✅                           |
| Step 7 | 발행                        | 🔜 1차 배포 후 확장 (MVP: 사람이 복사) |


### MVP 5채널

- `Blog` — 네이버 블로그 (HTML 미리보기·복사·태그·대체 제목 포함)
- `Magazine` — 홈페이지 매거진
- `Instagram` — 인스타그램
- `Facebook` — 페이스북
- `LinkedIn` — 링크드인

### 네이버 블로그 탭 (MVP 포함)

- 채택 제목, HTML 미리보기, 추천 태그, 대체 제목
- HTML 서식 포함 복사 / 블로그 텍스트 복사 / 순수 본문 복사
- 시각화 자료 삽입 제안 (텍스트 참고용)
- 원문 보기 / 자기점검 보기 (접힘 UI)
- Supabase 저장 시 **raw 원문** 저장 (HTML preview·visual markup 미포함)

### 1차 배포에서 숨긴 실험 기능

아래 기능은 코드베이스에 남아 있을 수 있으나 **MVP 기본 UI에서는 노출되지 않습니다.**

- 블로그 시각화 자료 자동 생성 (SVG/HTML-CSS)
- 인스타 카드뉴스 HTML/CSS 생성 패널

재활성화 시 환경변수:

```env
NEXT_PUBLIC_ENABLE_BLOG_VISUAL_GENERATOR=true
NEXT_PUBLIC_ENABLE_INSTAGRAM_CARDNEWS=true
```

## 로컬 실행 방법

```bash
cd mvp_5w
npm install
cp .env.example .env.local   # 값 채우기
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

```bash
npm run lint   # ESLint
npm run build  # 프로덕션 빌드
```

## 환경변수 설정

`mvp_5w/.env.example`을 복사해 `.env.local`을 만든 뒤 값을 채우세요. **`.env.local`은 Git에 올리지 마세요.**

### Vercel 필수 (MVP)

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=
ANTHROPIC_DRAFT_MODEL=claude-sonnet-4-6
ANTHROPIC_BLOG_HTML_MODEL=claude-sonnet-4-6

APP_ACCESS_PASSWORD=

SUPABASE_URL=
SUPABASE_SECRET_KEY=
```

### 선택 (없어도 MVP 기본 흐름 동작)

```env
ANTHROPIC_OUTLINE_MODEL=
ANTHROPIC_REVIEW_MODEL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_BRAND_ASSET_BUCKET=
```

### 실험 기능 전용 (MVP 1차 배포 불필요)

```env
ANTHROPIC_BLOG_VISUAL_MODEL=
ANTHROPIC_CARDNEWS_MODEL=
ANTHROPIC_CARDNEWS_THINKING=
ANTHROPIC_CARDNEWS_EFFORT=
NEXT_PUBLIC_ENABLE_BLOG_VISUAL_GENERATOR=
NEXT_PUBLIC_ENABLE_INSTAGRAM_CARDNEWS=
```


| 변수 | MVP 필수 | 설명 |
| --- | --- | --- |
| `LLM_PROVIDER` | ✅ | `anthropic` (현재 지원 provider) |
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API 키. **코드에 직접 넣지 마세요.** |
| `ANTHROPIC_DRAFT_MODEL` | ✅ | 5채널 원고 생성 |
| `ANTHROPIC_BLOG_HTML_MODEL` | ✅ | 블로그 HTML 미리보기 포맷 변환 |
| `APP_ACCESS_PASSWORD` | ✅ (Vercel) | 1차 팀 내부 테스트용 임시 접근 비밀번호 |
| `SUPABASE_URL` | ✅ (Step 6) | Supabase 프로젝트 URL |
| `SUPABASE_SECRET_KEY` | ✅ (Step 6) | 서버 API Route 전용 Secret Key |
| `ANTHROPIC_OUTLINE_MODEL` | 선택 | 향후 아웃라인 단계용 |
| `ANTHROPIC_REVIEW_MODEL` | 선택 | 향후 품질 검수용 |
| `ANTHROPIC_BLOG_VISUAL_MODEL` | 실험 | 시각화 자동 생성 (없으면 `ANTHROPIC_DRAFT_MODEL` fallback) |
| `ANTHROPIC_CARDNEWS_*` | 실험 | 인스타 카드뉴스 API |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_BRAND_ASSET_BUCKET` | 선택 | brand asset (visual 실험 API에서만 사용) |


API 키·Supabase Secret·접근 비밀번호는 **서버 API Route에서만** 사용됩니다. 클라이언트 코드에 하드코딩하지 마세요.

- 생성: `POST /api/generate`
- 블로그 HTML: `POST /api/blog-html-format`
- 저장: `POST /api/content`
- 접근 게이트: `POST /api/access`

주의:

- `.env.local`에는 secret 값이 들어가므로 GitHub에 올리지 마세요.
- secret key에는 `NEXT_PUBLIC_` 접두사를 붙이지 마세요.

## 내 작업 초기화

초안 입력 영역 옆 **「내 작업 초기화」** 버튼으로 다음을 한 번에 비웁니다.

- 초안 입력, 5채널 생성 결과, 블로그 enhancement 상태
- 브라우저 `localStorage` (`cssharing-` prefix 키 전체)

Supabase에 이미 저장된 데이터는 삭제하지 않습니다.

## Vercel 배포 (1차 팀 공유)

### 1차 배포 포함

- Step 1~4 (초안 입력, 유형/목표/톤, 5채널 생성, 복사/재생성/고도화/버전 되돌리기)
- Blog 채널: 네이버 블로그 상세 지침 + HTML 미리보기 + 복사 버튼
- Step 6 Supabase 저장 / ⭐ 고성과 저장 / 참고자료 재활용
- 내 작업 초기화
- 임시 접근 비밀번호 게이트 (`APP_ACCESS_PASSWORD`)

### 1차 배포 제외 (후속 확장)

- Step 5 Canva 카드뉴스 실제 연동
- 블로그 시각화 자료 자동 생성 (MVP UI 숨김)
- 인스타 카드뉴스 HTML/CSS 생성 (MVP UI 숨김)
- Figma / 이미지 AI / PDF·PPTX export
- 자동 발행
- 정식 인증 / 로그인 / 권한 관리
- 성과 분석 대시보드

### Vercel 프로젝트 설정

1. Vercel에 저장소를 연결합니다.
2. **Root Directory**를 `mvp_5w`로 설정합니다.
3. `.env.local` 파일을 업로드하지 않습니다.
4. Project Settings → **Environment Variables**에 MVP 필수 env 7개를 입력합니다.
5. 배포 후 팀원에게 URL과 접근 비밀번호를 공유합니다.

## 임시 접근 비밀번호 게이트

- 환경변수: `APP_ACCESS_PASSWORD`
- 검증: `POST /api/access`
- 통과 후: 브라우저 `sessionStorage`에 접근 허용 상태 저장
- **정식 로그인/권한 관리가 아닙니다.** 1차 팀 내부 테스트용입니다.
- 로컬에서 `APP_ACCESS_PASSWORD`가 비어 있으면 게이트가 비활성화됩니다.

## Supabase 테이블 생성 (Step 6)

아래 SQL을 Supabase SQL Editor에서 실행하세요. 전체 스키마는 `docs/supabase-schema.sql`을 참고하세요.

```sql
create table if not exists contents (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  content_type text,
  goal text,
  tone text,
  draft text,
  content text not null,
  is_high_performance boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contents_channel_created_at
on contents (channel, created_at desc);

create index if not exists idx_contents_high_performance_created_at
on contents (is_high_performance, created_at desc);
```

Blog 저장 시 `content` 컬럼에는 LLM이 생성한 **raw 원문**이 들어갑니다.

## 데이터 저장

### 브라우저 localStorage

키: `cssharing-content-os-v1`

- `draft`, `contentType`, `goal`, `tone`, `activeTab`
- `outputs`, `refinements`, `globalRules`, `channelRules`, `channelExtra`
- `blogEnhancement` (raw/HTML/parsed — visual asset은 persist하지 않음)
- 「내 작업 초기화」 시 `cssharing-` prefix 키 전체 삭제

### Supabase (Step 6)

- `POST /api/content`: 현재 채널 결과 저장 (`⭐ 고성과 저장` 지원)
- `GET /api/references`: 고성과(`is_high_performance=true`) 참고자료 최근순 조회

## 이식한 핵심 로직

`.shared_cssharing/` 참고용 코드에서 순수 JS 로직만 이식했습니다.

- `BASE_PROMPTS` (MVP 5채널)
- `buildPrompt()`
- `DEFAULT_GLOBAL_RULES`
- `TONES`, `TYPES`, `GOAL_CHANNELS`
- 네이버 블로그 상세 지침 (`naver-blog-guide.ts`)
- 고도화 이력 반영 (최근 3개 → 다음 `buildPrompt()`에 자동 반영)
- 규칙 반영 (전역 + 채널별 ON/OFF)

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx
│   └── api/
│       ├── generate/route.ts       # 5채널 원고 생성
│       ├── blog-html-format/route.ts  # 블로그 HTML 미리보기
│       ├── content/route.ts        # Supabase 저장
│       ├── references/route.ts     # 고성과 참고자료
│       └── access/route.ts         # 임시 접근 게이트
├── components/
│   ├── DraftPanel.tsx              # 초안 + 내 작업 초기화
│   ├── blog/BlogOutputPanel.tsx    # 블로그 탭 UI
│   ├── instagram/InstagramOutputPanel.tsx
│   ├── GenerationControls.tsx
│   ├── ChannelTabs.tsx
│   ├── ChannelOutput.tsx
│   └── RightPanel.tsx
├── hooks/
│   ├── useContentState.ts
│   ├── useGeneration.ts
│   └── useBlogEnhancement.ts
└── lib/
    ├── blog/                       # 파서, HTML 복사, 타입
    ├── prompts/
    ├── llm/
    ├── storage/supabase.ts
    ├── features.ts                 # 실험 기능 feature flag
    ├── types.ts
    └── local-storage.ts
```

실험 코드(API route, visual/cardnews 컴포넌트 등)는 별도 커밋/브랜치로 관리할 수 있습니다.
