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

export function meta(_: Route.MetaArgs) { return [{ title: "템플릿" }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/logger.server");
  const { templates } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.templates" });
  logger.info("loader_start");
  return { templates: await db(context.cloudflare.env.DB).select().from(templates).orderBy(asc(templates.name)) };
}
export default function AdminTemplatesPage({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">템플릿 ({loaderData.templates.length}개)</h2>
      {loaderData.templates.length === 0 ? (
        <EmptyState variant="generic" message="등록된 템플릿이 없습니다" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {["이름", "형식", "리듬", "활성", "작업"].map((h) => (
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
            {loaderData.templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="px-4 py-2 text-sm text-admin-text">{t.name}</TableCell>
                <TableCell className="px-4 py-2 text-sm text-admin-text-secondary">{t.form ?? "-"}</TableCell>
                <TableCell className="px-4 py-2 text-sm text-admin-text-secondary">{t.rhythm ?? "-"}</TableCell>
                <TableCell className="px-4 py-2 text-sm">
                  <Badge variant={t.active ? "default" : "outline"}>{t.active ? "활성" : "비활성"}</Badge>
                </TableCell>
                <TableCell className="px-4 py-2">
                  <Link to={`/admin/templates/${t.id}`} className="text-caption text-admin-accent hover:underline">편집</Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
