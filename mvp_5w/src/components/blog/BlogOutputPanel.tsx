"use client";

import { useState, type ReactNode } from "react";

import { htmlToBlogText } from "@/lib/blog/copyHelpers";
import { CH_LABELS, GOAL_CHANNELS } from "@/lib/prompts/constants";
import { isValidOutput } from "@/lib/local-storage";
import type {
  BlogEnhancementState,
  ChannelSaveState,
  Goal,
} from "@/lib/types";

interface BlogOutputPanelProps {
  goal: Goal;
  hasHydrated: boolean;
  output?: {
    content: string;
    ts: string;
    history: { content: string; ts: string; instruction?: string }[];
  };
  blogEnhancement: BlogEnhancementState;
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
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

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

function TagList({ tags }: { tags: string[] }) {
  if (!tags.length) {
    return <p className="blog-section-empty">추천 태그가 없습니다.</p>;
  }
  return (
    <div className="blog-tag-list">
      {tags.map((tag) => (
        <span key={tag} className="blog-tag">
          {tag}
        </span>
      ))}
    </div>
  );
}

function VisualSuggestionCards({
  suggestions,
}: {
  suggestions: NonNullable<BlogEnhancementState["blogParsed"]>["imageSuggestions"];
}) {
  if (!suggestions.length) {
    return (
      <p className="blog-section-empty">시각화 자료 삽입 제안이 없습니다.</p>
    );
  }
  return (
    <div className="blog-image-suggestion-grid">
      {suggestions.map((img) => (
        <div key={img.index} className="blog-image-suggestion-card">
          <div className="blog-card-header">
            <span className="blog-card-index">시각화 자료 {img.index}</span>
            {img.position && (
              <span className="blog-card-position">{img.position}</span>
            )}
          </div>
          {img.imageType && (
            <p className="blog-card-type">
              <strong>유형</strong> {img.imageType}
            </p>
          )}
          <p className="blog-card-desc">{img.description}</p>
          {img.captionKeywords && (
            <p className="blog-card-caption">
              <strong>캡션 키워드</strong> {img.captionKeywords}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export function BlogOutputPanel({
  goal,
  hasHydrated,
  output,
  blogEnhancement,
  isGenerating,
  isSaving,
  saveState,
  onCopyText,
  onCopyHtml,
  onRegenerate,
  onRollback,
  onSave,
}: BlogOutputPanelProps) {
  const goalMeta = GOAL_CHANNELS[goal];
  const hasContent = hasHydrated && isValidOutput(output?.content);
  const isError =
    hasHydrated && Boolean(output?.content?.startsWith("생성 실패"));
  const historyCount = hasHydrated ? (output?.history.length ?? 0) : 0;
  const parsed = blogEnhancement.blogParsed;

  const handleCopyHtml = () => {
    if (blogEnhancement.blogContentHtml) {
      onCopyHtml(blogEnhancement.blogContentHtml);
    }
  };

  const handleCopyBlogText = () => {
    if (blogEnhancement.blogContentHtml) {
      onCopyText(htmlToBlogText(blogEnhancement.blogContentHtml));
    } else if (parsed?.bodyText) {
      onCopyText(parsed.bodyText);
    }
  };

  const handleCopyPureBody = () => {
    if (parsed?.bodyText) {
      onCopyText(parsed.bodyText);
    } else if (output?.content) {
      onCopyText(output.content);
    }
  };

  return (
    <div className="channel-output blog-output-panel">
      <div className="channel-output-header">
        <div className="channel-output-title">
          <h2>{CH_LABELS.Blog}</h2>
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
          {hasContent && blogEnhancement.blogContentHtml && (
            <button
              type="button"
              className="ghost-btn"
              onClick={handleCopyHtml}
            >
              📋 HTML 복사
            </button>
          )}
          {hasContent && (
            <>
              <button
                type="button"
                className="ghost-btn"
                onClick={handleCopyBlogText}
              >
                📝 블로그 텍스트
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={handleCopyPureBody}
              >
                📄 순수 본문
              </button>
            </>
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
          <p>네이버 블로그 콘텐츠 생성 중...</p>
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
            {parsed?.mainTitle && (
              <div className="blog-adopted-title">
                <span className="blog-adopted-label">채택 제목</span>
                <h3>{parsed.mainTitle}</h3>
              </div>
            )}

            <section className="blog-section">
              <h3 className="blog-section-title">HTML 미리보기</h3>
              {blogEnhancement.htmlFormatting ? (
                <div className="blog-html-loading">
                  <div className="spinner small" />
                  <span>AI HTML 포맷 변환 중...</span>
                </div>
              ) : blogEnhancement.blogContentHtml ? (
                <div
                  className="blog-html-preview"
                  dangerouslySetInnerHTML={{
                    __html: blogEnhancement.blogContentHtml,
                  }}
                />
              ) : (
                <p className="blog-section-empty">
                  HTML 미리보기가 아직 생성되지 않았습니다.
                </p>
              )}
            </section>

            {parsed && (
              <>
                <section className="blog-section">
                  <h3 className="blog-section-title">추천 태그</h3>
                  <TagList tags={parsed.recommendedTags} />
                </section>

                <section className="blog-section">
                  <h3 className="blog-section-title">대체 제목</h3>
                  {parsed.alternateTitles.length > 0 ? (
                    <ul className="blog-alt-titles">
                      {parsed.alternateTitles.map((title, i) => (
                        <li key={`${title}-${i}`}>{title}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="blog-section-empty">대체 제목이 없습니다.</p>
                  )}
                </section>

                <section className="blog-section">
                  <h3 className="blog-section-title">
                    시각화 자료 삽입 제안
                  </h3>
                  <p className="blog-prompt-note">
                    이 제안은 카드뉴스/디자인 생성 시 참고 자료로 활용됩니다.
                  </p>
                  <VisualSuggestionCards suggestions={parsed.imageSuggestions} />
                </section>

                <CollapsibleSection title="원문 보기">
                  <div className="output-content blog-raw-content">
                    {output.content}
                  </div>
                </CollapsibleSection>

                {parsed.selfCheckText && (
                  <CollapsibleSection title="자기점검 보기">
                    <div className="blog-self-check">{parsed.selfCheckText}</div>
                  </CollapsibleSection>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="output-placeholder">
          <p className="placeholder-title">네이버 블로그 콘텐츠 없음</p>
          <p className="placeholder-sub">
            왼쪽 ⚡ 전체 채널 생성을 클릭하세요
          </p>
        </div>
      )}
    </div>
  );
}
