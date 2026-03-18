import type { Route } from "./+types/$tagSlug";
import { Link } from "~/components/content/SmartLink";
import { data } from "react-router";
import { normalizeContentFormat } from "~/lib/content/editor-extensions";
import SceneCard from "~/components/cards/SceneCard";
import EmptyState from "~/components/feedback/EmptyState";
import HeroSection from "~/components/sections/HeroSection";
import { getTagBySlug, getRecordsByTag } from "~/db/queries/records/tags.server";
import { getPlainText } from "~/lib/content/content.server";
import { createLogger } from "~/lib/infra/logger.server";

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData?.tag) {
    return [{ title: "태그 — DiveLog" }];
  }

  return [
    { title: `${loaderData.tag.name} — DiveLog` },
    { name: "description", content: `"${loaderData.tag.name}" 태그가 붙은 기록 목록` },
  ];
}

export function shouldRevalidate({
  formMethod,
  defaultShouldRevalidate,
}: {
  formMethod?: string;
  defaultShouldRevalidate: boolean;
}): boolean {
  if (formMethod && formMethod !== "GET") {
    return defaultShouldRevalidate;
  }
  return false;
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { tagSlug } = params;
  const logger = createLogger(request, context.cloudflare.env).child({ route: "tag_detail" });
  logger.info("loader_start");

  const tag = await getTagBySlug(context.cloudflare.env.DB, tagSlug);

  if (!tag) {
    logger.info("not_found", { slug: tagSlug });
    throw data("태그를 찾을 수 없습니다.", { status: 404 });
  }

  const records = await getRecordsByTag(context.cloudflare.env.DB, tag.id);

  const recordsWithSnippets = records.map((record) => {
    const plainTextContent = getPlainText(record.content, normalizeContentFormat(record.format));

    return {
      ...record,
      contentSnippet:
        plainTextContent.substring(0, 120) + (plainTextContent.length > 120 ? "…" : ""),
    };
  });

  logger.info("loader_end");
  return { tag, records: recordsWithSnippets };
}

export default function TagDetailPage({ loaderData }: Route.ComponentProps) {
  const { tag, records: taggedRecords } = loaderData;

  return (
    <div>
      <HeroSection
        variant="stage"
        title={
          <span>
            <Link to="/tags" className="text-text-tertiary hover:text-text-primary transition-colors no-underline">
              태그
            </Link>
            {" / "}
            {tag.name}
          </span>
        }
        subtitle={`"${tag.name}" 태그가 붙은 기록 ${taggedRecords.length}개`}
      />

      <div className="max-w-content mx-auto px-6 py-12 md:py-16">
        {taggedRecords.length === 0 ? (
          <EmptyState variant="records" message="이 태그가 붙은 기록이 없습니다." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {taggedRecords.map((record) => (
              <SceneCard
                key={record.id}
                record={{
                  slug: record.slug,
                  title: record.title,
                  content: record.content,
                  format: record.format as "note" | "article",
                  type: record.type as "personal" | "challenge" | "collaboration",
                  rhythm: record.rhythm ?? undefined,
                  createdAt: record.createdAt,
                }}
                contentSnippet={record.contentSnippet}
                author={
                  record.author?.displayName
                    ? {
                        displayName: record.author.displayName,
                        slug: record.author.slug ?? "",
                      }
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div className="text-center py-16 px-4">
      <p className="text-xl font-semibold text-text-primary">태그를 찾을 수 없습니다.</p>
      <Link
        to="/tags"
        className="mt-4 inline-block rounded-full bg-deep-ocean text-white px-7 py-3 text-[15px] font-medium hover:bg-ocean-blue transition-all shadow-sm hover:shadow-md no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
      >
        태그 목록으로
      </Link>
    </div>
  );
}
