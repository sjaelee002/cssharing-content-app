# 콘텐츠 운영 OS (cssharing_content_app)

CS쉐어링 콘텐츠 운영 OS를 구축하는 모노레포입니다. 초안 입력부터 채널별 콘텐츠 생성, 고도화, Supabase 저장까지 한 흐름으로 운영하는 것을 목표로 합니다.

기존 Google Apps Script `콘텐츠 만능이`의 프롬프트·조립 로직을 Next.js 웹앱으로 이식하고, 팀이 URL로 바로 테스트할 수 있는 MVP를 `mvp_5w/`에서 운영합니다.

## 현재 완료된 기능 (1차 배포 범위)

| Step | 기능 | 상태 |
|------|------|------|
| Step 1 | 초안 입력 | ✅ |
| Step 2 | 유형·목표·톤 선택 | ✅ |
| Step 3 | 5채널 전체 생성 (Blog, Magazine, Instagram, Facebook, LinkedIn) | ✅ |
| Step 4 | 채널별 확인·복사·재생성·고도화·버전 되돌리기 | ✅ |
| Blog | 네이버 블로그 상세 작성 지침 반영 | ✅ |
| Step 6 | Supabase 저장 / ⭐ 고성과 저장 / 참고자료 재활용 | ✅ |

상세 실행 방법·환경변수·Supabase SQL은 [mvp_5w/README.md](mvp_5w/README.md)를 참고하세요.

## 1차 배포 제외 기능 (1차 배포 후 확장)

- Step 5 Canva 카드뉴스 실제 연동
- Figma / 이미지 AI
- 자동 발행
- 인증 / 로그인
- 성과 분석 대시보드

## 폴더 구조

| 폴더 | 설명 |
|------|------|
| `mvp_5w/` | 실제 Next.js MVP 앱. **Vercel 배포 대상.** Step 1~4 + Blog 지침 + Step 6 Supabase |
| `prototype/` | 초기 FastAPI + React Vite 기반 outline generator. 추후 `mvp_5w`와 통합 예정 |
| `content_research/` | 콘텐츠 분석·리서치 보고서 및 스크립트 |
| `.shared_cssharing/` | 회사 제공 참고자료 (프롬프트·지침 샘플 등). **GitHub 업로드 제외** |

## 로컬 실행 (mvp_5w)

```bash
cd mvp_5w
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

## Vercel 배포 설정

| 항목 | 값 |
|------|-----|
| Root Directory | `mvp_5w` |
| Framework Preset | Next.js |
| Install Command | `npm install` |
| Build Command | `npm run build` |

1. Vercel에 저장소를 연결합니다.
2. **Root Directory**를 `mvp_5w`로 설정합니다. (루트 `cssharing_content_app`이 아닙니다.)
3. `.env.local` 파일을 업로드하지 않습니다.
4. Project Settings → **Environment Variables**에 필요한 변수를 직접 입력합니다.
5. 배포 후 팀원에게 URL을 공유합니다.

## 환경변수

### 로컬

`mvp_5w/.env.local` 파일을 직접 생성하고, 아래 템플릿에 값을 채우세요. 상세 안내는 [mvp_5w/README.md](mvp_5w/README.md)를 참고하세요.

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=
ANTHROPIC_DRAFT_MODEL=
ANTHROPIC_OUTLINE_MODEL=
ANTHROPIC_REVIEW_MODEL=

SUPABASE_URL=
SUPABASE_SECRET_KEY=
```

### Vercel

`.env.local`을 업로드하지 않습니다. Project Settings → **Environment Variables**에 위와 같은 변수명/값을 직접 입력하세요.

| 변수 | 필수 | 설명 |
|------|------|------|
| `LLM_PROVIDER` | ✅ | `anthropic` |
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API 키 |
| `ANTHROPIC_DRAFT_MODEL` | ✅ | 콘텐츠 생성용 모델 |
| `ANTHROPIC_OUTLINE_MODEL` | 선택 | 향후 아웃라인 단계용 |
| `ANTHROPIC_REVIEW_MODEL` | 선택 | 향후 품질 검수용 |
| `SUPABASE_URL` | ✅ (Step 6) | Supabase 프로젝트 URL |
| `SUPABASE_SECRET_KEY` | ✅ (Step 6) | 서버 전용 Secret Key (`NEXT_PUBLIC_` 금지) |

## 보안 주의사항

다음은 **GitHub에 올리지 마세요.**

- `.env`, `.env.local` 및 환경변수 파일
- `.shared_cssharing/` (회사 제공 참고자료)
- `node_modules/`, `.next/` 등 빌드·의존성 산출물
- API key, Secret Key 등 인증 정보
- 회사 브랜드 에셋 원본

Secret key는 서버 API Route에서만 사용하고, 클라이언트에 `NEXT_PUBLIC_` 접두사로 노출하지 않습니다.

## 향후 계획

- Canva 카드뉴스 (Step 5)
- `prototype/` outline generator를 `mvp_5w`에 통합
- 저장 이력 상세 조회 (채널별 검색·필터)
- 인증 / 권한
- 성과 분석 대시보드

## 관련 문서

- [mvp_5w/README.md](mvp_5w/README.md) — MVP 앱 실행·환경변수·Supabase·Vercel 상세
- [content_research/README.md](content_research/README.md) — 콘텐츠 리서치
