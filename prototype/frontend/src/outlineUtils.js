export const EMPTY_OUTLINE = {
  title_candidates: [],
  recommended_title: "",
  primary_keyword: "",
  secondary_keywords: [],
  content_type: "",
  search_intent: "",
  target_reader_summary: "",
  opening_hook: "",
  core_message: "",
  flow_summary: "",
  sections: [],
  checklist_candidates: [],
  faq_candidates: [],
  cta_block: {
    cta_heading: "",
    cta_message: "",
    cta_type: "",
  },
  avoid_notes: [],
};

export function cleanJsonText(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7).trim();
  if (cleaned.startsWith("```")) cleaned = cleaned.slice(3).trim();
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3).trim();
  return cleaned;
}

export function normalizeOutline(data) {
  const sections = Array.isArray(data.sections)
    ? data.sections.map((section, index) => ({
        order: section.order ?? index + 1,
        heading: section.heading || "",
        section_role: section.section_role || "",
        key_points: Array.isArray(section.key_points) ? section.key_points : [],
      }))
    : [];

  const faqCandidates = Array.isArray(data.faq_candidates)
    ? data.faq_candidates.map((faq) => ({
        question: faq.question || "",
        answer_direction: faq.answer_direction || "",
      }))
    : [];

  return {
    ...EMPTY_OUTLINE,
    ...data,
    title_candidates: Array.isArray(data.title_candidates) ? data.title_candidates : [],
    secondary_keywords: Array.isArray(data.secondary_keywords) ? data.secondary_keywords : [],
    sections,
    checklist_candidates: Array.isArray(data.checklist_candidates)
      ? data.checklist_candidates
      : [],
    faq_candidates: faqCandidates,
    cta_block: {
      ...EMPTY_OUTLINE.cta_block,
      ...(data.cta_block || {}),
    },
    avoid_notes: Array.isArray(data.avoid_notes) ? data.avoid_notes : [],
  };
}

export function parseOutlineText(text) {
  const cleaned = cleanJsonText(text);

  try {
    const parsed = JSON.parse(cleaned);
    return {
      object: normalizeOutline(parsed),
      raw: cleaned,
      warning: "",
    };
  } catch {
    return {
      object: null,
      raw: text,
      warning: "Outline JSON 파싱에 실패했습니다. Advanced JSON에서 수정 후 Apply하세요.",
    };
  }
}

export function outlineToJson(outline) {
  return JSON.stringify(outline, null, 2);
}

export function outlineToPlainText(outline) {
  const lines = [];

  if (outline.recommended_title) {
    lines.push(outline.recommended_title);
    lines.push("");
  }

  if (outline.title_candidates?.length) {
    lines.push("[제목 후보]");
    outline.title_candidates.forEach((title) => lines.push(`- ${title}`));
    lines.push("");
  }

  const summaryFields = [
    ["검색 의도", outline.search_intent],
    ["타겟 독자", outline.target_reader_summary],
    ["도입 훅", outline.opening_hook],
    ["핵심 메시지", outline.core_message],
    ["흐름 요약", outline.flow_summary],
  ];

  summaryFields.forEach(([label, value]) => {
    if (value) {
      lines.push(`[${label}]`);
      lines.push(value);
      lines.push("");
    }
  });

  if (outline.sections?.length) {
    lines.push("[섹션]");
    outline.sections.forEach((section) => {
      lines.push(`${section.order}. ${section.heading}`);
      if (section.section_role) lines.push(section.section_role);
      section.key_points?.forEach((point) => lines.push(`- ${point}`));
      lines.push("");
    });
  }

  if (outline.checklist_candidates?.length) {
    lines.push("[체크리스트]");
    outline.checklist_candidates.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }

  if (outline.faq_candidates?.length) {
    lines.push("[FAQ]");
    outline.faq_candidates.forEach((faq) => {
      lines.push(`Q. ${faq.question}`);
      if (faq.answer_direction) lines.push(`A. ${faq.answer_direction}`);
    });
    lines.push("");
  }

  if (outline.cta_block) {
    const { cta_heading, cta_message, cta_type } = outline.cta_block;
    if (cta_heading || cta_message || cta_type) {
      lines.push("[CTA]");
      if (cta_heading) lines.push(cta_heading);
      if (cta_message) lines.push(cta_message);
      if (cta_type) lines.push(`유형: ${cta_type}`);
      lines.push("");
    }
  }

  if (outline.avoid_notes?.length) {
    lines.push("[주의 사항]");
    outline.avoid_notes.forEach((note) => lines.push(`- ${note}`));
  }

  return lines.join("\n").trim();
}
