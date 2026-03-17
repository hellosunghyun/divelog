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

export function meta(_: Route.MetaArgs) { return [{ title: "챌린지 관리" }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/logger.server");
  const { challenges } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.challenges" });
  logger.info("loader_start");
  return { challenges: await db(context.cloudflare.env.DB).select().from(challenges).orderBy(asc(challenges.name)) };
}
export default function AdminChallengesPage({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">챌린지 관리</h2>
      {loaderData.challenges.length === 0 ? (
        <EmptyState variant="generic" message="등록된 챌린지가 없습니다" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {["이름", "상태", "코호트", "작업"].map((h) => (
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
            {loaderData.challenges.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="px-4 py-2 text-sm text-admin-text">{c.name}</TableCell>
                <TableCell className="px-4 py-2 text-sm">
                  <Badge variant={c.status === "active" ? "default" : "outline"}>{c.status}</Badge>
                </TableCell>
                <TableCell className="px-4 py-2 text-sm text-admin-text-secondary">{c.cohort ?? "-"}</TableCell>
                <TableCell className="px-4 py-2">
                  <Link to={`/admin/challenges/${c.id}`} className="text-caption text-admin-accent hover:underline">편집</Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
