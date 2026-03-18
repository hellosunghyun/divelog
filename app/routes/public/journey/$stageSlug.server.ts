import { desc, eq, sql } from "drizzle-orm";
import { data } from "react-router";
import type { Route } from "./+types/$stageSlug";
import { db } from "~/db/client.server";
import { getStageBySlug, getStages } from "~/db/queries/journey/stages.server";
import { questions, records } from "~/db/schema.server";
import { createLogger } from "~/lib/infra/logger.server";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { stageSlug } = params;
  const logger = createLogger(request, context.cloudflare.env).child({ route: "journey_stage_detail" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);

  const stage = await getStageBySlug(context.cloudflare.env.DB, stageSlug || "");
  if (!stage) {
    logger.info("not_found", { slug: stageSlug });
    throw data("Stage를 찾을 수 없습니다", { status: 404 });
  }

  const allStages = await getStages(context.cloudflare.env.DB);

  const stageQuestions = await database
    .select({
      question: questions,
      recordSlug: records.slug,
      recordTitle: records.title,
    })
    .from(questions)
    .leftJoin(records, eq(questions.recordId, records.id))
    .where(sql`${questions.isOpen} = 1 AND ${records.visibility} IN ('cohort', 'public')`)
    .orderBy(desc(questions.createdAt))
    .limit(10);

  logger.info("loader_end");
  return { stage, allStages, stageQuestions };
}
