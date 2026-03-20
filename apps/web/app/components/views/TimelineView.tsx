import { cn } from "~/lib/utils/cn";
import CompactTimelineCard from "~/components/cards/CompactTimelineCard";
import EmptyState from "~/components/feedback/EmptyState";

interface TimelineRecord {
  id: string;
  slug: string;
  title: string;
  contentSnippet?: string | null;
  format: "note" | "article";
  createdAt: number;
}

interface TimelineViewProps {
  records: TimelineRecord[];
  isRead?: (recordId: string) => boolean;
}

export default function TimelineView({ records, isRead }: TimelineViewProps) {
  if (records.length === 0) {
    return <EmptyState variant="records" message="조건에 맞는 기록이 없습니다." />;
  }

  const formats = new Set(records.map((r) => r.format));
  const singleFormat = formats.size === 1;

  return (
    <div className="relative mx-auto max-w-4xl isolate">
      <div
        className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-border hidden md:block -z-10"
        aria-hidden="true"
      />
      <div
        className="absolute left-5 top-0 bottom-0 w-px bg-border md:hidden -z-10"
        aria-hidden="true"
      />

      <div className="flex flex-col gap-5 md:gap-6">
        {records.map((record) => {
          const isNote = record.format === "note";

          return (
            <div key={record.id} className="relative z-10">
              {singleFormat ? (
                <div className="hidden md:flex md:flex-col md:items-center">
                  <span
                    className={cn(
                      "w-2.5 h-2.5 rounded-full ring-2 ring-surface",
                      isNote ? "bg-reef-cyan" : "bg-ocean-blue",
                    )}
                    aria-hidden="true"
                  />
                  <div className="w-full max-w-md mt-3">
                    <CompactTimelineCard
                      slug={record.slug}
                      title={record.title}
                      contentSnippet={record.contentSnippet}
                      format={record.format}
                      createdAt={record.createdAt}
                      isRead={isRead?.(record.id)}
                    />
                  </div>
                </div>
              ) : (
                <div className="hidden md:grid md:grid-cols-[1fr_48px_1fr] items-start">
                  <div className={cn("flex", isNote ? "justify-end pr-6" : "") }>
                    {isNote && (
                      <div className="w-full max-w-sm">
                        <CompactTimelineCard
                          slug={record.slug}
                          title={record.title}
                          contentSnippet={record.contentSnippet}
                          format={record.format}
                          createdAt={record.createdAt}
                          isRead={isRead?.(record.id)}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center pt-5">
                    <span
                      className={cn(
                        "w-2.5 h-2.5 rounded-full ring-2 ring-surface",
                        isNote ? "bg-reef-cyan" : "bg-ocean-blue",
                      )}
                      aria-hidden="true"
                    />
                  </div>

                  <div className={cn("flex", !isNote ? "justify-start pl-6" : "") }>
                    {!isNote && (
                      <div className="w-full max-w-sm">
                        <CompactTimelineCard
                          slug={record.slug}
                          title={record.title}
                          contentSnippet={record.contentSnippet}
                          format={record.format}
                          createdAt={record.createdAt}
                          isRead={isRead?.(record.id)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="md:hidden relative pl-14">
                <span
                  className={cn(
                    "absolute left-[17px] top-5 w-3 h-3 rounded-full ring-2 ring-surface z-10",
                    isNote ? "bg-reef-cyan" : "bg-ocean-blue",
                  )}
                  aria-hidden="true"
                />
                <CompactTimelineCard
                  slug={record.slug}
                  title={record.title}
                  contentSnippet={record.contentSnippet}
                  format={record.format}
                  createdAt={record.createdAt}
                  isRead={isRead?.(record.id)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
