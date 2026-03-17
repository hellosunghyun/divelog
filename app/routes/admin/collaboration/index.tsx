import type { Route } from "./+types/index";
import { Link } from "~/components/content/SmartLink";
import { asc } from "drizzle-orm";
import EmptyState from "~/components/feedback/EmptyState";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

export function meta(_: Route.MetaArgs) { return [{ title: "Collaboration 관리" }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { collaborationUnits } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.collaboration" });
  logger.info("loader_start");
  return { units: await db(context.cloudflare.env.DB).select().from(collaborationUnits).orderBy(asc(collaborationUnits.name)) };
}
export default function AdminCollaborationPage({ loaderData }: Route.ComponentProps) {
  const STATUS: Record<string, string> = { forming: "구성 중", active: "탐구 중", restructured: "재편성됨", archived: "아카이브" };
  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">Collaboration 관리</h2>
      {loaderData.units.length === 0 ? (
        <EmptyState variant="generic" message="Collaboration Unit이 없습니다" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {["이름", "상태", "Slug", "작업"].map((h) => (
                <TableHead
                  key={h}
                  className="px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground"
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loaderData.units.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="px-4 py-2 text-sm text-admin-text">{u.name}</TableCell>
                <TableCell className="px-4 py-2 text-sm">
                  <Badge
                    variant={
                      u.status === "active"
                        ? "default"
                        : u.status === "restructured"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {STATUS[u.status] ?? u.status}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-2 text-sm text-admin-text-secondary">{u.slug}</TableCell>
                <TableCell className="px-4 py-2">
                  <Link to={`/admin/collaboration/${u.id}`} className="text-caption text-admin-accent hover:underline">관리</Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
