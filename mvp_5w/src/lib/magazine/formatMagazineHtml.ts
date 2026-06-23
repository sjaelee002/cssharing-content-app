import type { BlogImageSuggestion } from "@/lib/blog/types";

export const MAGAZINE_BRAND_COLOR = "#2ab2f5";
export const MAGAZINE_TABLE_HEADER_BG = "#f8fafc";
export const MAGAZINE_TABLE_BORDER = "#e5e7eb";
export const MAGAZINE_FAQ_BG = "#f4f8fc";
export const MAGAZINE_KEY_BG = "#f0f4f8";
export const MAGAZINE_KEY_BORDER = "#1e3a5f";

const HIGHLIGHT_COLUMN_KEYWORDS = [
  "CS쉐어링",
  "CS 대행",
  "개선안",
  "권장안",
  "시간제 서비스",
  "AI CX",
];

const INTRO_POSITION_KEYWORDS = ["도입", "서두", "리드", "훅", "앞"];
const COMPARE_TYPE_KEYWORDS = ["비교", "플로우", "구조", "인포", "표", "대조"];
const CHECKLIST_KEYWORDS = ["체크", "요약", "리스트", "가이드", "단계"];
const CTA_POSITION_KEYWORDS = ["CTA", "마무리", "결론", "하단", "끝"];

const PLACEHOLDER_FORBIDDEN_HEADING_KEYWORDS = [
  "자주 묻는 질문",
  "FAQ",
  "오늘의 핵심",
  "핵심 3가지",
  "문의",
  "상담",
  "CTA",
];

function headingTextIsForbidden(text: string): boolean {
  const normalized = text.replace(/<[^>]+>/g, "").trim();
  return PLACEHOLDER_FORBIDDEN_HEADING_KEYWORDS.some((kw) =>
    normalized.includes(kw)
  );
}

/** FAQ/오늘의 핵심/CTA 이전까지만 placeholder 삽입 허용 */
export function getMagazinePlaceholderForbiddenStart(html: string): number {
  let earliest = html.length;

  const headingRegex = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(html)) !== null) {
    if (headingTextIsForbidden(match[1])) {
      earliest = Math.min(earliest, match.index);
    }
  }

  const sectionMarkers = [
    'class="magazine-faq-section"',
    'class="magazine-keytakeaways-section"',
  ];
  for (const marker of sectionMarkers) {
    const idx = html.indexOf(marker);
    if (idx !== -1) {
      earliest = Math.min(earliest, idx);
    }
  }

  return earliest;
}

function isAllowedInsertIndex(html: string, index: number, forbiddenStart: number): boolean {
  if (index >= forbiddenStart) {
    return false;
  }
  const before = html.slice(0, index);
  const lastH2 = before.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi);
  if (lastH2?.length) {
    const lastHeading = lastH2[lastH2.length - 1];
    const inner = lastHeading.replace(/<\/?h2[^>]*>/gi, "");
    if (headingTextIsForbidden(inner)) {
      return false;
    }
  }
  return true;
}

function scoreSuggestion(
  suggestion: BlogImageSuggestion,
  bucket: "intro" | "compare" | "checklist" | "cta"
): number {
  const position = suggestion.position.toLowerCase();
  const imageType = suggestion.imageType.toLowerCase();
  const description = suggestion.description.toLowerCase();
  const combined = `${position} ${imageType} ${description}`;

  const keywords: Record<typeof bucket, string[]> = {
    intro: INTRO_POSITION_KEYWORDS,
    compare: COMPARE_TYPE_KEYWORDS,
    checklist: CHECKLIST_KEYWORDS,
    cta: CTA_POSITION_KEYWORDS,
  };

  return keywords[bucket].reduce(
    (score, kw) => (combined.includes(kw) ? score + 2 : score),
    0
  );
}

