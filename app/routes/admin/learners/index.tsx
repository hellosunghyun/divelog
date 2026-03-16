import type { Route } from "./+types/index";
import { Link } from "~/components/SmartLink";
import { db } from "~/db/client.server";
import { createLogger } from "~/lib/logger.server";
import { learnerProfiles } from "~/db/schema.server";
import { asc } from "drizzle-orm";
import EmptyState from "~/components/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

export function meta(_: Route.MetaArgs) { return [{ title: "러너 관리" }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.learners" });
  logger.info("loader_start");
  return { learners: await db(context.cloudflare.env.DB).select().from(learnerProfiles).orderBy(asc(learnerProfiles.displayName)) };
}
export default function AdminLearnersPage({ loaderData }: Route.ComponentProps) {
  return (
    <div>
       <h2 className="text-xl font-semibold text-admin-text mb-6">러너 관리 ({loaderData.learners.length}명)</h2>
      {loaderData.learners.length === 0 ? (
         <EmptyState variant="generic" message="등록된 러너가 없습니다" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
                {["이름", "이메일", "코호트", "작업"].map((h) => (
                  <TableHead
                    key={h}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    {h}
                  </TableHead>
                ))}
            </TableRow>
          </TableHeader>
          <TableBody>
              {loaderData.learners.map((l) => (
                <TableRow key={l.userId}>
                  <TableCell className="px-4 py-2 text-sm text-admin-text">{l.displayName}</TableCell>
                  <TableCell className="px-4 py-2 text-sm text-admin-text-secondary">{l.email ?? "-"}</TableCell>
                  <TableCell className="px-4 py-2 text-sm text-admin-text-secondary">{l.cohort ?? "-"}</TableCell>
                  <TableCell className="px-4 py-2">
                    <Link to={`/admin/learners/${l.userId}`} className="text-caption text-admin-accent hover:underline">상세</Link>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
