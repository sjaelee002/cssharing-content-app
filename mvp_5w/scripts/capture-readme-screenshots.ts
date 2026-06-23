/**
 * README용 UI 스크린샷 생성 (샘플 데이터, API 호출 없음)
 * 실행: node --import tsx scripts/capture-readme-screenshots.ts
 */
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

import { buildMagazineStandaloneHtml } from "../src/lib/magazine/buildMagazineStandaloneHtml";
import { formatMagazineHtml } from "../src/lib/magazine/formatMagazineHtml";

const OUT_DIR = resolve(process.cwd(), "docs/screenshots");

const SAMPLE_BLOG_HTML = `
<h2>성수기 콜센터, 내부 인력만으로 버티기 어려운 이유</h2>
<p>성수기에는 문의량이 급증하고, 야간·주말 응대 공백이 매출 손실로 이어질 수 있습니다.</p>
<blockquote>응답 지연 1분이 이탈로 이어진다는 인사이트를 기억하세요.</blockquote>
<ul><li>피크 시간대 인력 부족</li><li>교육·채용 리드타임</li><li>야간 수당 부담</li></ul>
`.trim();

const SAMPLE_MAGAZINE_HTML = formatMagazineHtml(
  `
<h2>성수기 CS 운영, 전문 대행으로 안정화하기</h2>
<p>성수기에는 상담 인력의 피로도가 급격히 높아질 수 있습니다. 필요 시간만 투입하는 CS 대행이 유연한 대안이 됩니다.</p>
<h2>직접 인력 vs CS 대행 서비스</h2>
<table>
<tr><td></td><th>구분</th><th>직접 인력 확충</th><th>CS 대행 서비스</th></tr>
<tr><td></td><td>성수기 대응 유연성</td><td>신규 채용·교육 필요</td><td>투입 규모 조정 가능</td></tr>
<tr><td>비용</td><td>고정 인건비 부담</td><td>필요 시간만 과금</td></tr>
</table>
<h2>자주 묻는 질문</h2>
<h3>CS 대행은 언제 도입해야 하나요?</h3>
<p>성수기 2~3개월 전 검토를 권장합니다.</p>
<h2>오늘의 핵심 3가지</h2>
<p>1️⃣ 성수기 전 선제 대응이 중요합니다.</p>
<p>2️⃣ 응답 지연은 이탈로 이어집니다.</p>
<p>3️⃣ 검증된 인력 투입이 해법입니다.</p>
`.trim(),
  []
);