function pickBestForBucket(
  suggestions: BlogImageSuggestion[],
  used: Set<number>,
  bucket: "intro" | "compare" | "checklist" | "cta"
): BlogImageSuggestion | null {
  let best: BlogImageSuggestion | null = null;
  let bestScore = 0;

  for (const s of suggestions) {
    if (used.has(s.index)) {
      continue;
    }
    const sScore = scoreSuggestion(s, bucket);
    if (sScore > bestScore) {
      bestScore = sScore;
      best = s;
    }
  }

  if (best) {
    return best;
  }

  return suggestions.find((s) => !used.has(s.index)) ?? null;
}

/** blog imageSuggestions에서 매거진용 2~4개 선별 (기본 3개) */
export function selectMagazineVisualSuggestions(
  suggestions: BlogImageSuggestion[],
  count = 3
): BlogImageSuggestion[] {
  if (!suggestions.length) {
    return [];
  }

  const target = Math.min(Math.max(count, 2), 4, suggestions.length);
  const used = new Set<number>();
  const selected: BlogImageSuggestion[] = [];
  const buckets: Array<"intro" | "compare" | "checklist" | "cta"> = [
    "intro",
    "compare",
    "checklist",
    "cta",
  ];

  for (const bucket of buckets) {
    if (selected.length >= target) {
      break;
    }
    const pick = pickBestForBucket(suggestions, used, bucket);
    if (pick) {
      selected.push(pick);
      used.add(pick.index);
    }
  }

  for (const s of suggestions) {
    if (selected.length >= target) {
      break;
    }
    if (!used.has(s.index)) {
      selected.push(s);
      used.add(s.index);
    }
  }

  return selected.slice(0, target);
}

function buildPlaceholderLabel(
  index: number,
  suggestion: BlogImageSuggestion
): string {
  const title = suggestion.description.trim() || `시각화 자료 ${index}`;
  const type = suggestion.imageType.trim() || "인포그래픽";
  const caption = suggestion.captionKeywords.trim() || title;
  return `[시각화 자료 ${index}: ${title} / 유형: ${type} / 캡션: ${caption}]`;
}

function buildPlaceholderHtml(index: number, suggestion: BlogImageSuggestion): string {
  const label = buildPlaceholderLabel(index, suggestion);
  return `<div class="magazine-visual-placeholder" style="margin:20px 0;padding:18px 20px;border:2px dashed #7c3aed;border-radius:8px;background:#f5f0ff;color:#5b21b6;font-size:13px;font-weight:500;line-height:1.6;">${label}</div>`;
}

function findSectionSplitIndices(html: string): number[] {
  const indices: number[] = [];
  const h2Regex = /<h2[^>]*>[\s\S]*?<\/h2>/gi;
  let match: RegExpExecArray | null;
  while ((match = h2Regex.exec(html)) !== null) {
    indices.push(match.index + match[0].length);
  }
  return indices;
}

/** LLM HTML 이후 시각화 placeholder를 deterministic 삽입 (FAQ/핵심/CTA 구간 제외) */
export function insertMagazineVisualPlaceholders(
  html: string,
  suggestions: BlogImageSuggestion[]
): string {
  const selected = selectMagazineVisualSuggestions(suggestions, 3);
  if (!selected.length) {
    return html;
  }

  const forbiddenStart = getMagazinePlaceholderForbiddenStart(html);
  const placeholders = selected.map((s, i) =>
    buildPlaceholderHtml(i + 1, s)
  );

  const splitPoints = findSectionSplitIndices(html).filter((idx) =>
    isAllowedInsertIndex(html, idx, forbiddenStart)
  );
  const insertPositions: number[] = [];

  if (splitPoints.length >= 1) {
    insertPositions.push(splitPoints[0]);
    if (splitPoints.length >= 2 && placeholders.length >= 2) {
      insertPositions.push(
        splitPoints[Math.floor((splitPoints.length - 1) / 2) + 1] ??
          splitPoints[1]
      );
    }
    if (splitPoints.length >= 3 && placeholders.length >= 3) {
      insertPositions.push(splitPoints[splitPoints.length - 1]);
    }
  }

  if (insertPositions.length < placeholders.length) {
    const pRegex = /<\/p>/gi;
    const pEnds: number[] = [];
    let pMatch: RegExpExecArray | null;
    while ((pMatch = pRegex.exec(html)) !== null) {
      const end = pMatch.index + pMatch[0].length;
      if (isAllowedInsertIndex(html, end, forbiddenStart)) {
        pEnds.push(end);
      }
    }
    if (pEnds.length >= 2) {
      if (!insertPositions.length) {
        insertPositions.push(pEnds[0]);
      }
      if (insertPositions.length < 2 && pEnds.length >= 2) {
        insertPositions.push(pEnds[Math.floor(pEnds.length / 3)]);
      }
      if (insertPositions.length < 3 && pEnds.length >= 3) {
        insertPositions.push(pEnds[Math.floor((pEnds.length * 2) / 3)]);
      }
    }
  }

  const uniquePositions = [...new Set(insertPositions)]
    .sort((a, b) => b - a)
    .slice(0, Math.max(2, Math.min(placeholders.length, 4)));

  if (!uniquePositions.length) {
    return html;
  }

  const count = Math.min(uniquePositions.length, placeholders.length);
  let result = html;
  const insertions = uniquePositions
    .slice(0, count)
    .map((pos, i) => ({ pos, html: placeholders[i] }))
    .sort((a, b) => b.pos - a.pos);

  for (const { pos, html: ph } of insertions) {
    result = result.slice(0, pos) + ph + result.slice(pos);
  }

  return result;
}

