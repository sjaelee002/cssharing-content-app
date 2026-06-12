import { useEffect, useState } from "react";
import {
  generateHomepageMagazineOutline,
  generateLinkedinOutline,
  generateMasterBrief,
  generateMetaSocialOutline,
  generateNaverBlogOutline,
  getApiKeyStatus,
} from "./api.js";
import {
  outlineToJson,
  outlineToPlainText,
  parseOutlineText,
} from "./outlineUtils.js";

const STEPS = [
  { id: "input", label: "1. 입력" },
  { id: "master-brief", label: "2. Master Brief" },
  { id: "channel-outline", label: "3. 채널별 Outline" },
];

const CHANNEL_IDS = ["naver_blog", "homepage_magazine", "linkedin", "meta_social"];

const CHANNEL_CONFIG = {
  naver_blog: {
    label: "네이버 블로그",
    buttonLabel: "네이버 블로그 아웃라인 생성",
    angleField: null,
  },
  homepage_magazine: {
    label: "홈페이지 매거진",
    buttonLabel: "홈페이지 매거진 아웃라인 생성",
    angleField: "editorial_angle",
  },
  linkedin: {
    label: "LinkedIn",
    buttonLabel: "LinkedIn 아웃라인 생성",
    angleField: "linkedin_angle",
  },
  meta_social: {
    label: "Meta Social",
    buttonLabel: "Meta Social 아웃라인 생성",
    angleField: "social_angle",
  },
};

const EMPTY_CHANNEL_OUTLINE = {
  object: null,
  raw: "",
  error: "",
  warning: "",
  loading: false,
  jsonDraft: null,
  jsonError: "",
  copyMessage: "",
};

function createInitialChannelOutlines() {
  return CHANNEL_IDS.reduce((acc, channelId) => {
    acc[channelId] = { ...EMPTY_CHANNEL_OUTLINE };
    return acc;
  }, {});
}

const RECOMMENDED_SOLUTION = "AI CX 풀서비스";

const SOLUTION_GROUPS = [
  {
    label: "CS대행 서비스",
    options: [
      "CS 토탈서비스",
      "CS 전담 서비스",
      "CS 쉐어링 서비스",
      "CS 시간제 서비스",
    ],
  },
  {
    label: "프리미엄(CX) 서비스",
    options: [
      "운영 진단 서비스",
      "리뷰 관리 서비스",
      "VOC 관리 서비스",
      "상담품질 관리 서비스",
      "챗봇 설계 서비스",
      "CX 리포팅 서비스",
    ],
  },
  {
    label: "AI CS 솔루션",
    options: ["OASIS AICC+IPCC", "AI VOC", "AI StandBy"],
  },
];

const CONTENT_TYPES = [
  "개념정의형",
  "비교형",
  "문제해결형",
  "특정 산업 겨냥형",
  "비용/리스크 진단형",
  "솔루션 소개형",
  "오해반박형",
];

const CTA_TYPES = [
  "운영구조 상담",
  "빠른견적받기",
  "AI CX 풀서비스 문의",
  "CX 리포트 문의",
];

const EMPTY_MASTER_BRIEF = {
  topic: "",
  target_reader: "",
  primary_keyword: "",
  secondary_keywords: [],
  content_type: "",
  core_problem: "",
  reader_context: "",
  misconception: "",
  structural_cause: "",
  core_message: "",
  solution_links: [],
  cta_direction: "",
  inferred_inputs: {
    reader_situations: [],
    misconception: "",
    structural_cause: "",
    content_goal: "",
    cta_direction: "",
  },
  channel_strategy: {
    naver_blog: "",
    homepage_magazine: "",
    meta_social: "",
    linkedin: "",
  },
  avoid_notes: [],
};

const INITIAL_FORM = {
  topic: "",
  target_reader: "",
  main_keywords: "",
  content_type: "문제해결형",
  target_industry: "",
  solution_links: [],
  reader_situations: "",
  misconception_to_refute: "",
  structural_cause: "",
  content_goal: "",
  cta_type: "운영구조 상담",
  section_count: "",
};

