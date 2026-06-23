"use client";

import { useState, type ReactNode } from "react";

import { CH_LABELS, GOAL_CHANNELS } from "@/lib/prompts/constants";
import { isValidOutput } from "@/lib/local-storage";
import {
  buildMagazineStandaloneHtml,
  getMagazineHtmlDownloadFilename,
} from "@/lib/magazine/buildMagazineStandaloneHtml";
import { downloadTextFile } from "@/lib/blog/copyHelpers";
import type {
  ChannelSaveState,
  Goal,
  MagazineEnhancementState,
} from "@/lib/types";

interface MagazineOutputPanelProps {
  goal: Goal;
  hasHydrated: boolean;
  output?: {
    content: string;
    ts: string;
    history: { content: string; ts: string; instruction?: string }[];
  };
  magazineEnhancement: MagazineEnhancementState;
  isGenerating: boolean;
  isSaving: boolean;
  saveState?: ChannelSaveState;
  onCopyText: (text: string) => void;
  onCopyHtml: (html: string) => void;
  onRegenerate: () => void;
  onRollback: () => void;
  onSave: (isHighPerformance: boolean) => void;
}

function CollapsibleSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="blog-section blog-collapsible">
      <button
        type="button"
        className="blog-collapsible-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{title}</span>
        <span className="blog-collapsible-icon">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="blog-collapsible-body">{children}</div>}
    </section>
  );
}

