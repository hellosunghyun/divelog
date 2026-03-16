interface TimelineNode {
  id: string;
  type: "question" | "self_answer" | "response" | "carry_over";
  content: string;
  authorName: string;
  createdAt: number;
  responseType?: string;
}

interface QuestionTimelineProps {
  question: {
    id: string;
    content: string;
    direction: string;
    createdAt: number;
    authorName: string;
  };
  selfAnswers: {
    id: string;
    content: string;
    authorName: string;
    createdAt: number;
  }[];
  responses: {
    id: string;
    content: string;
    type: string;
    authorName: string;
    createdAt: number;
    questionId?: string;
  }[];
  isOwn: boolean;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

function getDirectionLabel(direction: string): string {
  if (direction === "inward") return "스스로에게 묻다";
  if (direction === "next_stage") return "다음 구간으로 가져갈 질문";
  return "함께 생각해볼 질문";
}

function toSnippet(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }
  return `${content.slice(0, maxLength)}...`;
}

export function QuestionTimeline({ question, selfAnswers, responses, isOwn }: QuestionTimelineProps) {
  const questionResponses = responses.filter((response) => {
    if (!response.questionId) {
      return true;
    }
    return response.questionId === question.id;
  });

  const nodes: TimelineNode[] = [
    {
      id: question.id,
      type: "question" as const,
      content: question.content,
      authorName: question.authorName,
      createdAt: question.createdAt,
    },
    ...(isOwn
      ? selfAnswers.map((selfAnswer) => ({
          id: selfAnswer.id,
          type: "self_answer" as const,
          content: selfAnswer.content,
          authorName: selfAnswer.authorName,
          createdAt: selfAnswer.createdAt,
        }))
      : []),
    ...questionResponses.map((response) => ({
      id: response.id,
      type: "response" as const,
      content: response.content,
      authorName: response.authorName,
      createdAt: response.createdAt,
      responseType: response.type,
    })),
  ].sort((a, b) => a.createdAt - b.createdAt);

  return (
    <div data-testid="question-timeline" className="relative rounded-2xl border border-border bg-surface p-6 lg:p-7">
      <div className="absolute left-9 top-12 bottom-8 w-px bg-[--color-border]" aria-hidden="true" />

      <div className="flex flex-col gap-6">
        {nodes.map((node) => {
          if (node.type === "question") {
            return (
              <div key={node.id} className="relative flex gap-3">
                <div className="mt-1 z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-[--color-ocean-blue]/30 bg-[--color-ocean-blue]/10">
                  <span className="text-xs text-[--color-ocean-blue]">?</span>
                </div>
                <div>
                  <p className="mb-1 text-xs text-[--color-text-tertiary]">
                    {getDirectionLabel(question.direction)} · {formatRelativeTime(node.createdAt)}
                  </p>
                  <p className="text-base font-medium text-[--color-text-primary]">{node.content}</p>
                </div>
              </div>
            );
          }

          if (node.type === "self_answer") {
            return (
              <div key={node.id} className="relative flex gap-3">
                <div className="mt-1 z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-[--color-reef-cyan]/30 bg-[--color-mist-blue]">
                  <span className="text-xs text-[--color-ocean-blue]">↺</span>
                </div>
                <div>
                  <p className="mb-1 text-xs text-[--color-text-tertiary]">자기답변 · {formatRelativeTime(node.createdAt)}</p>
                  <p className="text-sm text-[--color-text-secondary]">{toSnippet(node.content, 100)}</p>
                </div>
              </div>
            );
          }

          return (
            <div key={node.id} className="relative flex gap-3">
              <div className="mt-1 z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-[--color-border] bg-[--color-surface-secondary]">
                <span className="text-xs text-[--color-text-tertiary]">
                  {(node.responseType?.[0] ?? "응").toUpperCase()}
                </span>
              </div>
              <div>
                <p className="mb-1 text-xs text-[--color-text-tertiary]">
                  {node.authorName} · {node.responseType ?? "응답"} · {formatRelativeTime(node.createdAt)}
                </p>
                <p className="text-sm text-[--color-text-secondary]">{toSnippet(node.content, 80)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