function cellContainsHighlight(text: string): boolean {
  const normalized = text.replace(/<[^>]+>/g, "").trim();
  return HIGHLIGHT_COLUMN_KEYWORDS.some((kw) => normalized.includes(kw));
}

type TableCell = { tag: "th" | "td"; inner: string };

function stripCellText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isEmptyCellContent(inner: string): boolean {
  return stripCellText(inner).length === 0;
}

function parseTableRowCells(rowHtml: string): TableCell[] {
  const cells: TableCell[] = [];
  const cellRegex = /<(th|td)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = cellRegex.exec(rowHtml)) !== null) {
    cells.push({
      tag: match[1].toLowerCase() as "th" | "td",
      inner: match[2].trim(),
    });
  }
  return cells;
}

function parseTableRows(tableHtml: string): TableCell[][] {
  const rows: TableCell[][] = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match: RegExpExecArray | null;
  while ((match = trRegex.exec(tableHtml)) !== null) {
    const cells = parseTableRowCells(match[1]);
    if (cells.length > 0) {
      rows.push(cells);
    }
  }
  return rows;
}

function isPhantomRow(row: TableCell[]): boolean {
  if (!row.length) {
    return true;
  }
  if (row.length === 1 && isEmptyCellContent(row[0].inner)) {
    return true;
  }
  return row.every((cell) => isEmptyCellContent(cell.inner));
}

function trimLeadingEmptyCells(row: TableCell[]): TableCell[] {
  const copy = [...row];
  while (copy.length > 1 && isEmptyCellContent(copy[0].inner)) {
    copy.shift();
  }
  return copy;
}

function escapeCellInner(inner: string): string {
  return inner.trim() || "&nbsp;";
}

/** LLM table HTML을 thead/tbody 구조로 정규화 */
export function normalizeMagazineTable(tableHtml: string): string {
  let rows = parseTableRows(tableHtml);

  rows = rows.filter((row) => !isPhantomRow(row));

  while (rows.length > 0 && isPhantomRow(rows[0])) {
    rows.shift();
  }

  if (!rows.length) {
    return "";
  }

  rows = rows
    .map(trimLeadingEmptyCells)
    .filter((row) => row.length > 0 && !isPhantomRow(row));

  if (!rows.length) {
    return "";
  }

  const colCount = Math.max(...rows.map((row) => row.length));

  rows = rows.map((row) => {
    const normalized = [...row];
    while (normalized.length < colCount) {
      normalized.push({ tag: "td", inner: "" });
    }
    return normalized.slice(0, colCount);
  });

  const headerCells = rows[0].map((cell) => ({
    tag: "th" as const,
    inner: cell.inner,
  }));

  const bodyRows = rows.slice(1).map((row) =>
    row.map((cell) => ({
      tag: "td" as const,
      inner: cell.inner,
    }))
  );

  const thead = `<thead><tr>${headerCells
    .map(
      (cell) =>
        `<th>${escapeCellInner(cell.inner)}</th>`
    )
    .join("")}</tr></thead>`;

  const tbody =
    bodyRows.length > 0
      ? `<tbody>${bodyRows
          .map(
            (row) =>
              `<tr>${row
                .map((cell) => `<td>${escapeCellInner(cell.inner)}</td>`)
                .join("")}</tr>`
          )
          .join("")}</tbody>`
      : "";

  return `<table>${thead}${tbody}</table>`;
}

