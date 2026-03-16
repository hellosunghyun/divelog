import type { Route } from "./+types/index";
import { Link } from "react-router";
import { getAllTags } from "~/db/queries/tags.server";
import EmptyState from "~/components/EmptyState";
import HeroSection from "~/components/HeroSection";
import { createLogger } from "~/lib/logger.server";

export function meta() {
  return [
    { title: "태그 — divelog" },
    { name: "description", content: "태그별로 기록을 탐색합니다." },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "tags" });
  logger.info("loader_start");
  const tags = await getAllTags(context.cloudflare.env.DB);
  logger.info("loader_end");
  return { tags };
}

export default function TagsPage({ loaderData }: Route.ComponentProps) {
  const { tags } = loaderData;

  return (
    <div>
      <HeroSection
        variant="stage"
        title="태그"
        subtitle="태그별로 기록을 탐색합니다"
      />

      <div className="max-w-content mx-auto px-6 py-12 md:py-16">
        {tags.length === 0 ? (
          <EmptyState variant="generic" message="아직 태그가 없습니다." />
        ) : (
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                to={`/tags/${tag.slug}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-surface text-text-primary text-sm font-medium transition-all duration-normal hover:border-reef-cyan/40 hover:bg-mist-blue/20 hover:text-ocean-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
              >
                <span>{tag.name}</span>
                <span className="text-caption text-text-tertiary">
                  {tag.usageCount}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