function parseListField(value) {
  if (!value || !value.trim()) {
    return [];
  }
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function arrayToText(value) {
  return Array.isArray(value) ? value.join("\n") : "";
}

function validateSectionCount(value) {
  if (!value || !String(value).trim()) {
    return "";
  }
  const count = Number(value);
  if (!Number.isInteger(count) || count < 4 || count > 6) {
    return "섹션 수는 4~6 사이의 정수만 입력할 수 있습니다. 비워두면 기본값 5가 적용됩니다.";
  }
  return "";
}

function buildUserInput(form) {
  const userInput = {
    topic: form.topic.trim(),
    content_type: form.content_type,
    include_checklist: true,
    include_faq: true,
  };

  const targetReader = form.target_reader.trim();
  if (targetReader) userInput.target_reader = targetReader;

  const mainKeywords = parseListField(form.main_keywords);
  if (mainKeywords.length > 0) userInput.main_keywords = mainKeywords;

  const targetIndustry = form.target_industry.trim();
  if (targetIndustry) userInput.target_industry = targetIndustry;

  if (form.solution_links.length > 0) {
    userInput.solution_links = form.solution_links;
    userInput.solution_link = form.solution_links.join(", ");
  }

  const readerSituations = parseListField(form.reader_situations);
  if (readerSituations.length > 0) userInput.reader_situations = readerSituations;

  const misconception = form.misconception_to_refute.trim();
  if (misconception) userInput.misconception_to_refute = misconception;

  const structuralCause = form.structural_cause.trim();
  if (structuralCause) userInput.structural_cause = structuralCause;

  const contentGoal = form.content_goal.trim();
  if (contentGoal) userInput.content_goal = contentGoal;

  if (form.cta_type) userInput.cta_type = form.cta_type;

  if (form.section_count.trim()) {
    userInput.section_count = Number(form.section_count);
  }

  return userInput;
}

function normalizeMasterBrief(data) {
  return {
    ...EMPTY_MASTER_BRIEF,
    ...data,
    inferred_inputs: {
      ...EMPTY_MASTER_BRIEF.inferred_inputs,
      ...(data.inferred_inputs || {}),
    },
    channel_strategy: {
      ...EMPTY_MASTER_BRIEF.channel_strategy,
      ...(data.channel_strategy || {}),
      meta_social:
        data.channel_strategy?.meta_social || data.channel_strategy?.social_card || "",
    },
    secondary_keywords: Array.isArray(data.secondary_keywords) ? data.secondary_keywords : [],
    solution_links: Array.isArray(data.solution_links) ? data.solution_links : [],
    avoid_notes: Array.isArray(data.avoid_notes) ? data.avoid_notes : [],
  };
}

function parseMasterBriefText(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7).trim();
  if (cleaned.startsWith("```")) cleaned = cleaned.slice(3).trim();
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3).trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      object: normalizeMasterBrief(parsed),
      raw: cleaned,
      warning: "",
    };
  } catch {
    return {
      object: null,
      raw: text,
      warning: "Master Brief JSON 파싱에 실패했습니다. Advanced JSON에서 직접 수정하세요.",
    };
  }
}

function masterBriefToJson(masterBrief) {
  return JSON.stringify(masterBrief, null, 2);
}

function parseChannelOutlineText(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7).trim();
  if (cleaned.startsWith("```")) cleaned = cleaned.slice(3).trim();
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3).trim();

  try {
    const parsed = JSON.parse(cleaned);
    return { object: parsed, raw: cleaned, warning: "" };
  } catch {
    return {
      object: null,
      raw: text,
      warning: "Outline JSON 파싱에 실패했습니다. Advanced JSON에서 수정 후 Apply하세요.",
    };
  }
}