const TABLE_BASE_STYLE =
  "width:100%;border-collapse:collapse;margin:0;font-size:17px;line-height:1.65;color:#374151;";
const TABLE_WRAPPER_STYLE = "overflow-x:auto;margin:20px 0;-webkit-overflow-scrolling:touch;";
const TH_BASE_STYLE = `border:1px solid ${MAGAZINE_TABLE_BORDER};padding:18px 20px;background:${MAGAZINE_TABLE_HEADER_BG};font-weight:700;text-align:left;vertical-align:top;color:#1f2937;`;
const TD_BASE_STYLE = `border:1px solid ${MAGAZINE_TABLE_BORDER};padding:18px 20px;vertical-align:top;color:#374151;`;

/** table 정규화 + inline style + CS쉐어링 컬럼 하이라이트 */
export function styleMagazineTables(html: string): string {
  let tableCount = 0;

  return html.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, (tableHtml) => {
    tableCount += 1;
    if (tableCount > 1) {
      return "";
    }

    const normalized = normalizeMagazineTable(tableHtml);
    if (!normalized) {
      return "";
    }

    const headerCells = [
      ...normalized.matchAll(/<th(?:\s[^>]*)?>([\s\S]*?)<\/th>/gi),
    ];
    let highlightColIndex = -1;
    headerCells.forEach((match, idx) => {
      if (cellContainsHighlight(match[1])) {
        highlightColIndex = idx;
      }
    });
    if (highlightColIndex === -1 && headerCells.length > 1) {
      highlightColIndex = headerCells.length - 1;
    }

    let styled = normalized.replace(
      /<table>/i,
      `<table style="${TABLE_BASE_STYLE}">`
    );

    let thIndex = 0;
    styled = styled.replace(
      /<th(?:\s[^>]*)?>([\s\S]*?)<\/th>/gi,
      (_match, inner) => {
        const isHighlight =
          highlightColIndex >= 0 && thIndex === highlightColIndex;
        thIndex += 1;
        const highlightStyle = isHighlight
          ? `color:${MAGAZINE_BRAND_COLOR};`
          : "";
        return `<th style="${TH_BASE_STYLE}${highlightStyle}">${inner}</th>`;
      }
    );

    styled = styled.replace(
      /<tr[^>]*>([\s\S]*?)<\/tr>/gi,
      (trMatch, trContent) => {
        if (!/<td(?:\s|>)/i.test(trContent)) {
          return trMatch;
        }
        let colIndex = 0;
        const newContent = trContent.replace(
          /<td(?:\s[^>]*)?>([\s\S]*?)<\/td>/gi,
          (_tdMatch: string, tdInner: string) => {
            const isHighlight =
              highlightColIndex >= 0 && colIndex === highlightColIndex;
            colIndex += 1;
            const highlightStyle = isHighlight
              ? `color:${MAGAZINE_BRAND_COLOR};font-weight:700;`
              : "";
            return `<td style="${TD_BASE_STYLE}${highlightStyle}">${tdInner}</td>`;
          }
        );
        return trMatch.replace(trContent, newContent);
      }
    );

    return `<div class="magazine-table-wrapper" style="${TABLE_WRAPPER_STYLE}">${styled}</div>`;
  });
}

function wrapSection(
  html: string,
  pattern: RegExp,
  wrapperClass: string,
  wrapperStyle: string,
  normalizedTitle: string
): string {
  return html.replace(pattern, (_match, headingTag, body) => {
    const heading = `<${headingTag} style="font-size:18px;font-weight:700;margin:0 0 16px;color:inherit;">${normalizedTitle}</${headingTag}>`;
    return `<div class="${wrapperClass}" style="${wrapperStyle}">${heading}${body}</div>`;
  });
}