function buildDemoPage(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif; background: #f3f4f6; color: #111827; }
    .app { max-width: 1100px; margin: 0 auto; padding: 24px; }
    .header { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px 24px; margin-bottom: 16px; }
    .header h1 { margin: 0 0 8px; font-size: 20px; }
    .header p { margin: 0; color: #6b7280; font-size: 14px; }
    .tabs { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .tab { padding: 8px 14px; border-radius: 8px; border: 1px solid #e5e7eb; background: #fff; font-size: 13px; }
    .tab.active { background: #111827; color: #fff; border-color: #111827; }
    .panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px 24px; }
    .toolbar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
    .btn { padding: 8px 12px; border-radius: 8px; border: 1px solid #d1d5db; background: #fff; font-size: 13px; }
    .btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
    .btn.accent { background: #059669; color: #fff; border-color: #059669; }
    .hint { font-size: 12px; color: #6b7280; margin-top: 8px; }
    .preview { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: #fafafa; }
    .social { white-space: pre-wrap; line-height: 1.7; font-size: 15px; }
    .social-title { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
    .draft-area { width: 100%; min-height: 120px; border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; font-size: 14px; resize: vertical; }
    .row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .badge { font-size: 11px; background: #eef2ff; color: #4338ca; padding: 4px 8px; border-radius: 999px; }
  </style>
</head>
<body>
  <div class="app">${bodyHtml}</div>
</body>
</html>`;
}

async function capture() {
  mkdirSync(OUT_DIR, { recursive: true });

  const pages: Array<{ name: string; html: string }> = [
    {
      name: "main-input",
      html: buildDemoPage(
        "메인 입력",
        `
        <div class="header">
          <h1>콘텐츠 운영 OS</h1>
          <p>초안을 입력하고 5채널 콘텐츠를 생성합니다.</p>
        </div>
        <div class="panel">
          <div class="row" style="margin-bottom:12px;">
            <span class="badge">Step 1</span>
            <strong>초안 입력</strong>
            <button class="btn" style="margin-left:auto;">내 작업 초기화</button>
          </div>
          <textarea class="draft-area">성수기 콜센터 운영 시 내부 인력만으로는 야간·주말 응대 공백이 생깁니다. CS 대행 서비스로 필요 시간만 투입하는 방법을 정리합니다.</textarea>
          <div class="row" style="margin-top:12px;">
            <button class="btn primary">전체 채널 생성</button>
          </div>
        </div>`
      ),
    },
    {
      name: "blog-preview",
      html: buildDemoPage(
        "블로그 미리보기",
        `
        <div class="tabs">
          <span class="tab active">Blog</span><span class="tab">Magazine</span><span class="tab">Instagram</span><span class="tab">Facebook</span><span class="tab">LinkedIn</span>
        </div>
        <div class="panel">
          <div class="toolbar">
            <button class="btn accent">HTML 서식 포함 복사 (네이버 에디터 추천)</button>
            <button class="btn">블로그 텍스트 복사</button>
          </div>
          <div class="preview">${SAMPLE_BLOG_HTML}</div>
        </div>`
      ),
    },
    {
      name: "magazine-preview",
      html: buildDemoPage(
        "매거진 미리보기",
        `
        <div class="tabs">
          <span class="tab">Blog</span><span class="tab active">Magazine</span><span class="tab">Instagram</span>
        </div>
        <div class="panel">
          <div class="toolbar">
            <button class="btn">HTML 서식 포함 복사</button>
            <button class="btn primary">HTML/CSS 코드 복사</button>
            <button class="btn">HTML 파일 다운로드</button>
          </div>
          <p class="hint">서식 포함 복사는 CMS 붙여넣기용이고, HTML/CSS 코드 복사·다운로드는 브라우저 미리보기 확인용입니다.</p>
          <div class="preview">${SAMPLE_MAGAZINE_HTML}</div>
        </div>`
      ),
    },
    {
      name: "magazine-export-buttons",
      html: buildDemoPage(
        "매거진 export",
        `
        <div class="panel">
          <h2 style="margin-top:0;font-size:18px;">홈페이지 매거진 — 복사·다운로드</h2>
          <div class="toolbar">
            <button class="btn">HTML 서식 포함 복사</button>
            <button class="btn primary">HTML/CSS 코드 복사</button>
            <button class="btn accent">HTML 파일 다운로드</button>
          </div>
          <p class="hint">서식 포함 복사는 CMS 붙여넣기용이고, HTML/CSS 코드 복사·다운로드는 브라우저 미리보기 확인용입니다.</p>
        </div>`
      ),
    },
    {
      name: "social-output",
      html: buildDemoPage(
        "소셜 출력",
        `
        <div class="tabs">
          <span class="tab">Blog</span><span class="tab">Magazine</span><span class="tab active">Instagram</span><span class="tab">Facebook</span><span class="tab">LinkedIn</span>
        </div>
        <div class="panel">
          <div class="toolbar">
            <button class="btn">복사</button><button class="btn primary">저장</button><button class="btn">재생성</button>
          </div>
          <div class="social">성수기 콜센터, 내부 인력만으로는 버티기 어렵습니다. 필요 시간만 투입하는 CS 대행이 응답 공백을 줄입니다. 도입 전 체크리스트가 궁금하다면 댓글로 남겨주세요.</div>
        </div>
        <div class="panel" style="margin-top:16px;">
          <div class="social-title">LinkedIn</div>
          <div class="social-title" style="font-size:16px;">성수기 CS 운영, 유연한 인력 투입이 핵심입니다</div>
          <div class="social">성수기에는 문의량 급증과 인력 피로가 동시에 옵니다. 검증된 CS 대행으로 응답 품질을 유지하세요.</div>
        </div>`
      ),
    },
    {
      name: "reset-button",
      html: buildDemoPage(
        "초기화",
        `
        <div class="panel">
          <div class="row">
            <strong>초안 입력</strong>
            <button class="btn" style="margin-left:auto;border-color:#fca5a5;color:#b91c1c;">내 작업 초기화</button>
          </div>
          <textarea class="draft-area">샘플 초안 텍스트</textarea>
        </div>`
      ),
    },
  ];

  const standaloneMagazine = buildMagazineStandaloneHtml(
    SAMPLE_MAGAZINE_HTML,
    "성수기 CS 운영"
  );
  writeFileSync(resolve(OUT_DIR, "_magazine-standalone-preview.html"), standaloneMagazine);

  for (const page of pages) {
    writeFileSync(resolve(OUT_DIR, `${page.name}.html`), page.html);
  }

  console.log(`✓ Demo HTML saved to ${OUT_DIR}`);
  console.log("  PNG 스크린샷은 Playwright MCP 또는 브라우저로 HTML 파일을 열어 촬영하세요.");
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
