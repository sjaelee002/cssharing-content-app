import type { MagazineParsed } from "@/lib/magazine/types";

type SectionHeader =
  | "제목"
  | "헤드라인"
  | "매거진 제목"
  | "본문"
  | "리드"
  | "기사 본문";

function findSectionIndex(
  lines: string[],
  header: SectionHeader,
  startFrom = 0
): number {
  for (let i = startFrom; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === header || trimmed === `[${header}]`) {
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

function inferTitleFromFirstLine(raw: string): string {
  const firstLine = raw
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return "";
  }

  const withoutMarkdown = firstLine
    .replace(/^#+\s*/, "")
    .replace(/^\*\*(.+)\*\*$/, "$1")
    .trim();

  if (withoutMarkdown.length <= 120) {
    return withoutMarkdown;
  }

  return "";
}

function inferBodyWithoutTitle(raw: string, title: string): string {
  if (!title) {
    return raw.trim();
  }

  const lines = raw.split("\n");
  let skippedTitle = false;
  const bodyLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!skippedTitle && trimmed === title) {
      skippedTitle = true;
      continue;
    }
    if (!skippedTitle && trimmed.replace(/^#+\s*/, "") === title) {
      skippedTitle = true;
      continue;
    }
    bodyLines.push(line);
  }

  return bodyLines.join("\n").trim();
}

export function parseMagazineContent(raw: string): MagazineParsed {
  const lines = raw.split("\n");

  const titleFromSection =
    extractSectionContent(lines, "제목", ["본문", "리드", "기사 본문"]) ||
    extractSectionContent(lines, "헤드라인", ["본문", "리드", "기사 본문"]) ||
    extractSectionContent(lines, "매거진 제목", ["본문", "리드", "기사 본문"]);

  const bodyFromMainSection =
    extractSectionContent(lines, "본문", []) ||
    extractSectionContent(lines, "기사 본문", []);

  const bodyFromLead = extractSectionContent(lines, "리드", [
    "본문",
    "기사 본문",
  ]);

  const title =
    titleFromSection.split("\n")[0]?.trim() || inferTitleFromFirstLine(raw);
  const inferredBody = inferBodyWithoutTitle(raw, title);

  const bodyCandidates = [bodyFromMainSection, bodyFromLead, inferredBody].filter(
    (value) => value.trim().length > 0
  );

  const bodyText = bodyCandidates.reduce(
    (longest, current) =>
      current.length > longest.length ? current : longest,
    ""
  );

  return {
    title,
    bodyText: bodyText || raw.trim(),
  };
}
