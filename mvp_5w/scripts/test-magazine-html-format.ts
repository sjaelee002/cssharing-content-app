/**
 * Magazine HTML 후처리 검증
 * 실행: npx tsx scripts/test-magazine-html-format.ts
 */
import type { BlogImageSuggestion } from "../src/lib/blog/types";
import {
  enhanceMagazineHtmlSections,
  formatMagazineHtml,
  getMagazinePlaceholderForbiddenStart,
  insertMagazineVisualPlaceholders,
  normalizeMagazineTable,
  selectMagazineVisualSuggestions,
  styleMagazineTables,
  MAGAZINE_BRAND_COLOR,
  MAGAZINE_TABLE_HEADER_BG,
} from "../src/lib/magazine/formatMagazineHtml";
import { buildMagazineStandaloneHtml } from "../src/lib/magazine/buildMagazineStandaloneHtml";
import { sanitizeMagazineRaw } from "../src/lib/magazine/sanitizeMagazineRaw";
import { parseMagazineContent } from "../src/lib/magazine/parseMagazineContent";
import {
  formatSocialContentForDisplay,
  getSocialContentForStorage,
} from "../src/lib/social/sanitizeSocialContent";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const sampleSuggestions: BlogImageSuggestion[] = [
  {
    index: 1,
    position: "도입부",
    imageType: "플로우차트",
    description: "성수기 CS 대행 준비 일정",
    captionKeywords: "성수기 CS 대행 준비 일정",
  },
  {
    index: 2,
    position: "본문 중반",
    imageType: "비교표",
    description: "직접 인력 vs 시간제 서비스",
    captionKeywords: "비교 인포그래픽",
  },
  {
    index: 3,
    position: "마무리",
    imageType: "체크리스트",
    description: "도입 체크리스트",
    captionKeywords: "도입 전 점검",
  },
  {
    index: 4,
    position: "CTA 전",
    imageType: "배너",
    description: "CS쉐어링 상담 안내",
    captionKeywords: "상담 유도",
  },
];

const selected = selectMagazineVisualSuggestions(sampleSuggestions, 3);
assert(selected.length === 3, "default 3 visual suggestions");
assert(selected.some((s) => s.position.includes("도입")), "includes intro visual");

const baseHtml = `
<h2>성수기 고객센터 문제</h2>
<p>문의가 폭주합니다.</p>
<h2>직접 인력 vs CS쉐어링</h2>
<table>
<thead><tr><th>구분</th><th>직접 인력 확충</th><th>CS쉐어링 시간제 서비스</th></tr></thead>
<tbody>
<tr><td>빈 시간대</td><td>야간 수당 부담</td><td>필요 시간만 운영</td></tr>
</tbody>
</table>
<table><tr><td>extra</td></tr></table>
<h2>자주 묻는 질문</h2>
<h3>여름 성수기에는 왜 어려운가요?</h3>
<p>문의량이 늘고 인력이 줄어듭니다.</p>
<h2>오늘의 핵심</h2>
<p>1️⃣ 응대 공백이 문제다.</p>
<p>2️⃣ 응답 지연이 매출 손실이다.</p>
<p>3️⃣ 검증된 인력 투입이 해법이다.</p>
`;

const styled = styleMagazineTables(baseHtml);
assert(styled.includes(MAGAZINE_BRAND_COLOR), "table highlight color applied");
assert(!styled.includes("<table><tr><td>extra"), "only one table kept");
assert(styled.includes("magazine-table-wrapper"), "table wrapped for overflow");
assert(styled.includes("<thead>"), "table has thead");
assert(!styled.includes("#f1ecff"), "no purple header background");
assert(styled.includes(MAGAZINE_TABLE_HEADER_BG), "light header background");