export default function App() {
  const [activeStep, setActiveStep] = useState("input");
  const [form, setForm] = useState(INITIAL_FORM);
  const [masterBrief, setMasterBrief] = useState(null);
  const [masterBriefRaw, setMasterBriefRaw] = useState("");
  const [masterBriefWarning, setMasterBriefWarning] = useState("");
  const [masterBriefJsonDraft, setMasterBriefJsonDraft] = useState(null);
  const [masterBriefJsonError, setMasterBriefJsonError] = useState("");
  const [channelOutlines, setChannelOutlines] = useState(createInitialChannelOutlines);
  const [activeChannel, setActiveChannel] = useState("naver_blog");
  const [plainTextCopyMessage, setPlainTextCopyMessage] = useState("");
  const [loadingMasterBrief, setLoadingMasterBrief] = useState(false);
  const [error, setError] = useState("");
  const [sectionCountError, setSectionCountError] = useState("");
  const [masterBriefCopyMessage, setMasterBriefCopyMessage] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [sessionApiKey, setSessionApiKey] = useState("");
  const [envApiKeyAvailable, setEnvApiKeyAvailable] = useState(false);

  useEffect(() => {
    getApiKeyStatus()
      .then((status) => setEnvApiKeyAvailable(status.source === "env"))
      .catch(() => setEnvApiKeyAvailable(false));
  }, []);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleSolution(solution) {
    setForm((prev) => {
      const selected = prev.solution_links.includes(solution)
        ? prev.solution_links.filter((item) => item !== solution)
        : [...prev.solution_links, solution];
      return { ...prev, solution_links: selected };
    });
  }

  function handleSectionCountChange(value) {
    updateField("section_count", value);
    setSectionCountError(validateSectionCount(value));
  }

  function handleSaveApiKey(event) {
    event.preventDefault();
    setSessionApiKey(apiKeyInput.trim());
    setApiKeyInput("");
    setError("");
  }

  function clearMasterBriefJsonDraft() {
    setMasterBriefJsonDraft(null);
    setMasterBriefJsonError("");
  }

  function updateMasterBriefField(field, value) {
    setMasterBrief((prev) => (prev ? { ...prev, [field]: value } : prev));
    clearMasterBriefJsonDraft();
  }

  function updateMasterBriefArrayField(field, text) {
    updateMasterBriefField(field, parseListField(text));
  }

  function updateInferredField(field, value) {
    setMasterBrief((prev) =>
      prev
        ? {
            ...prev,
            inferred_inputs: {
              ...prev.inferred_inputs,
              [field]: value,
            },
          }
        : prev
    );
    clearMasterBriefJsonDraft();
  }

  function updateChannelStrategyField(channel, value) {
    setMasterBrief((prev) =>
      prev
        ? {
            ...prev,
            channel_strategy: {
              ...prev.channel_strategy,
              [channel]: value,
            },
          }
        : prev
    );
    clearMasterBriefJsonDraft();
  }

  function getMasterBriefJsonText() {
    if (masterBriefJsonDraft !== null) return masterBriefJsonDraft;
    if (masterBrief) return masterBriefToJson(masterBrief);
    return masterBriefRaw;
  }

  function handleApplyMasterBriefJson() {
    const parsed = parseMasterBriefText(getMasterBriefJsonText());
    if (!parsed.object) {
      setMasterBriefJsonError("유효하지 않은 JSON입니다. 수정 후 다시 적용하세요.");
      return;
    }
    setMasterBrief(parsed.object);
    setMasterBriefRaw(parsed.raw);
    setMasterBriefWarning("");
    clearMasterBriefJsonDraft();
  }

  function updateChannelOutline(channelId, patch) {
    setChannelOutlines((prev) => ({
      ...prev,
      [channelId]: { ...prev[channelId], ...patch },
    }));
  }

  function updateChannelOutlineObject(channelId, updater) {
    setChannelOutlines((prev) => {
      const current = prev[channelId];
      if (!current.object) return prev;
      return {
        ...prev,
        [channelId]: {
          ...current,
          object: updater(current.object),
          jsonDraft: null,
          jsonError: "",
        },
      };
    });
  }

  function clearChannelJsonDraft(channelId) {
    updateChannelOutline(channelId, { jsonDraft: null, jsonError: "" });
  }

  function updateOutlineField(field, value) {
    updateChannelOutlineObject("naver_blog", (prev) => ({ ...prev, [field]: value }));
  }

  function updateOutlineArrayField(field, text) {
    updateOutlineField(field, parseListField(text));
  }

  function updateOutlineSection(index, field, value) {
    updateChannelOutlineObject("naver_blog", (prev) => {
      const sections = [...prev.sections];
      sections[index] = { ...sections[index], [field]: value };
      return { ...prev, sections };
    });
  }

  function updateOutlineSectionKeyPoints(index, text) {
    updateOutlineSection(index, "key_points", parseListField(text));
  }

  function updateOutlineFaq(index, field, value) {
    updateChannelOutlineObject("naver_blog", (prev) => {
      const faqCandidates = [...prev.faq_candidates];
      faqCandidates[index] = { ...faqCandidates[index], [field]: value };
      return { ...prev, faq_candidates: faqCandidates };
    });
  }

  function updateOutlineCtaField(field, value) {
    updateChannelOutlineObject("naver_blog", (prev) => ({
      ...prev,
      cta_block: {
        ...prev.cta_block,
        [field]: value,
      },
    }));
  }

  function getChannelOutlineJsonText(channelId) {
    const channel = channelOutlines[channelId];
    if (channel.jsonDraft !== null) return channel.jsonDraft;
    if (channel.object) {
      return channelId === "naver_blog"
        ? outlineToJson(channel.object)
        : JSON.stringify(channel.object, null, 2);
    }
    return channel.raw;
  }

  function handleApplyChannelOutlineJson(channelId) {
    const text = getChannelOutlineJsonText(channelId);
    const parsed =
      channelId === "naver_blog" ? parseOutlineText(text) : parseChannelOutlineText(text);

    if (!parsed.object) {
      updateChannelOutline(channelId, {
        jsonError: "유효하지 않은 JSON입니다. 수정 후 다시 적용하세요.",
      });
      return;
    }

    updateChannelOutline(channelId, {
      object: parsed.object,
      raw: parsed.raw,
      warning: "",
      jsonDraft: null,
      jsonError: "",
    });
  }

  async function handleGenerateMasterBrief(event) {
    event.preventDefault();

    const sectionError = validateSectionCount(form.section_count);
    setSectionCountError(sectionError);
    if (sectionError) return;

    setLoadingMasterBrief(true);
    setError("");
    setMasterBriefWarning("");

    try {
      const result = await generateMasterBrief(buildUserInput(form), sessionApiKey);
      const parsed = parseMasterBriefText(result.master_brief);
      setMasterBrief(parsed.object);
      setMasterBriefRaw(parsed.raw || result.master_brief);
      setMasterBriefWarning(parsed.warning);
      clearMasterBriefJsonDraft();
      setActiveStep("master-brief");
    } catch (err) {
      setError(err.message || "Failed to generate master brief.");
    } finally {
      setLoadingMasterBrief(false);
    }
  }

  async function handleGenerateChannelOutline(channelId) {
    if (!masterBrief) return;

    const generators = {
      naver_blog: generateNaverBlogOutline,
      homepage_magazine: generateHomepageMagazineOutline,
      linkedin: generateLinkedinOutline,
      meta_social: generateMetaSocialOutline,
    };

    updateChannelOutline(channelId, { loading: true, error: "" });
    setError("");

    try {
      const result = await generators[channelId](
        buildUserInput(form),
        masterBrief,
        sessionApiKey
      );
      const parsed =
        channelId === "naver_blog"
          ? parseOutlineText(result.outline)
          : parseChannelOutlineText(result.outline);

      updateChannelOutline(channelId, {
        object: parsed.object,
        raw: parsed.raw || result.outline,
        warning: parsed.warning,
        loading: false,
        jsonDraft: null,
        jsonError: "",
      });
      setActiveChannel(channelId);
      setActiveStep("channel-outline");
    } catch (err) {
      updateChannelOutline(channelId, {
        loading: false,
        error: err.message || "Failed to generate outline.",
      });
    }
  }

  async function handleCopyMasterBrief() {
    const text = masterBrief ? masterBriefToJson(masterBrief) : masterBriefRaw;
    if (!text.trim()) {
      setMasterBriefCopyMessage("복사할 Master Brief가 없습니다.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setMasterBriefCopyMessage("Master Brief JSON이 클립보드에 복사되었습니다.");
    } catch {
      setMasterBriefCopyMessage("복사에 실패했습니다.");
    }

    setTimeout(() => setMasterBriefCopyMessage(""), 2000);
  }

  async function handleCopyChannelOutline(channelId) {
    const channel = channelOutlines[channelId];
    const text = channel.object
      ? channelId === "naver_blog"
        ? outlineToJson(channel.object)
        : JSON.stringify(channel.object, null, 2)
      : channel.raw;

    if (!text.trim()) {
      updateChannelOutline(channelId, { copyMessage: "복사할 아웃라인이 없습니다." });
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      updateChannelOutline(channelId, { copyMessage: "아웃라인 JSON이 클립보드에 복사되었습니다." });
    } catch {
      updateChannelOutline(channelId, { copyMessage: "복사에 실패했습니다." });
    }

    setTimeout(() => updateChannelOutline(channelId, { copyMessage: "" }), 2000);
  }

  async function handleCopyPlainTextOutline() {
    const outlineObject = channelOutlines.naver_blog.object;
    if (!outlineObject) {
      setPlainTextCopyMessage("파싱된 아웃라인이 없습니다.");
      return;
    }

    try {
      await navigator.clipboard.writeText(outlineToPlainText(outlineObject));
      setPlainTextCopyMessage("Plain Text 아웃라인이 클립보드에 복사되었습니다.");
    } catch {
      setPlainTextCopyMessage("복사에 실패했습니다.");
    }

    setTimeout(() => setPlainTextCopyMessage(""), 2000);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>CS Sharing Content App</h1>
        <p>Master Brief를 먼저 생성하고 검토한 뒤, 각 채널별 콘텐츠를 생성합니다.</p>
        <p className="hint">
          Master Brief 생성 = AI 호출 1회, 네이버 블로그 아웃라인 생성 = AI 호출 1회
        </p>
      </header>

      <section className="panel api-key-panel">
        <h2>API Key</h2>
        <p className="hint">
          API 키는 이 페이지의 React state에만 저장됩니다. 새로고침하면 다시 입력해야 합니다.
          서버 <code>.env</code> 키는 키를 입력하지 않았을 때 fallback으로 사용됩니다.
        </p>
        <form className="api-key-form" onSubmit={handleSaveApiKey}>
          <input
            type="password"
            placeholder="Anthropic API key (optional)"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" disabled={!apiKeyInput.trim()}>
            Use API Key
          </button>
        </form>
        {sessionApiKey ? (
          <p className="status ok">API key entered for this session</p>
        ) : envApiKeyAvailable ? (
          <p className="status ok">Using server .env API key</p>
        ) : (
          <p className="status warn">API key not configured</p>
        )}
      </section>

      <nav className="step-nav">
        {STEPS.map((step) => (
          <button
            key={step.id}
            type="button"
            className={`step-tab ${activeStep === step.id ? "active" : ""}`}
            onClick={() => setActiveStep(step.id)}
          >
            {step.label}
          </button>
        ))}
      </nav>

      {error && <p className="error">{error}</p>}

      {activeStep === "input" && (
        <section className="panel">
          <h2>콘텐츠 입력</h2>
          <form className="outline-form" onSubmit={handleGenerateMasterBrief}>
            <label>
              콘텐츠 주제 <span className="required">*</span>
              <input
                value={form.topic}
                onChange={(e) => updateField("topic", e.target.value)}
                placeholder="예) 성수기 쇼핑몰 CS대응"
                required
              />
            </label>

            <label>
              타겟 독자
              <span className="field-note">권장</span>
              <input
                value={form.target_reader}
                onChange={(e) => updateField("target_reader", e.target.value)}
                placeholder="예) 이커머스 운영팀장, 쇼핑몰 대표, CS 담당자"
              />
            </label>

            <label>
              주요 키워드
              <span className="field-note">권장</span>
              <textarea
                value={form.main_keywords}
                onChange={(e) => updateField("main_keywords", e.target.value)}
                placeholder={"예)\n성수기 CS대응\n쇼핑몰 CS대행\n문의 폭증 대응"}
                rows={4}
              />
            </label>

            <label>
              글 유형
              <select
                value={form.content_type}
                onChange={(e) => updateField("content_type", e.target.value)}
              >
                {CONTENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label>
              산업군
              <input
                value={form.target_industry}
                onChange={(e) => updateField("target_industry", e.target.value)}
                placeholder="예) 이커머스 / 쇼핑몰"
              />
            </label>

            <fieldset className="solution-fieldset">
              <legend>연결할 CS쉐어링 솔루션</legend>
              <p className="hint">여러 개 선택 가능</p>

              <label className={`solution-card recommended ${form.solution_links.includes(RECOMMENDED_SOLUTION) ? "selected" : ""}`}>
                <input
                  type="checkbox"
                  checked={form.solution_links.includes(RECOMMENDED_SOLUTION)}
                  onChange={() => toggleSolution(RECOMMENDED_SOLUTION)}
                />
                <span className="solution-label">
                  <span className="recommended-badge">추천</span>
                  {RECOMMENDED_SOLUTION}
                </span>
              </label>

              {SOLUTION_GROUPS.map((group) => (
                <div key={group.label} className="solution-group">
                  <h3 className="solution-group-title">{group.label}</h3>
                  <div className="solution-cards">
                    {group.options.map((option) => (
                      <label
                        key={option}
                        className={`solution-card ${form.solution_links.includes(option) ? "selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={form.solution_links.includes(option)}
                          onChange={() => toggleSolution(option)}
                        />
                        <span className="solution-label">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </fieldset>

            <details className="advanced-options">
              <summary>고급 옵션</summary>
              <div className="advanced-options-body">
                <p className="hint">
                  모르면 비워두세요. AI가 주제, 산업군, 글 유형, 연결 솔루션을 바탕으로 추천합니다.
                </p>

                <label>
                  독자 상황
                  <textarea
                    value={form.reader_situations}
                    onChange={(e) => updateField("reader_situations", e.target.value)}
                    placeholder={"예) 프로모션 이후 문의가 폭주한다\n예) 배송 지연과 환불 문의가 동시에 몰린다"}
                    rows={4}
                  />
                </label>

                <label>
                  반박할 오해
                  <textarea
                    value={form.misconception_to_refute}
                    onChange={(e) => updateField("misconception_to_refute", e.target.value)}
                    placeholder="예) 상담 인력만 더 뽑으면 해결된다는 생각"
                    rows={2}
                  />
                </label>

                <label>
                  구조적 원인
                  <textarea
                    value={form.structural_cause}
                    onChange={(e) => updateField("structural_cause", e.target.value)}
                    placeholder="예) 문의 유형별 SOP, 백업 인력, AI 문의 분류 구조 부족"
                    rows={2}
                  />
                </label>

                <label>
                  콘텐츠 목표
                  <textarea
                    value={form.content_goal}
                    onChange={(e) => updateField("content_goal", e.target.value)}
                    placeholder="예) 독자가 문제를 운영 구조 관점으로 인식하고 상담을 고려하도록 유도"
                    rows={2}
                  />
                </label>

                <label>
                  CTA 유형
                  <select
                    value={form.cta_type}
                    onChange={(e) => updateField("cta_type", e.target.value)}
                  >
                    {CTA_TYPES.map((cta) => (
                      <option key={cta} value={cta}>
                        {cta}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  섹션 수
                  <input
                    type="number"
                    min="4"
                    max="6"
                    value={form.section_count}
                    onChange={(e) => handleSectionCountChange(e.target.value)}
                    placeholder="비워두면 기본값 5"
                  />
                  {sectionCountError && <span className="field-error">{sectionCountError}</span>}
                </label>
              </div>
            </details>

            <button
              type="submit"
              className="primary"
              disabled={loadingMasterBrief || Boolean(sectionCountError)}
            >
              {loadingMasterBrief ? "생성 중..." : "Master Brief 생성"}
            </button>
          </form>
        </section>
      )}

      {activeStep === "master-brief" && (
        <section className="panel">
          <div className="output-header">
            <h2>Master Content Brief</h2>
            <button
              type="button"
              className="copy-button"
              onClick={handleCopyMasterBrief}
              disabled={!masterBrief && !masterBriefRaw}
            >
              Copy Master Brief JSON
            </button>
          </div>

          {masterBriefCopyMessage && <p className="status ok">{masterBriefCopyMessage}</p>}
          {masterBriefWarning && <p className="status warn">{masterBriefWarning}</p>}

          {!masterBrief ? (
            <p className="hint">Master Brief가 아직 없습니다. 1단계에서 생성하세요.</p>
          ) : (
            <div className="master-brief-editor">
              <div className="editor-card">
                <h3>기본 정보</h3>
                <label>
                  topic
                  <input
                    value={masterBrief.topic}
                    onChange={(e) => updateMasterBriefField("topic", e.target.value)}
                  />
                </label>
                <label>
                  target_reader
                  <input
                    value={masterBrief.target_reader}
                    onChange={(e) => updateMasterBriefField("target_reader", e.target.value)}
                  />
                </label>
                <label>
                  primary_keyword
                  <input
                    value={masterBrief.primary_keyword}
                    onChange={(e) => updateMasterBriefField("primary_keyword", e.target.value)}
                  />
                </label>
                <label>
                  secondary_keywords
                  <textarea
                    value={arrayToText(masterBrief.secondary_keywords)}
                    onChange={(e) => updateMasterBriefArrayField("secondary_keywords", e.target.value)}
                    rows={3}
                  />
                </label>
                <label>
                  content_type
                  <select
                    value={masterBrief.content_type}
                    onChange={(e) => updateMasterBriefField("content_type", e.target.value)}
                  >
                    <option value="">선택</option>
                    {CONTENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="editor-card">
                <h3>전략 메시지</h3>
                <label>
                  core_problem
                  <textarea
                    value={masterBrief.core_problem}
                    onChange={(e) => updateMasterBriefField("core_problem", e.target.value)}
                    rows={2}
                  />
                </label>
                <label>
                  reader_context
                  <textarea
                    value={masterBrief.reader_context}
                    onChange={(e) => updateMasterBriefField("reader_context", e.target.value)}
                    rows={2}
                  />
                </label>
                <label>
                  misconception
                  <textarea
                    value={masterBrief.misconception}
                    onChange={(e) => updateMasterBriefField("misconception", e.target.value)}
                    rows={2}
                  />
                </label>
                <label>
                  structural_cause
                  <textarea
                    value={masterBrief.structural_cause}
                    onChange={(e) => updateMasterBriefField("structural_cause", e.target.value)}
                    rows={2}
                  />
                </label>
                <label>
                  core_message
                  <textarea
                    value={masterBrief.core_message}
                    onChange={(e) => updateMasterBriefField("core_message", e.target.value)}
                    rows={2}
                  />
                </label>
                <label>
                  solution_links
                  <textarea
                    value={arrayToText(masterBrief.solution_links)}
                    onChange={(e) => updateMasterBriefArrayField("solution_links", e.target.value)}
                    rows={3}
                  />
                </label>
                <label>
                  cta_direction
                  <input
                    value={masterBrief.cta_direction}
                    onChange={(e) => updateMasterBriefField("cta_direction", e.target.value)}
                  />
                </label>
              </div>

              <div className="editor-card">
                <h3>AI 추론 항목 (inferred_inputs)</h3>
                <label>
                  reader_situations
                  <textarea
                    value={arrayToText(masterBrief.inferred_inputs.reader_situations)}
                    onChange={(e) =>
                      updateInferredField("reader_situations", parseListField(e.target.value))
                    }
                    rows={3}
                  />
                </label>
                <label>
                  misconception
                  <textarea
                    value={masterBrief.inferred_inputs.misconception}
                    onChange={(e) => updateInferredField("misconception", e.target.value)}
                    rows={2}
                  />
                </label>
                <label>
                  structural_cause
                  <textarea
                    value={masterBrief.inferred_inputs.structural_cause}
                    onChange={(e) => updateInferredField("structural_cause", e.target.value)}
                    rows={2}
                  />
                </label>
                <label>
                  content_goal
                  <textarea
                    value={masterBrief.inferred_inputs.content_goal}
                    onChange={(e) => updateInferredField("content_goal", e.target.value)}
                    rows={2}
                  />
                </label>
                <label>
                  cta_direction
                  <input
                    value={masterBrief.inferred_inputs.cta_direction}
                    onChange={(e) => updateInferredField("cta_direction", e.target.value)}
                  />
                </label>
              </div>

              <div className="editor-card">
                <h3>채널 전략 (channel_strategy)</h3>
                <label>
                  naver_blog
                  <textarea
                    value={masterBrief.channel_strategy.naver_blog}
                    onChange={(e) => updateChannelStrategyField("naver_blog", e.target.value)}
                    rows={2}
                  />
                </label>
                <label>
                  homepage_magazine
                  <textarea
                    value={masterBrief.channel_strategy.homepage_magazine}
                    onChange={(e) => updateChannelStrategyField("homepage_magazine", e.target.value)}
                    rows={2}
                  />
                </label>
                <label>
                  meta_social
                  <textarea
                    value={masterBrief.channel_strategy.meta_social}
                    onChange={(e) => updateChannelStrategyField("meta_social", e.target.value)}
                    rows={2}
                  />
                </label>
                <label>
                  linkedin
                  <textarea
                    value={masterBrief.channel_strategy.linkedin}
                    onChange={(e) => updateChannelStrategyField("linkedin", e.target.value)}
                    rows={2}
                  />
                </label>
              </div>

              <div className="editor-card">
                <h3>주의 사항</h3>
                <label>
                  avoid_notes
                  <textarea
                    value={arrayToText(masterBrief.avoid_notes)}
                    onChange={(e) => updateMasterBriefArrayField("avoid_notes", e.target.value)}
                    rows={4}
                  />
                </label>
              </div>
            </div>
          )}

          <details className="advanced-options">
            <summary>Advanced JSON</summary>
            <div className="advanced-options-body">
              <p className="hint">
                Friendly editor와 동기화됩니다. JSON을 수정한 뒤 Apply를 눌러 반영하세요.
              </p>
              <div className="json-action-row">
                <button type="button" onClick={handleApplyMasterBriefJson}>
                  Apply Master Brief JSON
                </button>
                <button type="button" onClick={handleCopyMasterBrief}>
                  Copy Master Brief JSON
                </button>
              </div>
              {masterBriefJsonError && (
                <p className="field-error">{masterBriefJsonError}</p>
              )}
              <textarea
                className="master-brief-textarea"
                value={getMasterBriefJsonText()}
                onChange={(e) => {
                  setMasterBriefJsonDraft(e.target.value);
                  setMasterBriefJsonError("");
                }}
                rows={16}
              />
            </div>
          </details>

          <button
            type="button"
            className="primary"
            onClick={() => setActiveStep("channel-outline")}
            disabled={!masterBrief}
          >
            채널별 Outline 단계로 이동
          </button>
        </section>
      )}

      {activeStep === "channel-outline" && (
        <section className="panel output-panel">
          <h2>채널별 Outline</h2>
          <p className="hint">
            Master Brief를 검토·수정한 뒤, 원하는 채널의 아웃라인을 생성하세요.
          </p>
          <p className="hint">
            각 채널은 수정된 Master Brief와 사용자 입력을 기준으로 독립 생성됩니다. 네이버
            블로그 아웃라인을 다른 채널이 참고하지 않습니다.
          </p>

          <div className="channel-buttons">
            {CHANNEL_IDS.map((channelId) => {
              const config = CHANNEL_CONFIG[channelId];
              const channel = channelOutlines[channelId];
              return (
                <button
                  key={channelId}
                  type="button"
                  className={channelId === "naver_blog" ? "primary" : ""}
                  onClick={() => handleGenerateChannelOutline(channelId)}
                  disabled={!masterBrief || channel.loading}
                >
                  {channel.loading ? "생성 중..." : config.buttonLabel}
                </button>
              );
            })}
          </div>

          <nav className="step-nav channel-tab-nav">
            {CHANNEL_IDS.map((channelId) => (
              <button
                key={channelId}
                type="button"
                className={`step-tab ${activeChannel === channelId ? "active" : ""}`}
                onClick={() => setActiveChannel(channelId)}
              >
                {CHANNEL_CONFIG[channelId].label}
              </button>
            ))}
          </nav>

          {channelOutlines[activeChannel].error && (
            <p className="error">{channelOutlines[activeChannel].error}</p>
          )}
          {channelOutlines[activeChannel].warning && (
            <p className="status warn">{channelOutlines[activeChannel].warning}</p>
          )}

          {!channelOutlines[activeChannel].object && !channelOutlines[activeChannel].raw ? (
            <p className="hint">
              {channelOutlines[activeChannel].loading
                ? "아웃라인을 생성하고 있습니다..."
                : `${CHANNEL_CONFIG[activeChannel].label} 아웃라인을 생성하면 여기에 편집 화면이 표시됩니다.`}
            </p>
          ) : activeChannel === "naver_blog" && channelOutlines.naver_blog.object ? (
            <div className="outline-editor">
              <div className="editor-card">
                <h3>제목 · 키워드</h3>
                <label>
                  title_candidates
                  <textarea
                    value={arrayToText(channelOutlines.naver_blog.object.title_candidates)}
                    onChange={(e) => updateOutlineArrayField("title_candidates", e.target.value)}
                    rows={3}
                  />
                </label>
                <label>
                  recommended_title
                  <input
                    value={channelOutlines.naver_blog.object.recommended_title}
                    onChange={(e) => updateOutlineField("recommended_title", e.target.value)}
                  />
                </label>
                <label>
                  primary_keyword
                  <input
                    value={channelOutlines.naver_blog.object.primary_keyword}
                    onChange={(e) => updateOutlineField("primary_keyword", e.target.value)}
                  />
                </label>
                <label>
                  secondary_keywords
                  <textarea
                    value={arrayToText(channelOutlines.naver_blog.object.secondary_keywords)}
                    onChange={(e) => updateOutlineArrayField("secondary_keywords", e.target.value)}
                    rows={3}
                  />
                </label>
                <label>
                  content_type
                  <select
                    value={channelOutlines.naver_blog.object.content_type}
                    onChange={(e) => updateOutlineField("content_type", e.target.value)}
                  >
                    <option value="">선택</option>
                    {CONTENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="editor-card">
                <h3>메시지 · 흐름</h3>
                <label>
                  search_intent
                  <textarea
                    value={channelOutlines.naver_blog.object.search_intent}
                    onChange={(e) => updateOutlineField("search_intent", e.target.value)}
                    rows={2}
                  />
                </label>
                <label>
                  target_reader_summary
                  <textarea
                    value={channelOutlines.naver_blog.object.target_reader_summary}
                    onChange={(e) => updateOutlineField("target_reader_summary", e.target.value)}
                    rows={2}
                  />
                </label>
                <label>
                  opening_hook
                  <textarea
                    value={channelOutlines.naver_blog.object.opening_hook}
                    onChange={(e) => updateOutlineField("opening_hook", e.target.value)}
                    rows={2}
                  />
                </label>
                <label>
                  core_message
                  <textarea
                    value={channelOutlines.naver_blog.object.core_message}
                    onChange={(e) => updateOutlineField("core_message", e.target.value)}
                    rows={2}
                  />
                </label>
                <label>
                  flow_summary
                  <textarea
                    value={channelOutlines.naver_blog.object.flow_summary}
                    onChange={(e) => updateOutlineField("flow_summary", e.target.value)}
                    rows={2}
                  />
                </label>
              </div>

              <div className="editor-card editor-card-wide">
                <h3>sections</h3>
                {channelOutlines.naver_blog.object.sections.map((section, index) => (
                  <div key={`section-${index}`} className="nested-card">
                    <h4>Section {section.order ?? index + 1}</h4>
                    <label>
                      order
                      <input
                        type="number"
                        value={section.order ?? index + 1}
                        onChange={(e) =>
                          updateOutlineSection(index, "order", Number(e.target.value))
                        }
                      />
                    </label>
                    <label>
                      heading
                      <input
                        value={section.heading}
                        onChange={(e) => updateOutlineSection(index, "heading", e.target.value)}
                      />
                    </label>
                    <label>
                      section_role
                      <textarea
                        value={section.section_role}
                        onChange={(e) =>
                          updateOutlineSection(index, "section_role", e.target.value)
                        }
                        rows={2}
                      />
                    </label>
                    <label>
                      key_points
                      <textarea
                        value={arrayToText(section.key_points)}
                        onChange={(e) => updateOutlineSectionKeyPoints(index, e.target.value)}
                        rows={3}
                      />
                    </label>
                  </div>
                ))}
              </div>

              <div className="editor-card">
                <h3>checklist · FAQ · CTA</h3>
                <label>
                  checklist_candidates
                  <textarea
                    value={arrayToText(channelOutlines.naver_blog.object.checklist_candidates)}
                    onChange={(e) => updateOutlineArrayField("checklist_candidates", e.target.value)}
                    rows={4}
                  />
                </label>
                {channelOutlines.naver_blog.object.faq_candidates.map((faq, index) => (
                  <div key={`faq-${index}`} className="nested-card">
                    <h4>FAQ {index + 1}</h4>
                    <label>
                      question
                      <input
                        value={faq.question}
                        onChange={(e) => updateOutlineFaq(index, "question", e.target.value)}
                      />
                    </label>
                    <label>
                      answer_direction
                      <textarea
                        value={faq.answer_direction}
                        onChange={(e) =>
                          updateOutlineFaq(index, "answer_direction", e.target.value)
                        }
                        rows={2}
                      />
                    </label>
                  </div>
                ))}
                <label>
                  cta_heading
                  <input
                    value={channelOutlines.naver_blog.object.cta_block.cta_heading}
                    onChange={(e) => updateOutlineCtaField("cta_heading", e.target.value)}
                  />
                </label>
                <label>
                  cta_message
                  <textarea
                    value={channelOutlines.naver_blog.object.cta_block.cta_message}
                    onChange={(e) => updateOutlineCtaField("cta_message", e.target.value)}
                    rows={2}
                  />
                </label>
                <label>
                  cta_type
                  <select
                    value={channelOutlines.naver_blog.object.cta_block.cta_type}
                    onChange={(e) => updateOutlineCtaField("cta_type", e.target.value)}
                  >
                    <option value="">선택</option>
                    {CTA_TYPES.map((cta) => (
                      <option key={cta} value={cta}>
                        {cta}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="editor-card">
                <h3>avoid_notes</h3>
                <label>
                  avoid_notes
                  <textarea
                    value={arrayToText(channelOutlines.naver_blog.object.avoid_notes)}
                    onChange={(e) => updateOutlineArrayField("avoid_notes", e.target.value)}
                    rows={4}
                  />
                </label>
              </div>
            </div>
          ) : channelOutlines[activeChannel].object || channelOutlines[activeChannel].raw ? (
            <div className="outline-editor simple-channel-panel">
              <div className="editor-card">
                <h3>{CHANNEL_CONFIG[activeChannel].label} Outline</h3>
                {channelOutlines[activeChannel].object?.recommended_title && (
                  <label>
                    recommended_title
                    <input
                      readOnly
                      value={channelOutlines[activeChannel].object.recommended_title}
                    />
                  </label>
                )}
                {channelOutlines[activeChannel].object?.core_message && (
                  <label>
                    core_message
                    <textarea
                      readOnly
                      value={channelOutlines[activeChannel].object.core_message}
                      rows={2}
                    />
                  </label>
                )}
                {CHANNEL_CONFIG[activeChannel].angleField &&
                  channelOutlines[activeChannel].object?.[
                    CHANNEL_CONFIG[activeChannel].angleField
                  ] && (
                    <label>
                      {CHANNEL_CONFIG[activeChannel].angleField}
                      <textarea
                        readOnly
                        value={
                          channelOutlines[activeChannel].object[
                            CHANNEL_CONFIG[activeChannel].angleField
                          ]
                        }
                        rows={2}
                      />
                    </label>
                  )}
              </div>
            </div>
          ) : null}

          {(channelOutlines[activeChannel].object || channelOutlines[activeChannel].raw) && (
            <details className="advanced-options">
              <summary>Advanced JSON — {CHANNEL_CONFIG[activeChannel].label}</summary>
              <div className="advanced-options-body">
                <p className="hint">
                  JSON을 수정한 뒤 Apply를 눌러 반영하세요.
                  {activeChannel === "naver_blog"
                    ? " Friendly editor와 동기화됩니다."
                    : ""}
                </p>
                <div className="json-action-row">
                  <button
                    type="button"
                    onClick={() => handleApplyChannelOutlineJson(activeChannel)}
                  >
                    Apply Outline JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyChannelOutline(activeChannel)}
                  >
                    Copy Outline JSON
                  </button>
                  {activeChannel === "naver_blog" && (
                    <button
                      type="button"
                      onClick={handleCopyPlainTextOutline}
                      disabled={!channelOutlines.naver_blog.object}
                    >
                      Copy Plain Text Outline
                    </button>
                  )}
                </div>
                {channelOutlines[activeChannel].jsonError && (
                  <p className="field-error">{channelOutlines[activeChannel].jsonError}</p>
                )}
                {channelOutlines[activeChannel].copyMessage && (
                  <p className="status ok">{channelOutlines[activeChannel].copyMessage}</p>
                )}
                {plainTextCopyMessage && activeChannel === "naver_blog" && (
                  <p className="status ok">{plainTextCopyMessage}</p>
                )}
                <textarea
                  className="outline-output"
                  value={getChannelOutlineJsonText(activeChannel)}
                  onChange={(e) => {
                    updateChannelOutline(activeChannel, {
                      jsonDraft: e.target.value,
                      jsonError: "",
                    });
                  }}
                  placeholder="생성된 아웃라인 JSON"
                  rows={20}
                />
              </div>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
