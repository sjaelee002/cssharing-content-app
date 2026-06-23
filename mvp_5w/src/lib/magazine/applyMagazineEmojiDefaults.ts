/** Magazine raw에 허용 이모티콘 deterministic 보정 (LLM 누락 대비) */

const FAQ_HEADING_PATTERN =
  /^(#{1,6}\s*)?(🔎\s*)?(자주\s*묻는\s*질문[^\n]*)$/gim;
const KEY_HEADING_PATTERN =
  /^(#{1,6}\s*)?(📌\s*)?(오늘의\s*핵심\s*3가지[^\n]*)$/gim;

function normalizeFaqHeading(text: string): string {
  return text.replace(FAQ_HEADING_PATTERN, "🔎 자주 묻는 질문");
}

function normalizeKeyHeading(text: string): string {
  return text.replace(KEY_HEADING_PATTERN, "📌 오늘의 핵심 3가지");
}

function normalizeKeyItems(text: string): string {
  const lines = text.split("\n");
  let inKeySection = false;
  let itemIndex = 0;

  const normalized = lines.map((line) => {
    if (/오늘의\s*핵심/.test(line)) {
      inKeySection = true;
      return line;
    }

    if (!inKeySection || itemIndex >= 3) {
      return line;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      return line;
    }

    const numberedMatch = trimmed.match(/^([1-3])[.)]\s+(.+)$/);
    const emojiMatch = trimmed.match(/^([1-3])️⃣\s*(.+)$/);

    if (numberedMatch || emojiMatch) {
      const emojis = ["1️⃣", "2️⃣", "3️⃣"] as const;
      const content = numberedMatch?.[2] ?? emojiMatch?.[2] ?? trimmed;
      itemIndex += 1;
      return `${emojis[itemIndex - 1]} ${content}`;
    }

    return line;
  });

  return normalized.join("\n");
}

function normalizeFaqAnswers(text: string): string {
  const lines = text.split("\n");
  let inFaq = false;
  let expectAnswer = false;

  return lines
    .map((line) => {
      if (/자주\s*묻는\s*질문/.test(line)) {
        inFaq = true;
        expectAnswer = false;
        return line;
      }
      if (/오늘의\s*핵심/.test(line)) {
        inFaq = false;
        expectAnswer = false;
        return line;
      }
      if (!inFaq) {
        return line;
      }

      const trimmed = line.trim();
      if (!trimmed) {
        expectAnswer = false;
        return line;
      }

      if (trimmed.endsWith("?") || trimmed.endsWith("？")) {
        expectAnswer = true;
        return line;
      }

      if (expectAnswer && !trimmed.startsWith("✅")) {
        expectAnswer = false;
        return `✅ ${trimmed}`;
      }

      expectAnswer = false;
      return line;
    })
    .join("\n");
}

/** LLM 출력 후 sanitize 직전/직후에 적용 */
export function applyMagazineEmojiDefaults(text: string): string {
  let result = text;
  result = normalizeFaqHeading(result);
  result = normalizeKeyHeading(result);
  result = normalizeFaqAnswers(result);
  result = normalizeKeyItems(result);
  return result;
}
