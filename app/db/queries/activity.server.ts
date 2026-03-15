import { and, count, desc, eq, gt, lte, sql } from "drizzle-orm";
import { db } from "../client.server";
import { collaborationUnits, questions, records, responses } from "../schema.server";

export interface ActivityItem {
  type: "record" | "question" | "response" | "collaboration";
  summary: string;
  count: number;
  timestamp: number;
  period: "today" | "this_week" | "last_week";
}

export interface ActivitySummary {
  records: number;
  questions: number;
  responses: number;
  collaborations: number;
  latestTimestamp: number;
}

function getTimeBoundaries(): {
  now: number;
  todayStart: number;
  weekStart: number;
  prevWeekStart: number;
} {
  const now = Math.floor(Date.now() / 1000);
  const todayStart = now - 86400;
  const weekStart = now - 7 * 86400;
  const prevWeekStart = now - 14 * 86400;

  return { now, todayStart, weekStart, prevWeekStart };
}

async function getActivityForPeriod(
  database: ReturnType<typeof db>,
  startTime: number,
  endTime: number,
): Promise<ActivitySummary> {
  const [recordResult] = await database
    .select({ count: count() })
    .from(records)
    .where(
      and(
        gt(records.createdAt, startTime),
        lte(records.createdAt, endTime),
        sql`${records.visibility} != 'draft'`,
      ),
    );

  const [questionResult] = await database
    .select({ count: count() })
    .from(questions)
    .innerJoin(records, eq(questions.recordId, records.id))
    .where(
      and(
        gt(questions.createdAt, startTime),
        lte(questions.createdAt, endTime),
        sql`${records.visibility} != 'draft'`,
      ),
    );

  const [responseResult] = await database
    .select({ count: count() })
    .from(responses)
    .innerJoin(records, eq(responses.recordId, records.id))
    .where(
      and(
        gt(responses.createdAt, startTime),
        lte(responses.createdAt, endTime),
        sql`${records.visibility} != 'draft'`,
        eq(responses.moderationStatus, "clean"),
      ),
    );

  const [collabResult] = await database
    .select({ count: count() })
    .from(collaborationUnits)
    .where(
      and(
        gt(collaborationUnits.createdAt, startTime),
        lte(collaborationUnits.createdAt, endTime),
      ),
    );

  const [latestRecord] = await database
    .select({ createdAt: records.createdAt })
    .from(records)
    .where(
      and(
        gt(records.createdAt, startTime),
        lte(records.createdAt, endTime),
        sql`${records.visibility} != 'draft'`,
      ),
    )
    .orderBy(desc(records.createdAt))
    .limit(1);

  const [latestQuestion] = await database
    .select({ createdAt: questions.createdAt })
    .from(questions)
    .innerJoin(records, eq(questions.recordId, records.id))
    .where(
      and(
        gt(questions.createdAt, startTime),
        lte(questions.createdAt, endTime),
        sql`${records.visibility} != 'draft'`,
      ),
    )
    .orderBy(desc(questions.createdAt))
    .limit(1);

  const [latestResponse] = await database
    .select({ createdAt: responses.createdAt })
    .from(responses)
    .innerJoin(records, eq(responses.recordId, records.id))
    .where(
      and(
        gt(responses.createdAt, startTime),
        lte(responses.createdAt, endTime),
        sql`${records.visibility} != 'draft'`,
        eq(responses.moderationStatus, "clean"),
      ),
    )
    .orderBy(desc(responses.createdAt))
    .limit(1);

  const timestamps = [
    latestRecord?.createdAt ?? 0,
    latestQuestion?.createdAt ?? 0,
    latestResponse?.createdAt ?? 0,
  ].filter((t) => t > 0);

  const latestTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : startTime;

  return {
    records: recordResult?.count ?? 0,
    questions: questionResult?.count ?? 0,
    responses: responseResult?.count ?? 0,
    collaborations: collabResult?.count ?? 0,
    latestTimestamp,
  };
}

