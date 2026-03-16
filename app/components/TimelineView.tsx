import { Link } from "~/components/SmartLink";
import { groupRecordsByDate } from "../lib/date-groups";

interface TimelineRecord {
  id: string;
  slug: string;
  title: string;
  contentSnippet: string;
  createdAt: number;
  author?: {
    displayName: string | null;
    slug: string | null;
  } | null;
}

interface TimelineViewProps {
  records: TimelineRecord[];
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

export default function TimelineView({ records }: TimelineViewProps) {
  const groups = groupRecordsByDate(records);

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.key} className="space-y-3">
          <h3 className="text-sm font-semibold text-text-secondary tracking-tight">
            {group.label}
          </h3>

          <ol className="ml-2 border-l-2 border-border pl-6 space-y-3">
            {group.records.map((record) => (
              <li key={record.id} className="relative">
                <span
                  className="absolute -left-[29px] top-[18px] block h-2 w-2 rounded-full bg-reef-cyan"
                  aria-hidden="true"
                />

                <Link
                  to={`/logs/${record.slug}`}
                  className="block rounded-xl border border-border bg-surface px-4 py-3 no-underline transition-colors duration-normal hover:border-mist-blue-deep hover:bg-surface-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
                >
                  <p className="text-base font-semibold text-text-primary leading-title tracking-tight m-0">
                    {record.title}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary leading-body m-0">
                    {record.contentSnippet}
                  </p>

                  <p className="mt-2 text-sm text-text-tertiary leading-small m-0">
                    <span>{record.author?.displayName ?? "이름 없는 러너"}</span>
                    <span className="mx-2" aria-hidden="true">·</span>
                    <span>{formatRelativeTime(record.createdAt)}</span>
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
