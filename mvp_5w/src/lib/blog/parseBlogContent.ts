import type { BlogImageSuggestion, BlogParsed } from "@/lib/blog/types";

type SectionHeader =
  | "제목"
  | "본문"
  | "추천 태그"
  | "대체 제목"
  | "이미지 삽입 제안";

function findSectionIndex(
  lines: string[],
  header: SectionHeader,
  startFrom = 0
): number {
  for (let i = startFrom; i < lines.length; i++) {
    if (lines[i].trim() === header) {
      return i;
    }
  }
  return -1;
}

function extractSectionContent(
  lines: string[],
  header: SectionHeader,
  nextHeaders: SectionHeader[]
): string {
  const startIdx = findSectionIndex(lines, header);
  if (startIdx === -1) {
    return "";
  }

  let endIdx = lines.length;
  for (const next of nextHeaders) {
    const idx = findSectionIndex(lines, next, startIdx + 1);
    if (idx !== -1 && idx < endIdx) {
      endIdx = idx;
    }
  }

  return lines
    .slice(startIdx + 1, endIdx)
    .join("\n")
    .trim();
}

function parseTags(content: string): string[] {
  if (!content) {
    return [];
  }
  return content
    .split(/[\n,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t}`));
}

function parseAlternateTitles(content: string): string[] {
  if (!content) {
    return [];
  }
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[A-Z]\s*[:：]\s*/, ""));
}

function parseImageTable(content: string): BlogImageSuggestion[] {
  if (!content) {
    return [];
  }

  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|") && !l.match(/^\|[\s\-:|]+\|$/));

  const suggestions: BlogImageSuggestion[] = [];

  for (const line of lines) {
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((c, i, arr) => !(i === 0 && c === "") && !(i === arr.length - 1 && c === ""));

    if (cells.length < 2) {
      continue;
    }

    const headerLike = cells.some((c) =>
      ["위치", "유형", "이미지 내용", "캡션"].some((h) => c.includes(h))
    );
    if (headerLike) {
      continue;
    }

    suggestions.push({
      index: suggestions.length + 1,
      position: cells[0] || "",
      imageType: cells[1] || "",
      description: cells[2] || cells[1] || "",
      captionKeywords: cells[3] || cells[cells.length - 1] || "",
    });
  }

  if (suggestions.length === 0) {
    const bulletLines = content
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("-") || l.startsWith("•") || /^\d+\./.test(l));

    for (const line of bulletLines) {
      const cleaned = line.replace(/^[-•]\s*/, "").replace(/^\d+\.\s*/, "");
      suggestions.push({
        index: suggestions.length + 1,
        position: "",
        imageType: "",
        description: cleaned,
        captionKeywords: "",
      });
    }
  }

  return suggestions;
}

function extractSelfCheck(raw: string, afterImageSection: string): string {
  const selfCheckMatch = raw.match(/\[자기점검\][\s\S]*/);
  if (selfCheckMatch) {
    return selfCheckMatch[0].trim();
  }

  const lines = afterImageSection.split("\n");
  const selfCheckLines: string[] = [];
  let found = false;

  for (const line of lines) {
    if (line.includes("[자기점검]") || line.includes("자기점검")) {
      found = true;
    }
    if (found) {
      selfCheckLines.push(line);
    }
  }

  return selfCheckLines.join("\n").trim();
}

export function parseBlogContent(raw: string): BlogParsed {
  const lines = raw.split("\n");

  const mainTitle = extractSectionContent(lines, "제목", [
    "본문",
    "추천 태그",
    "대체 제목",
    "이미지 삽입 제안",
  ]);

  const bodyText = extractSectionContent(lines, "본문", [
    "추천 태그",
    "대체 제목",
    "이미지 삽입 제안",
  ]);

  const tagsContent = extractSectionContent(lines, "추천 태그", [
    "대체 제목",
    "이미지 삽입 제안",
  ]);

  const altTitlesContent = extractSectionContent(lines, "대체 제목", [
    "이미지 삽입 제안",
  ]);

  const imageContent = extractSectionContent(lines, "이미지 삽입 제안", []);

  const selfCheckText = extractSelfCheck(raw, imageContent);

  return {
    mainTitle: mainTitle.split("\n")[0]?.trim() || mainTitle.trim(),
    bodyText: bodyText.replace(/\[자기점검\][\s\S]*/, "").trim(),
    recommendedTags: parseTags(tagsContent),
    alternateTitles: parseAlternateTitles(altTitlesContent),
    imageSuggestions: parseImageTable(imageContent),
    selfCheckText,
  };
}
