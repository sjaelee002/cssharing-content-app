"use client";

import { BASE_PROMPTS } from "@/lib/prompts/base-prompts";
import { CH_LABELS, MVP_CHANNELS } from "@/lib/prompts/constants";
import { isValidOutput } from "@/lib/local-storage";
import type {
  Channel,
  ContentState,
  LogType,
  RightPanel,
  Rule,
} from "@/lib/types";

interface RightPanelProps {
  state: ContentState;
  onRightPanelChange: (panel: RightPanel) => void;
  onRuleSubTabChange: (tab: "global" | "channel") => void;
  onEditingRuleChChange: (channel: Channel) => void;
  onToggleGlobalRule: (id: string) => void;
  onRemoveGlobalRule: (id: string) => void;
  onAddGlobalRule: (text: string) => void;
  onToggleChannelRule: (channel: Channel, id: string) => void;
  onRemoveChannelRule: (channel: Channel, id: string) => void;
  onAddChannelRule: (channel: Channel, text: string) => void;
  onChannelExtraChange: (channel: Channel, text: string) => void;
  onRefinePromptChange: (text: string) => void;
  onRefine: () => void;
  onClearLog: () => void;
}

const PANEL_TABS: { id: RightPanel; label: string }[] = [
  { id: "rules", label: "규칙" },
  { id: "refine", label: "고도화" },
  { id: "log", label: "로그" },
];

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      className={`toggle ${enabled ? "on" : ""}`}
      onClick={onChange}
      aria-pressed={enabled}
    >
      <span className="toggle-thumb" />
    </button>
  );
}

