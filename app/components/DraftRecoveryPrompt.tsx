import { clearLocalDraft, type DraftData } from '~/lib/draft-storage';

interface DraftRecoveryPromptProps {
  draft: DraftData;
  format: 'note' | 'article';
  onRecover: () => void;
  onDiscard: () => void;
}

export function DraftRecoveryPrompt({
  draft,
  format,
  onRecover,
  onDiscard,
}: DraftRecoveryPromptProps) {
  const handleDiscard = () => {
    clearLocalDraft(format);
    onDiscard();
  };

  return (
    <div
      data-testid="draft-recovery-prompt"
      className="mb-4 rounded-2xl border border-mist-blue bg-mist-blue/30 p-4"
    >
      <p className="text-sm text-text-secondary mb-2">
        이전에 작성하던 글이 있습니다.
      </p>
      <p className="text-xs text-text-tertiary mb-3 line-clamp-2">
        {draft.content.slice(0, 150)}
        {draft.content.length > 150 ? '...' : ''}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          data-testid="draft-recover-button"
          onClick={onRecover}
          className="text-sm text-ocean-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2 rounded px-1"
        >
          이어서 작성하기
        </button>
        <button
          type="button"
          data-testid="draft-discard-button"
          onClick={handleDiscard}
          className="text-sm text-text-tertiary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-tertiary focus-visible:ring-offset-2 rounded px-1"
        >
          버리기
        </button>
      </div>
    </div>
  );
}
