import { useEffect, useState } from "react";
import { generateOutline, getApiKeyStatus, setApiKey } from "./api.js";

const RECOMMENDED_SOLUTION = "AI CX 풀서비스";

const SOLUTION_GROUPS = [
  {
    label: "CS대행 서비스",
    options: [
      "CS 토탈 서비스",
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
    options: ["OASIS AICC+IPCC", "AI StandBy", "AI VOC"],
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

const INITIAL_FORM = {
  topic: "",
  target_reader: "",
  main_keywords: "",
  content_goal: "",
  solution_links: [],
  avoid_expressions: "",
  content_type: "",
  target_industry: "",
  reader_situations: "",
  misconception_to_refute: "",
  structural_cause: "",
  section_count: "",
  include_checklist: true,
  include_faq: true,
  cta_type: "",
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
  const solutionLinks = form.solution_links;

  const userInput = {
    topic: form.topic.trim(),
    target_reader: form.target_reader.trim(),
    main_keywords: parseListField(form.main_keywords),
    content_goal: form.content_goal.trim(),
    solution_links: solutionLinks,
    solution_link: solutionLinks.join(", "),
    avoid_expressions: parseListField(form.avoid_expressions),
    content_type: form.content_type,
    target_industry: form.target_industry.trim(),
    reader_situations: parseListField(form.reader_situations),
    misconception_to_refute: form.misconception_to_refute.trim(),
    structural_cause: form.structural_cause.trim(),
    include_checklist: form.include_checklist,
    include_faq: form.include_faq,
    cta_type: form.cta_type.trim(),
  };

  if (form.section_count.trim()) {
    userInput.section_count = Number(form.section_count);
  }

  return userInput;
}

export default function App() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [outline, setOutline] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sectionCountError, setSectionCountError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [apiKeyMessage, setApiKeyMessage] = useState("");
  const [apiKeyLoading, setApiKeyLoading] = useState(false);

  useEffect(() => {
    getApiKeyStatus()
      .then((status) => setApiKeyConfigured(status.configured))
      .catch(() => setApiKeyConfigured(false));
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

  async function handleSaveApiKey(event) {
    event.preventDefault();
    setApiKeyLoading(true);
    setApiKeyMessage("");
    setError("");

    try {
      await setApiKey(apiKeyInput.trim());
      setApiKeyConfigured(true);
      setApiKeyInput("");
      setApiKeyMessage("API key configured");
    } catch (err) {
      setApiKeyMessage(err.message || "Failed to save API key.");
    } finally {
      setApiKeyLoading(false);
    }
  }

  async function handleGenerate(event) {
    event.preventDefault();

    const sectionError = validateSectionCount(form.section_count);
    setSectionCountError(sectionError);
    if (sectionError) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await generateOutline(buildUserInput(form));
      setOutline(result.outline);
    } catch (err) {
      setError(err.message || "Failed to generate outline.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyOutline() {
    if (!outline.trim()) {
      setCopyMessage("복사할 아웃라인이 없습니다.");
      return;
    }

    try {
      await navigator.clipboard.writeText(outline);
      setCopyMessage("아웃라인이 클립보드에 복사되었습니다.");
    } catch {
      setCopyMessage("복사에 실패했습니다.");
    }

    setTimeout(() => setCopyMessage(""), 2000);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>CS Sharing Content App</h1>
        <p>네이버 블로그 아웃라인 생성 MVP</p>
      </header>

      <section className="panel api-key-panel">
        <h2>API Key</h2>
        <p className="hint">
          기본값은 서버의 <code>.env</code> 파일입니다. 세션용 키를 입력하면 서버 메모리에만 저장됩니다.
        </p>
        <form className="api-key-form" onSubmit={handleSaveApiKey}>
          <input
            type="password"
            placeholder="Anthropic API key (optional)"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" disabled={apiKeyLoading || !apiKeyInput.trim()}>
            {apiKeyLoading ? "Saving..." : "Save API Key"}
          </button>
        </form>
        <p className={`status ${apiKeyConfigured ? "ok" : "warn"}`}>
          {apiKeyConfigured ? "API key configured" : "API key not configured"}
        </p>
        {apiKeyMessage && <p className="status ok">{apiKeyMessage}</p>}
      </section>

      <main className="layout">
        <section className="panel">
          <h2>Outline Input</h2>
          <form className="outline-form" onSubmit={handleGenerate}>
            <label>
              Topic
              <input
                value={form.topic}
                onChange={(e) => updateField("topic", e.target.value)}
                required
              />
            </label>

            <label>
              Target Reader
              <input
                value={form.target_reader}
                onChange={(e) => updateField("target_reader", e.target.value)}
              />
            </label>

            <label>
              Main Keywords
              <textarea
                value={form.main_keywords}
                onChange={(e) => updateField("main_keywords", e.target.value)}
                placeholder="쉼표 또는 줄바꿈으로 구분"
                rows={3}
              />
            </label>

            <label>
              Content Goal
              <textarea
                value={form.content_goal}
                onChange={(e) => updateField("content_goal", e.target.value)}
                rows={2}
              />
            </label>

            <fieldset className="solution-fieldset">
              <legend>Solution Links</legend>
              <p className="hint">연결할 솔루션을 선택하세요. 여러 개 선택 가능합니다.</p>

              <label className="solution-option recommended">
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
                  <div className="solution-options">
                    {group.options.map((option) => (
                      <label key={option} className="solution-option">
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

            <label>
              Avoid Expressions
              <textarea
                value={form.avoid_expressions}
                onChange={(e) => updateField("avoid_expressions", e.target.value)}
                placeholder="쉼표 또는 줄바꿈으로 구분"
                rows={2}
              />
            </label>

            <div className="field-block">
              <span className="field-label">Content Type</span>
              <div className="segmented-control" role="group" aria-label="Content Type">
                {CONTENT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`segment ${form.content_type === type ? "active" : ""}`}
                    onClick={() => updateField("content_type", type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <label>
              Target Industry
              <input
                value={form.target_industry}
                onChange={(e) => updateField("target_industry", e.target.value)}
              />
            </label>

            <label>
              Reader Situations
              <textarea
                value={form.reader_situations}
                onChange={(e) => updateField("reader_situations", e.target.value)}
                placeholder="쉼표 또는 줄바꿈으로 구분"
                rows={4}
              />
            </label>

            <label>
              Misconception to Refute
              <textarea
                value={form.misconception_to_refute}
                onChange={(e) => updateField("misconception_to_refute", e.target.value)}
                rows={2}
              />
            </label>

            <label>
              Structural Cause
              <textarea
                value={form.structural_cause}
                onChange={(e) => updateField("structural_cause", e.target.value)}
                rows={2}
              />
            </label>

            <label>
              Section Count
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

            <div className="checkbox-row">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.include_checklist}
                  onChange={(e) => updateField("include_checklist", e.target.checked)}
                />
                Include Checklist
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.include_faq}
                  onChange={(e) => updateField("include_faq", e.target.checked)}
                />
                Include FAQ
              </label>
            </div>

            <label>
              CTA Type
              <input
                value={form.cta_type}
                onChange={(e) => updateField("cta_type", e.target.value)}
              />
            </label>

            <button
              type="submit"
              className="primary"
              disabled={loading || Boolean(sectionCountError)}
            >
              {loading ? "Generating..." : "Generate Outline"}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="output-header">
            <h2>Generated Outline</h2>
            <button
              type="button"
              className="copy-button"
              onClick={handleCopyOutline}
              disabled={!outline.trim()}
            >
              Copy Outline
            </button>
          </div>
          {error && <p className="error">{error}</p>}
          {copyMessage && <p className="status ok">{copyMessage}</p>}
          <textarea
            className="outline-output"
            value={outline}
            onChange={(e) => setOutline(e.target.value)}
            placeholder={loading ? "Generating outline..." : "Generated outline will appear here."}
            rows={28}
          />
        </section>
      </main>
    </div>
  );
}