function RuleList({
  rules,
  onToggle,
  onRemove,
}: {
  rules: Rule[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (rules.length === 0) {
    return <p className="empty-hint">규칙이 없습니다.</p>;
  }

  return (
    <div className="rule-list">
      {rules.map((rule) => (
        <div
          key={rule.id}
          className={`rule-item ${rule.enabled ? "enabled" : ""}`}
        >
          <Toggle
            enabled={rule.enabled}
            onChange={() => onToggle(rule.id)}
          />
          <span className="rule-text">{rule.text}</span>
          <button
            type="button"
            className="remove-btn"
            onClick={() => onRemove(rule.id)}
            aria-label="규칙 삭제"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function RightPanel({
  state,
  onRightPanelChange,
  onRuleSubTabChange,
  onEditingRuleChChange,
  onToggleGlobalRule,
  onRemoveGlobalRule,
  onAddGlobalRule,
  onToggleChannelRule,
  onRemoveChannelRule,
  onAddChannelRule,
  onChannelExtraChange,
  onRefinePromptChange,
  onRefine,
  onClearLog,
}: RightPanelProps) {
  const activeOutput = state.outputs[state.activeTab];
  const refinements = state.refinements[state.activeTab] || [];
  const editingCh = state.editingRuleCh;

  const logColor = (type: LogType) => {
    if (type === "error") return "log-error";
    if (type === "success") return "log-success";
    if (type === "warn") return "log-warn";
    return "";
  };

  return (
    <aside className="right-panel">
      <div className="right-tabs">
        {PANEL_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`right-tab ${state.rightPanel === tab.id ? "active" : ""}`}
            onClick={() => onRightPanelChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="right-body">
        {state.rightPanel === "rules" && (
          <>
            <div className="sub-tabs">
              <button
                type="button"
                className={`sub-tab ${state.ruleSubTab === "global" ? "active" : ""}`}
                onClick={() => onRuleSubTabChange("global")}
              >
                전역 규칙
              </button>
              <button
                type="button"
                className={`sub-tab ${state.ruleSubTab === "channel" ? "active" : ""}`}
                onClick={() => onRuleSubTabChange("channel")}
              >
                채널 규칙
              </button>
            </div>

            {state.ruleSubTab === "global" ? (
              <>
                <p className="panel-hint">
                  전역 규칙 ·{" "}
                  {state.globalRules.filter((r) => r.enabled).length}/
                  {state.globalRules.length} 활성
                </p>
                <RuleList
                  rules={state.globalRules}
                  onToggle={onToggleGlobalRule}
                  onRemove={onRemoveGlobalRule}
                />
                <form
                  className="add-rule-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.elements.namedItem(
                      "global-rule"
                    ) as HTMLInputElement;
                    const text = input.value.trim();
                    if (text) {
                      onAddGlobalRule(text);
                      input.value = "";
                    }
                  }}
                >
                  <input
                    name="global-rule"
                    className="text-input"
                    placeholder="새 전역 규칙 입력..."
                  />
                  <button type="submit" className="primary-btn small">
                    + 추가
                  </button>
                </form>
              </>
            ) : (
              <>
                <select
                  className="select-input"
                  value={editingCh}
                  onChange={(e) =>
                    onEditingRuleChChange(e.target.value as Channel)
                  }
                >
                  {MVP_CHANNELS.map((ch) => (
                    <option key={ch} value={ch}>
                      {CH_LABELS[ch]}
                    </option>
                  ))}
                </select>
                <RuleList
                  rules={state.channelRules[editingCh] || []}
                  onToggle={(id) => onToggleChannelRule(editingCh, id)}
                  onRemove={(id) => onRemoveChannelRule(editingCh, id)}
                />
                <form
                  className="add-rule-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.elements.namedItem(
                      "channel-rule"
                    ) as HTMLInputElement;
                    const text = input.value.trim();
                    if (text) {
                      onAddChannelRule(editingCh, text);
                      input.value = "";
                    }
                  }}
                >
                  <input
                    name="channel-rule"
                    className="text-input"
                    placeholder={`${CH_LABELS[editingCh]} 채널 규칙 입력...`}
                  />
                  <button type="submit" className="primary-btn small">
                    + 추가
                  </button>
                </form>
              </>
            )}

            <div className="extra-prompt-section">
              <p className="panel-hint">채널별 추가 지시사항</p>
              <select
                className="select-input"
                value={editingCh}
                onChange={(e) =>
                  onEditingRuleChChange(e.target.value as Channel)
                }
              >
                {MVP_CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {CH_LABELS[ch]}
                  </option>
                ))}
              </select>
              <p className="panel-hint">📌 고정 기본 프롬프트</p>
              <pre className="base-prompt-preview">
                {(BASE_PROMPTS[editingCh] || "")
                  .replace(/\{tone\}/g, "[톤]")
                  .replace(/\{contentType\}/g, "[유형]")
                  .replace(/\{goal\}/g, "[목표]")}
              </pre>
              <textarea
                className="extra-textarea"
                placeholder="예: SEO 키워드를 자연스럽게 포함"
                value={state.channelExtra[editingCh] || ""}
                onChange={(e) =>
                  onChannelExtraChange(editingCh, e.target.value)
                }
              />
            </div>
          </>
        )}

        {state.rightPanel === "refine" && (
          <>
            <h3 className="panel-title">✏️ 고도화 재생성</h3>
            <p className="panel-hint">
              현재 탭({CH_LABELS[state.activeTab]})의 글 + 추가 지시사항으로
              개선된 버전을 생성합니다.
            </p>
            {isValidOutput(activeOutput?.content) ? (
              <pre className="refine-preview">
                {activeOutput!.content.substring(0, 200)}
                {activeOutput!.content.length > 200 ? "..." : ""}
              </pre>
            ) : (
              <p className="empty-hint">
                먼저 {CH_LABELS[state.activeTab]} 글을 생성하세요.
              </p>
            )}
            <label className="field-label" htmlFor="refine-input">
              추가 지시사항
            </label>
            <textarea
              id="refine-input"
              className="refine-textarea"
              placeholder={
                "예시:\n- 더 짧게\n- 톤을 더 친근하게\n- 마지막에 CTA 추가"
              }
              value={state.refinePrompt}
              onChange={(e) => onRefinePromptChange(e.target.value)}
            />
            <button type="button" className="primary-btn" onClick={onRefine}>
              🚀 고도화 재생성
            </button>
            {refinements.length > 0 && (
              <div className="refinement-history">
                <p className="panel-hint">
                  📚 {CH_LABELS[state.activeTab]} 고도화 기록 (
                  {refinements.length}개)
                </p>
                {refinements.slice(-5).map((r, i) => (
                  <div key={`${i}-${r}`} className="refinement-item">
                    {i + 1}. {r}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {state.rightPanel === "log" && (
          <>
            <div className="log-header">
              <span className="panel-hint">
                활동 로그 ({state.log.length})
              </span>
              <button
                type="button"
                className="ghost-btn small"
                onClick={onClearLog}
              >
                초기화
              </button>
            </div>
            <div className="log-list">
              {state.log.map((entry) => (
                <div key={entry.id} className="log-item">
                  <span className="log-time">{entry.time}</span>
                  <span className={logColor(entry.type)}>{entry.msg}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="right-footer">
        <span className="status-dot success pulse-slow" />
        <span>
          출력 {Object.keys(state.outputs).length}개 · {state.goal}
        </span>
        <span className="footer-meta">{state.contentType}</span>
      </div>
    </aside>
  );
}
