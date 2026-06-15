"use client";

interface DraftPanelProps {
  draft: string;
  onDraftChange: (value: string) => void;
}

export function DraftPanel({ draft, onDraftChange }: DraftPanelProps) {
  return (
    <section className="panel-section">
      <label className="field-label" htmlFor="draft-input">
        초안 콘텐츠
      </label>
      <textarea
        id="draft-input"
        className="draft-textarea"
        placeholder={
          "콘텐츠 초안을 입력하세요...\n이 내용을 기반으로 각 채널별 글이 생성됩니다."
        }
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
      />
    </section>
  );
}
