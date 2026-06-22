"use client";

import { useState } from "react";

import { downloadTextFile } from "@/lib/blog/copyHelpers";
import type { InstagramCardnewsState } from "@/lib/instagram/types";
import type { BlogEnhancementState } from "@/lib/blog/types";

interface InstagramCardnewsPanelProps {
  blogEnhancement: BlogEnhancementState;
  cardnews: InstagramCardnewsState;
  onGenerate: () => void;
  onCopyCaption: (text: string) => void;
  onCopyHashtags: (text: string) => void;
}

function CollapsibleBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="cardnews-collapsible">
      <button
        type="button"
        className="blog-collapsible-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{title}</span>
        <span className="blog-collapsible-icon">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="blog-collapsible-body">{children}</div>}
    </div>
  );
}

export function InstagramCardnewsPanel({
  blogEnhancement,
  cardnews,
  onGenerate,
  onCopyCaption,
  onCopyHashtags,
}: InstagramCardnewsPanelProps) {
  const hasBlogRaw = Boolean(blogEnhancement.blogContentRaw?.trim());

  const handleDownloadHtml = () => {
    if (!cardnews.cardnewsHtml) {
      return;
    }
    downloadTextFile(
      cardnews.cardnewsHtml,
      "instagram-cardnews.html",
      "text/html"
    );
  };

  return (
    <section className="blog-section cardnews-panel">
      <h3 className="blog-section-title">인스타 카드뉴스 (HTML/CSS)</h3>
      <p className="blog-prompt-note">
        블로그 원문을 기준으로 Claude가 전체 카드뉴스 HTML/CSS를 직접
        생성합니다. 시각화 자료 삽입 제안은 슬라이드 구성 참고용입니다.
      </p>

      {!hasBlogRaw && (
        <p className="blog-section-empty">
          먼저 네이버 블로그 원문을 생성해주세요.
        </p>
      )}

      <button
        type="button"
        className="ghost-btn accent"
        disabled={!hasBlogRaw || cardnews.generating}
        onClick={onGenerate}
      >
        {cardnews.generating
          ? "생성 중..."
          : "📱 인스타 카드뉴스 + 캡션 생성"}
      </button>

      {cardnews.generating && (
        <div className="blog-html-loading">
          <div className="spinner small" />
          <span>카드뉴스 HTML/CSS 생성 중...</span>
        </div>
      )}

      {cardnews.error && (
        <p className="blog-prompt-error">{cardnews.error}</p>
      )}

      {cardnews.cardnewsHtml && !cardnews.generating && (
        <div className="cardnews-results">
          <div className="cardnews-actions">
            <button
              type="button"
              className="ghost-btn small"
              onClick={handleDownloadHtml}
            >
              ⬇ HTML 다운로드
            </button>
            {cardnews.caption && (
              <button
                type="button"
                className="ghost-btn small"
                onClick={() => onCopyCaption(cardnews.caption)}
              >
                📋 캡션 복사
              </button>
            )}
            {cardnews.hashtags && (
              <button
                type="button"
                className="ghost-btn small"
                onClick={() => onCopyHashtags(cardnews.hashtags)}
              >
                # 해시태그 복사
              </button>
            )}
            {cardnews.model && (
              <span className="cardnews-model-hint">model: {cardnews.model}</span>
            )}
          </div>

          <div className="cardnews-preview-section">
            <h4 className="cardnews-preview-label">카드뉴스 미리보기</h4>
            <div className="cardnews-preview-scaler-wrap">
              <iframe
                title="인스타 카드뉴스 미리보기"
                className="cardnews-preview-iframe"
                sandbox="allow-same-origin"
                srcDoc={cardnews.cardnewsHtml}
              />
            </div>
          </div>

          <CollapsibleBlock title="스토리보드 보기">
            <pre className="cardnews-text-block">{cardnews.storyboard}</pre>
          </CollapsibleBlock>

          <CollapsibleBlock title="self-review 보기">
            <pre className="cardnews-text-block">{cardnews.selfReview}</pre>
          </CollapsibleBlock>
        </div>
      )}
    </section>
  );
}