function styleFaqBody(body: string): string {
  let result = body;

  result = result.replace(
    /<h3[^>]*>([^<]+)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi,
    (_m, question, answer) => {
      const answerText = answer.trim();
      const withCheck = answerText.startsWith("✅")
        ? answerText
        : `✅ ${answerText}`;
      return `<p style="margin:0 0 14px;"><strong style="display:block;margin-bottom:6px;color:#1f2937;">${question.trim()}</strong><span style="color:#374151;line-height:1.7;">${withCheck}</span></p>`;
    }
  );

  result = result.replace(
    /<p[^>]*><strong>([^<]+)<\/strong><\/p>\s*<p[^>]*>([\s\S]*?)<\/p>/gi,
    (_m, question, answer) => {
      const answerText = answer.replace(/<[^>]+>/g, "").trim();
      const withCheck = answerText.startsWith("✅")
        ? answerText
        : `✅ ${answerText}`;
      return `<p style="margin:0 0 14px;"><strong style="display:block;margin-bottom:6px;color:#1f2937;">${question.trim()}</strong><span style="color:#374151;line-height:1.7;">${withCheck}</span></p>`;
    }
  );

  return result;
}

function styleKeyTakeawayBody(body: string): string {
  return body.replace(
    /<p[^>]*>([\s\S]*?)<\/p>/gi,
    (match, content) => {
      const text = content.replace(/<[^>]+>/g, "").trim();
      if (/^[1-3]️⃣/.test(text) || /^[1-3][.)]\s/.test(text)) {
        return `<p style="margin:0 0 10px;line-height:1.7;color:#1f2937;">${content}</p>`;
      }
      return match;
    }
  );
}

/** FAQ / 오늘의 핵심 섹션 heading 기반 스타일 후처리 */
export function enhanceMagazineHtmlSections(html: string): string {
  let result = html;

  const faqPattern =
    /<(h[23])[^>]*>[^<]*자주\s*묻는\s*질문[^<]*<\/\1>([\s\S]*?)(?=<div class="magazine-keytakeaways-section"|<h2|$)/i;
  result = wrapSection(
    result,
    faqPattern,
    "magazine-faq-section",
    `background:${MAGAZINE_FAQ_BG};border:1px solid #dbeafe;border-radius:10px;padding:22px 24px;margin:28px 0;`,
    "🔎 자주 묻는 질문"
  );

  result = result.replace(
    /(<div class="magazine-faq-section"[^>]*>[\s\S]*?<\/h[23]>)([\s\S]*?)(<\/div>)/i,
    (_m, head, body, close) => `${head}${styleFaqBody(body)}${close}`
  );

  const keyPattern =
    /<(h[23])[^>]*>[^<]*오늘의\s*핵심[^<]*<\/\1>([\s\S]*?)(?=<h2|$)/i;
  result = wrapSection(
    result,
    keyPattern,
    "magazine-keytakeaways-section",
    `background:${MAGAZINE_KEY_BG};border-left:4px solid ${MAGAZINE_KEY_BORDER};border-radius:8px;padding:22px 24px;margin:28px 0;`,
    "📌 오늘의 핵심 3가지"
  );

  result = result.replace(
    /(<div class="magazine-keytakeaways-section"[^>]*>[\s\S]*?<\/h[23]>)([\s\S]*?)(<\/div>)/i,
    (_m, head, body, close) => `${head}${styleKeyTakeawayBody(body)}${close}`
  );

  return result;
}

/** LLM HTML 후처리 파이프라인 */
export function formatMagazineHtml(
  html: string,
  visualSuggestions: BlogImageSuggestion[] = []
): string {
  let result = html.trim();
  result = styleMagazineTables(result);
  result = enhanceMagazineHtmlSections(result);
  result = insertMagazineVisualPlaceholders(result, visualSuggestions);
  return result;
}
