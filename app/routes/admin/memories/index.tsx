import type { Route } from "./+types/index";
import { Link } from "~/components/SmartLink";
import { db } from "~/db/client.server";
import { createLogger } from "~/lib/logger.server";
import { collectiveMemories, stages } from "~/db/schema.server";
import { eq, desc } from "drizzle-orm";
import EmptyState from "~/components/EmptyState";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

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
        <Table>
          <TableHeader>
            <TableRow>
              {["Stage", "상태", "코호트", "작업"].map((h) => (
                <TableHead
                  key={h}
                  className="px-3 py-2 text-xs uppercase tracking-widest text-muted-foreground"
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loaderData.memories.map(({ memory, stage }) => (
              <TableRow key={memory.id}>
                <TableCell className="px-3 py-2 text-sm text-admin-text">{stage?.name ?? "-"}</TableCell>
                <TableCell className="px-3 py-2 text-sm">
                  <Badge variant={memory.status === "draft" ? "outline" : "default"}>{memory.status}</Badge>
                </TableCell>
                <TableCell className="px-3 py-2 text-sm text-admin-text-secondary">{memory.cohort ?? "-"}</TableCell>
                <TableCell className="px-3 py-2">
                  <Link to={`/admin/memories/${memory.id}`} className="text-xs text-admin-accent hover:underline">편집</Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
