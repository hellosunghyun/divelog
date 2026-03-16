import type { Route } from "./+types/index";
import { Link } from "~/components/SmartLink";
import { db } from "~/db/client.server";
import { createLogger } from "~/lib/logger.server";
import { responses, learnerProfiles } from "~/db/schema.server";
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

export function meta(_: Route.MetaArgs) { return [{ title: "Dialogue 관리" }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.dialogue" });
  logger.info("loader_start");
  return { responses: await db(context.cloudflare.env.DB).select({ response: responses, author: { displayName: learnerProfiles.displayName } }).from(responses).leftJoin(learnerProfiles, eq(responses.authorId, learnerProfiles.userId)).orderBy(desc(responses.createdAt)).limit(50) };
}
export default function AdminDialoguePage({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">Dialogue 관리</h2>
      {loaderData.responses.length === 0 ? (
        <EmptyState variant="generic" message="응답이 없습니다" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {["유형", "내용", "작성자", "moderation", "작업"].map((h) => (
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
            {loaderData.responses.map(({ response, author }) => (
              <TableRow key={response.id}>
                <TableCell className="px-4 py-2 text-sm text-admin-text">{response.type}</TableCell>
                <TableCell className="max-w-[300px] px-4 py-2 text-sm text-admin-text truncate">{response.content}</TableCell>
                <TableCell className="px-4 py-2 text-sm text-admin-text-secondary">{author?.displayName ?? "-"}</TableCell>
                <TableCell className="px-4 py-2 text-sm">
                  <Badge variant={response.moderationStatus === "flagged" ? "destructive" : "secondary"}>
                    {response.moderationStatus}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-2">
                  <Link to={`/admin/dialogue/${response.id}`} className="text-caption text-admin-accent hover:underline">검토</Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
