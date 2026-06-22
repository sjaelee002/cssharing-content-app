"use client";

interface DraftPanelProps {
  draft: string;
  onDraftChange: (value: string) => void;
  onResetWork?: () => void;
}

export function DraftPanel({ draft, onDraftChange, onResetWork }: DraftPanelProps) {
  const handleReset = () => {
    if (
      !window.confirm("현재 입력과 생성 결과를 모두 초기화할까요?")
    ) {
      return;
    }
    onResetWork?.();
  };

  return (
    <section className="panel-section">
      <div className="draft-panel-header">
        <label className="field-label" htmlFor="draft-input">
          초안 콘텐츠
        </label>
        {onResetWork && (
          <button
            type="button"
            className="ghost-btn small reset-work-btn"
            onClick={handleReset}
          >
            내 작업 초기화
          </button>
        )}
      </div>
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