export function MagazineOutputPanel({
  goal,
  hasHydrated,
  output,
  magazineEnhancement,
  isGenerating,
  isSaving,
  saveState,
  onCopyText,
  onCopyHtml,
  onRegenerate,
  onRollback,
  onSave,
}: MagazineOutputPanelProps) {
  const goalMeta = GOAL_CHANNELS[goal];
  const hasContent = hasHydrated && isValidOutput(output?.content);
  const isError =
    hasHydrated && Boolean(output?.content?.startsWith("생성 실패"));
  const historyCount = hasHydrated ? (output?.history.length ?? 0) : 0;
  const parsed = magazineEnhancement.magazineParsed;
  const displayTitle =
    parsed?.title || magazineEnhancement.magazineContentRaw.split("\n")[0] || "";

  const handleCopyHtml = () => {
    if (magazineEnhancement.magazineContentHtml) {
      onCopyHtml(magazineEnhancement.magazineContentHtml);
    }
  };

  const handleCopyRaw = () => {
    if (magazineEnhancement.magazineContentRaw) {
      onCopyText(magazineEnhancement.magazineContentRaw);
    }
  };

  const handleCopyHtmlCode = () => {
    if (magazineEnhancement.magazineContentHtml) {
      const standalone = buildMagazineStandaloneHtml(
        magazineEnhancement.magazineContentHtml,
        displayTitle
      );
      onCopyText(standalone);
    }
  };

  const handleDownloadHtml = () => {
    if (magazineEnhancement.magazineContentHtml) {
      const standalone = buildMagazineStandaloneHtml(
        magazineEnhancement.magazineContentHtml,
        displayTitle
      );
      downloadTextFile(
        standalone,
        getMagazineHtmlDownloadFilename(displayTitle),
        "text/html;charset=utf-8"
      );
    }
  };

  return (
    <div className="channel-output blog-output-panel magazine-output-panel">
      <div className="channel-output-header">
        <div className="channel-output-title">
          <h2>{CH_LABELS.Magazine}</h2>
          <span className="goal-badge small" style={{ color: goalMeta.color }}>
            {goalMeta.group}
          </span>
        </div>
        <div className="channel-output-actions">
          {hasContent && (
            <>
              <button
                type="button"
                className="ghost-btn"
                disabled={isSaving}
                onClick={() => onSave(false)}
              >
                {isSaving ? "저장 중..." : "💾 저장"}
              </button>
              <button
                type="button"
                className="ghost-btn"
                disabled={isSaving}
                onClick={() => onSave(true)}
              >
                {isSaving ? "저장 중..." : "⭐ 고성과 저장"}
              </button>
            </>
          )}
          {hasContent && magazineEnhancement.magazineContentHtml && (
            <>
              <button
                type="button"
                className="ghost-btn"
                onClick={handleCopyHtml}
              >
                📋 HTML 서식 포함 복사
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={handleCopyHtmlCode}
              >
                🧾 HTML/CSS 코드 복사
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={handleDownloadHtml}
              >
                ⬇️ HTML 파일 다운로드
              </button>
            </>
          )}
          {hasContent && magazineEnhancement.magazineContentRaw && (
            <button
              type="button"
              className="ghost-btn"
              onClick={handleCopyRaw}
            >
              📄 순수 원문 복사
            </button>
          )}
          <button
            type="button"
            className="ghost-btn accent"
            disabled={isGenerating}
            onClick={onRegenerate}
          >
            {isGenerating ? "⟳ 생성중..." : "↺ 재생성"}
          </button>
        </div>
      </div>

      {isGenerating ? (
        <div className="output-placeholder loading">
          <div className="spinner" />
          <p>홈페이지 매거진 콘텐츠 생성 중...</p>
        </div>
      ) : hasHydrated && output?.content ? (
        <div className={`output-card ${isError ? "error" : ""}`}>
          <div className="output-meta">
            <span>생성됨 · {output.ts}</span>
            {saveState?.saved && (
              <span className="saved-badge">
                {saveState.isHighPerformance ? "⭐ 고성과 저장됨" : "💾 저장됨"}
              </span>
            )}
            {historyCount > 0 && (
              <button
                type="button"
                className="rollback-btn"
                onClick={() => {
                  if (window.confirm("이전 버전으로 되돌릴까요?")) {
                    onRollback();
                  }
                }}
              >
                ↩ v{historyCount} 되돌리기
              </button>
            )}
          </div>

          <div className="blog-sections">
            {displayTitle && (
              <div className="blog-adopted-title">
                <span className="blog-adopted-label">매거진 제목</span>
                <h3>{displayTitle}</h3>
              </div>
            )}

            <section className="blog-section">
              <h3 className="blog-section-title">HTML 미리보기</h3>
              <p className="magazine-html-copy-info">
                서식 포함 복사는 CMS 붙여넣기용이고, HTML/CSS 코드
                복사·다운로드는 브라우저 미리보기 확인용입니다.
              </p>
              {magazineEnhancement.htmlFormatting ? (
                <div className="blog-html-loading">
                  <div className="spinner small" />
                  <span>AI HTML 포맷 변환 중...</span>
                </div>
              ) : magazineEnhancement.magazineContentHtml ? (
                <div
                  className="blog-html-preview"
                  dangerouslySetInnerHTML={{
                    __html: magazineEnhancement.magazineContentHtml,
                  }}
                />
              ) : (
                <p className="blog-section-empty">
                  HTML 미리보기가 아직 생성되지 않았습니다.
                </p>
              )}
            </section>

            {magazineEnhancement.rawLengthWarning && (
              <p className="magazine-raw-warning" role="status">
                ⚠️ {magazineEnhancement.rawLengthWarning}
              </p>
            )}

            {magazineEnhancement.magazineContentRaw && (
              <>
                <p className="magazine-save-info">
                  <span
                    className="magazine-info-icon"
                    title="저장 시 HTML 표는 문장형 텍스트로 풀어서 저장되며, 시각화 자료 placeholder는 저장되지 않습니다. HTML 미리보기와 복사는 CMS 편집용입니다. 예: HTML 표 → '직접 인력 확충과 CS쉐어링 서비스는 온보딩 기간, 비용, 운영 방식에서 차이가 있습니다…' 형태로 저장"
                    aria-label="저장 안내"
                  >
                    ⓘ
                  </span>
                  저장 시 HTML 표·시각화 placeholder는 제외되고 순수 원문만
                  저장됩니다.
                </p>
                <CollapsibleSection title="순수 원문 보기">
                  <div className="output-content blog-raw-content">
                    {magazineEnhancement.magazineContentRaw}
                  </div>
                </CollapsibleSection>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="output-placeholder">
          <p className="placeholder-title">홈페이지 매거진 콘텐츠 없음</p>
          <p className="placeholder-sub">
            왼쪽 ⚡ 전체 채널 생성을 클릭하세요
          </p>
        </div>
      )}
    </div>
  );
}
