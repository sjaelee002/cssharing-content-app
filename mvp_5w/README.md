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

- `Blog` — 네이버 블로그
- `Magazine` — 홈페이지 매거진
- `Instagram` — 인스타그램
- `Facebook` — 페이스북
- `LinkedIn` — 링크드인

## 로컬 실행 방법

```bash
cd mvp_5w
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

## 환경변수 설정

`mvp_5w/` 폴더 안에 `.env.local` 파일을 직접 생성한 뒤, 아래 템플릿을 복사해서 값만 채우세요.

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=
ANTHROPIC_DRAFT_MODEL=
ANTHROPIC_OUTLINE_MODEL=
ANTHROPIC_REVIEW_MODEL=

SUPABASE_URL=
SUPABASE_SECRET_KEY=

APP_ACCESS_PASSWORD=
```


| 변수                        | 필수               | 설명                                  |
| ------------------------- | ---------------- | ----------------------------------- |
| `LLM_PROVIDER`            | ✅                | `anthropic` (현재 지원 provider)        |
| `ANTHROPIC_API_KEY`       | ✅                | Anthropic API 키. **코드에 직접 넣지 마세요.** |
| `ANTHROPIC_DRAFT_MODEL`   | ✅                | Step 1~4 콘텐츠 생성에 사용                 |
| `ANTHROPIC_OUTLINE_MODEL` | 선택               | 향후 아웃라인 단계용                         |
| `ANTHROPIC_REVIEW_MODEL`  | 선택               | 향후 품질 검수용                           |
| `SUPABASE_URL`            | ✅ (Step 6)       | Supabase 프로젝트 URL                   |
| `SUPABASE_SECRET_KEY`     | ✅ (Step 6)       | 서버 API Route에서만 쓰는 Secret Key       |
| `APP_ACCESS_PASSWORD`     | ✅ (Vercel 1차 배포) | 1차 팀 내부 테스트용 임시 접근 비밀번호 (정식 로그인 아님) |


API 키는 서버 API Route(`src/app/api/generate/route.ts`)에서만 사용되며, 클라이언트에 노출되지 않습니다.
`SUPABASE_SECRET_KEY`도 동일하게 서버 Route에서만 사용하며 `NEXT_PUBLIC_` prefix를 붙이지 않습니다.
`APP_ACCESS_PASSWORD`도 서버에서만 검증합니다 (`/api/access`). 클라이언트 코드에 비밀번호를 하드코딩하지 마세요.

주의:

- `.env.local`에는 Anthropic API Key와 Supabase Secret Key가 들어가므로 절대 GitHub에 올리지 마세요.
- secret key에는 `NEXT_PUBLIC_` 접두사를 붙이지 마세요.
- 기존 `.env.local`을 다른 템플릿으로 덮어쓰지 마세요.

## Vercel 배포 (1차 팀 공유)

### 1차 배포 포함

- Step 1~4 (초안 입력, 유형/목표/톤, 5채널 생성, 복사/재생성/고도화/버전 되돌리기)
- Blog 채널 네이버 블로그 상세 지침 반영
- Step 6 Supabase 저장 / ⭐ 고성과 저장 / 참고자료 재활용
- 임시 접근 비밀번호 게이트 (`APP_ACCESS_PASSWORD`, 1차 팀 내부 테스트용)

### 1차 배포 제외 (1차 배포 후 확장)

- Step 5 Canva 카드뉴스 실제 연동
- Figma / 이미지 AI
- 자동 발행
- 정식 인증 / 로그인 / 권한 관리 (`APP_ACCESS_PASSWORD` 게이트는 임시 제한)
- 성과 분석 대시보드

### Vercel 프로젝트 설정

1. Vercel에 저장소를 연결합니다.
2. **Root Directory**를 `mvp_5w`로 설정합니다. (루트 `cssharing_content_app`이 아닙니다.)
3. `.env.local` 파일을 업로드하지 않습니다.
4. Project Settings → **Environment Variables**에 위 환경변수 템플릿과 같은 변수명/값을 직접 입력합니다. (`APP_ACCESS_PASSWORD` 포함)
5. 배포 후 팀원에게 URL과 접근 비밀번호를 공유합니다.

## 임시 접근 비밀번호 게이트 (1차 팀 공유)

Vercel Hobby 플랜에서는 production URL에 Vercel Password Protection을 기본으로 쓰기 어려우므로, 앱 자체에서 임시 접근 비밀번호를 확인합니다.

- 환경변수: `APP_ACCESS_PASSWORD`
- 검증: 서버 API `POST /api/access` (비밀번호는 클라이언트 코드에 넣지 않음)
- 통과 후: 브라우저 `sessionStorage`에 접근 허용 상태 저장
- **정식 로그인/권한 관리가 아닙니다.** 1차 팀 내부 테스트용 임시 제한입니다.
- 로컬 개발에서 `APP_ACCESS_PASSWORD`가 비어 있으면 게이트가 비활성화되고 상단에 안내가 표시됩니다.
- Vercel 배포 시에는 `APP_ACCESS_PASSWORD`를 Environment Variables에 반드시 설정하세요.

## Supabase 테이블 생성 (Step 6)

아래 SQL을 Supabase SQL Editor에서 실행하세요.

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

## 이번 구현에서 제외한 기능 (1차 배포 후 확장)

- Step 5 Canva 실제 연동 / 카드뉴스 생성
- Figma / 이미지 AI
- 인증 (비밀번호·도메인 게이트) — `APP_ACCESS_PASSWORD` 임시 게이트는 1차 배포에 포함, 정식 인증은 후속
- 자동 발행
- 성과 분석 대시보드
- CRM 연동

## 데이터 저장

Step 1~4 상태는 **브라우저 `localStorage`**에 저장합니다.

- `draft`, `contentType`, `goal`, `tone`
- `outputs`, `refinements`, `history`
- `globalRules`, `channelRules`, `channelExtra`

Step 6에서는 서버 API를 통해 Supabase `contents` 테이블에도 저장합니다.

- `POST /api/content`: 현재 채널 결과 저장 (`⭐ 고성과 저장` 지원)
- `GET /api/references`: 고성과(`is_high_performance=true`) 참고자료 최근순 조회

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
│   ├── api/content/route.ts
│   └── api/references/route.ts
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
    ├── storage/supabase.ts
    ├── types.ts
    └── local-storage.ts
```

## 스크립트

```bash
npm run dev    # 개발 서버
npm run build  # 프로덕션 빌드
npm run lint   # ESLint
```

