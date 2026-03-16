import type { Route } from "./+types/_admin.admin.memories._index";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { createLogger } from "../lib/logger.server";
import { collectiveMemories, stages } from "../db/schema.server";
import { eq, desc } from "drizzle-orm";
import EmptyState from "../components/EmptyState";

export function meta(_: Route.MetaArgs) { return [{ title: "Collective Memory" }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.memories" });
  logger.info("loader_start");
  return { memories: await db(context.cloudflare.env.DB).select({ memory: collectiveMemories, stage: { name: stages.name, slug: stages.slug } }).from(collectiveMemories).leftJoin(stages, eq(collectiveMemories.stageId, stages.id)).orderBy(desc(collectiveMemories.createdAt)) };
}
export default function AdminMemoriesPage({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">Collective Memory</h2>
      {loaderData.memories.length === 0 ? (
        <EmptyState variant="generic" message="Collective Memory가 없습니다" />
      ) : (
        <table className="w-full border-collapse bg-admin-surface rounded-md">
          <thead>
            <tr className="border-b border-admin-border">
              {["Stage", "상태", "코호트", "작업"].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-xs text-admin-text-secondary font-semibold uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loaderData.memories.map(({ memory, stage }) => (
              <tr key={memory.id} className="border-b border-admin-border hover:bg-admin-bg transition-colors">
                <td className="px-3 py-2 text-[13px] text-admin-text">{stage?.name ?? "-"}</td>
                <td className="px-3 py-2 text-[13px]">{memory.status}</td>
                <td className="px-3 py-2 text-[13px]">{memory.cohort ?? "-"}</td>
                <td className="px-3 py-2">
                  <Link to={`/admin/memories/${memory.id}`} className="text-xs text-admin-accent hover:underline">편집</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
