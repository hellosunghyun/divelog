import { clearLocalDraft, type DraftData } from '~/lib/infra/draft-storage';

function extractPreviewText(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
      const text = extractNodeText(parsed);
      return text.replace(/\n{3,}/g, '\n\n').trim();
    }
    return content;
  } catch {
    return content;
  }
}

function extractNodeText(node: { type?: string; text?: string; content?: Array<{ type?: string; text?: string; content?: unknown[]; attrs?: Record<string, unknown> }>; attrs?: Record<string, unknown> }): string {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak' || node.type === 'horizontalRule') return '\n';
  if (node.type === 'mention' || node.type === 'userMention') {
    const label = (node.attrs?.label as string) ?? '';
    return label ? `@${label}` : '';
  }
  const children = (node.content ?? []).map((child) => extractNodeText(child as typeof node)).join('');
  const blockTypes = new Set(['paragraph', 'heading', 'blockquote', 'listItem', 'bulletList', 'orderedList', 'codeBlock']);
  if (node.type && blockTypes.has(node.type)) return `${children}\n`;
  return children;
}

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

  const preview = extractPreviewText(draft.content);
  const displayText = preview || draft.title || '내용 없음';

  return (
    <div
      data-testid="draft-recovery-prompt"
      className="mb-4 rounded-2xl border border-mist-blue bg-mist-blue/30 p-4"
    >
      <p className="text-sm text-text-secondary mb-2">
        이전에 작성하던 글이 있습니다.
      </p>
      {draft.title && (
        <p className="text-sm font-medium text-text-primary mb-1">
          {draft.title}
        </p>
      )}
      <p className="text-xs text-text-tertiary mb-3 line-clamp-2">
        {displayText.slice(0, 150)}
        {displayText.length > 150 ? '...' : ''}
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
