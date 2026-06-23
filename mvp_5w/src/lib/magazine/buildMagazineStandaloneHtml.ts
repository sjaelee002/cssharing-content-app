import {
  MAGAZINE_BRAND_COLOR,
  MAGAZINE_FAQ_BG,
  MAGAZINE_KEY_BG,
  MAGAZINE_KEY_BORDER,
  MAGAZINE_TABLE_BORDER,
  MAGAZINE_TABLE_HEADER_BG,
} from "@/lib/magazine/formatMagazineHtml";

export const MAGAZINE_PREVIEW_CSS = `
body {
  margin: 0;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif;
  background: #f9fafb;
  color: #374151;
  line-height: 1.85;
}
.magazine-preview {
  max-width: 800px;
  margin: 0 auto;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 32px 36px;
  font-size: 15px;
}
.magazine-preview h2,
.magazine-preview h3 {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 24px 0 12px;
}
.magazine-preview h2:first-child,
.magazine-preview h3:first-child {
  margin-top: 0;
}
.magazine-preview p {
  margin: 0 0 14px;
}
.magazine-preview ul,
.magazine-preview ol {
  margin: 0 0 14px;
  padding-left: 22px;
}
.magazine-preview blockquote {
  margin: 14px 0;
  padding: 10px 14px;
  border-left: 3px solid ${MAGAZINE_BRAND_COLOR};
  background: #eef9ff;
  border-radius: 0 6px 6px 0;
}
.magazine-preview strong {
  font-weight: 600;
  color: #111827;
}
.magazine-preview .magazine-table-wrapper {
  overflow-x: auto;
  margin: 20px 0;
  -webkit-overflow-scrolling: touch;
}
.magazine-preview table {
  width: 100%;
  border-collapse: collapse;
  margin: 0;
  font-size: 17px;
  line-height: 1.65;
}
.magazine-preview th,
.magazine-preview td {
  border: 1px solid ${MAGAZINE_TABLE_BORDER};
  padding: 18px 20px;
  text-align: left;
  vertical-align: top;
}
.magazine-preview th {
  background: ${MAGAZINE_TABLE_HEADER_BG};
  font-weight: 700;
  color: #1f2937;
}
.magazine-preview td {
  color: #374151;
}
.magazine-preview .magazine-visual-placeholder {
  margin: 20px 0;
  padding: 18px 20px;
  border: 2px dashed #7c3aed;
  border-radius: 8px;
  background: #f5f0ff;
  color: #5b21b6;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.6;
}
.magazine-preview .magazine-faq-section {
  background: ${MAGAZINE_FAQ_BG};
  border: 1px solid #dbeafe;
  border-radius: 10px;
  padding: 22px 24px;
  margin: 28px 0;
}
.magazine-preview .magazine-keytakeaways-section {
  background: ${MAGAZINE_KEY_BG};
  border-left: 4px solid ${MAGAZINE_KEY_BORDER};
  border-radius: 8px;
  padding: 22px 24px;
  margin: 28px 0;
}
`.trim();

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugifyFilename(title: string): string {
  const slug = title
    .trim()
    .slice(0, 40)
    .replace(/[^\w가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return slug || "magazine-preview";
}

/** 브라우저 미리보기용 standalone HTML 문서 */
export function buildMagazineStandaloneHtml(
  magazineContentHtml: string,
  title?: string
): string {
  const pageTitle = escapeHtml(title?.trim() || "홈페이지 매거진 미리보기");
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${pageTitle}</title>
  <style>
${MAGAZINE_PREVIEW_CSS}
  </style>
</head>
<body>
  <article class="magazine-preview">
${magazineContentHtml}
  </article>
</body>
</html>`;
}

export function getMagazineHtmlDownloadFilename(title?: string): string {
  if (title?.trim()) {
    return `${slugifyFilename(title)}-magazine-preview.html`;
  }
  return "magazine-preview.html";
}
