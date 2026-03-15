interface SelfAnswerCardProps {
  selfAnswer: {
    id: string;
    content: string;
    createdAt: number;
    author?: {
      displayName: string | null;
      profilePhotoUrl: string | null;
    } | null;
  };
}

function formatTimestamp(unixEpoch: number): string {
  const date = new Date(unixEpoch * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

export default function SelfAnswerCard({ selfAnswer }: SelfAnswerCardProps) {
  return (
    <article
      data-testid="self-answer-card"
      className="rounded-2xl border border-reef-cyan/40 bg-mist-blue/50 p-5 lg:p-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-caption px-2.5 py-1 rounded-full font-medium bg-mist-blue text-ocean-blue">
          자기 답변
        </span>
        <span className="text-meta text-text-tertiary">
          {formatTimestamp(selfAnswer.createdAt)}
        </span>
      </div>

      <p className="text-base leading-body text-text-primary m-0 whitespace-pre-wrap">
        {selfAnswer.content}
      </p>
    </article>
  );
}