const brokenTableHtml = `
<h2>비교</h2>
<table>
<tr><td></td><th>구분</th><th>직접 인력 확충</th><th>CS 대행 서비스</th></tr>
<tr><td></td><td>성수기 대응</td><td>채용·교육 필요</td><td>규모 조정 가능</td></tr>
<tr></tr>
<tr><td>비용</td><td>고정 인건비</td><td>필요 시간만</td></tr>
</table>
`;
const fixedTable = styleMagazineTables(brokenTableHtml);
assert(!fixedTable.match(/<th[^>]*>\s*<\/th>/), "no empty th cells");
assert(!fixedTable.match(/<th[^>]*>&nbsp;<\/th>/), "no nbsp-only th cells");
assert(fixedTable.includes("구분"), "header text preserved");
assert(fixedTable.includes("CS 대행 서비스"), "highlight column preserved");
const normalizedOnly = normalizeMagazineTable(`<table><tr><td></td><th>A</th><th>B</th></tr><tr><td>x</td><td>1</td><td>2</td></tr></table>`);
assert(normalizedOnly.startsWith("<table><thead>"), "normalized thead structure");
assert(!normalizedOnly.includes("<td></td><th>"), "leading phantom cell removed");

const enhanced = enhanceMagazineHtmlSections(styled);
assert(enhanced.includes("magazine-faq-section"), "FAQ section wrapped");
assert(enhanced.includes("🔎 자주 묻는 질문"), "FAQ title normalized");
assert(enhanced.includes("magazine-keytakeaways-section"), "key section wrapped");
assert(enhanced.includes("📌 오늘의 핵심 3가지"), "key title normalized");

const withPlaceholders = insertMagazineVisualPlaceholders(enhanced, sampleSuggestions);
const placeholderCount = (withPlaceholders.match(/magazine-visual-placeholder/g) ?? [])
  .length;
assert(placeholderCount >= 2 && placeholderCount <= 4, "2-4 placeholders inserted");

const faqIdx = withPlaceholders.indexOf("magazine-faq-section");
const firstPhIdx = withPlaceholders.indexOf("magazine-visual-placeholder");
if (faqIdx !== -1 && firstPhIdx !== -1) {
  assert(firstPhIdx < faqIdx, "placeholder before FAQ section");
}

const htmlWithFaqFirst = `<h2>도입</h2><p>본문</p><h2>자주 묻는 질문</h2><p>FAQ</p><h2>오늘의 핵심</h2><p>핵심</p>`;
const forbiddenStart = getMagazinePlaceholderForbiddenStart(htmlWithFaqFirst);
assert(forbiddenStart < htmlWithFaqFirst.length, "forbidden zone detected");
assert(
  withPlaceholders.includes("[시각화 자료 1:"),
  "concise placeholder label"
);

const formatted = formatMagazineHtml(baseHtml, sampleSuggestions);
assert(formatted.includes("magazine-faq-section"), "pipeline includes FAQ");
assert(formatted.includes("magazine-visual-placeholder"), "pipeline includes placeholders");

const rawWithLeak = parseMagazineContent(`제목\n테스트\n\n본문\n[시각화 자료 1: test]`);
const cleanRaw = sanitizeMagazineRaw(rawWithLeak);
assert(!cleanRaw.includes("[시각화 자료"), "raw excludes placeholders");
assert(!cleanRaw.includes("|"), "raw excludes table syntax");

const standalone = buildMagazineStandaloneHtml(formatted, "테스트 제목");
assert(standalone.includes("<!doctype html>"), "standalone html document");
assert(standalone.includes("magazine-preview"), "standalone has preview class");

const fbRaw = `# Facebook 포스트\n---\n본문입니다 🔥\n#태그`;
const fbDisplay = formatSocialContentForDisplay("Facebook", fbRaw);
assert(!fbDisplay.includes("# Facebook"), "fb label removed");
assert(!fbDisplay.includes("---"), "fb separator removed");
const fbStorage = getSocialContentForStorage("Facebook", fbRaw);
assert(!fbStorage.includes("#"), "fb storage no hashtags");
assert(!fbStorage.includes("🔥"), "fb storage no emoji");

console.log("✓ Visual suggestions selected:", selected.length);
console.log("✓ Placeholders inserted:", placeholderCount);
console.log("✓ Table highlight:", MAGAZINE_BRAND_COLOR);
console.log("\nAll magazine HTML format tests passed.");