function generateSummary(type: ActivityItem["type"], count: number): string {
  if (count === 0) return "";

  switch (type) {
    case "record":
      return count === 1
        ? "1개의 새 기록이 남겨졌습니다"
        : `${count}개의 새 기록이 남겨졌습니다`;
    case "question":
      return count === 1
        ? "1개의 새 질문이 올라왔습니다"
        : `${count}개의 새 질문이 올라왔습니다`;
    case "response":
      return count === 1
        ? "1개의 새 응답이 달렸습니다"
        : `${count}개의 새 응답이 달렸습니다`;
    case "collaboration":
      return count === 1
        ? "1개의 새 협업이 시작되었습니다"
        : `${count}개의 새 협업이 시작되었습니다`;
    default:
      return "";
  }
}

export async function getRecentActivity(
  d1: D1Database,
  options?: { limit?: number },
): Promise<ActivityItem[]> {
  const database = db(d1);
  const { now, todayStart, weekStart, prevWeekStart } = getTimeBoundaries();
  const activities: ActivityItem[] = [];

  const todayActivity = await getActivityForPeriod(database, todayStart, now);
  const todayItems = [
    {
      type: "record" as const,
      count: todayActivity.records,
      timestamp: todayActivity.latestTimestamp,
    },
    {
      type: "question" as const,
      count: todayActivity.questions,
      timestamp: todayActivity.latestTimestamp,
    },
    {
      type: "response" as const,
      count: todayActivity.responses,
      timestamp: todayActivity.latestTimestamp,
    },
    {
      type: "collaboration" as const,
      count: todayActivity.collaborations,
      timestamp: todayActivity.latestTimestamp,
    },
  ];

  for (const item of todayItems) {
    if (item.count > 0) {
      activities.push({
        type: item.type,
        summary: generateSummary(item.type, item.count),
        count: item.count,
        timestamp: item.timestamp,
        period: "today",
      });
    }
  }

  const weekActivity = await getActivityForPeriod(database, weekStart, todayStart);
  const weekItems = [
    {
      type: "record" as const,
      count: weekActivity.records,
      timestamp: weekActivity.latestTimestamp,
    },
    {
      type: "question" as const,
      count: weekActivity.questions,
      timestamp: weekActivity.latestTimestamp,
    },
    {
      type: "response" as const,
      count: weekActivity.responses,
      timestamp: weekActivity.latestTimestamp,
    },
    {
      type: "collaboration" as const,
      count: weekActivity.collaborations,
      timestamp: weekActivity.latestTimestamp,
    },
  ];

  for (const item of weekItems) {
    if (item.count > 0) {
      activities.push({
        type: item.type,
        summary: generateSummary(item.type, item.count),
        count: item.count,
        timestamp: item.timestamp,
        period: "this_week",
      });
    }
  }

  const lastWeekActivity = await getActivityForPeriod(database, prevWeekStart, weekStart);
  const lastWeekItems = [
    {
      type: "record" as const,
      count: lastWeekActivity.records,
      timestamp: lastWeekActivity.latestTimestamp,
    },
    {
      type: "question" as const,
      count: lastWeekActivity.questions,
      timestamp: lastWeekActivity.latestTimestamp,
    },
    {
      type: "response" as const,
      count: lastWeekActivity.responses,
      timestamp: lastWeekActivity.latestTimestamp,
    },
    {
      type: "collaboration" as const,
      count: lastWeekActivity.collaborations,
      timestamp: lastWeekActivity.latestTimestamp,
    },
  ];

  for (const item of lastWeekItems) {
    if (item.count > 0) {
      activities.push({
        type: item.type,
        summary: generateSummary(item.type, item.count),
        count: item.count,
        timestamp: item.timestamp,
        period: "last_week",
      });
    }
  }

  activities.sort((a, b) => b.timestamp - a.timestamp);

  const limit = options?.limit ?? 10;
  return activities.slice(0, limit);
}
