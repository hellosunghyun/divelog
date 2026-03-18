import { redirect } from "react-router";
import { useNavigation } from "react-router";
import type { Route } from "./+types/curation";
import { desc, eq } from "drizzle-orm";
import type { curationSlots } from "~/db/schema.server";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/feedback/Spinner";
import { requireRole } from "~/lib/auth/auth.middleware";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

const SLOT_TYPE_LABELS: Record<string, string> = {
  scene: "장면",
  question: "질문",
  sentence: "문장",
  learner: "러너",
  stage_featured: "Stage 특집",
};

type CurationSlot = typeof curationSlots.$inferSelect;

export function meta(_: Route.MetaArgs) { return [{ title: "큐레이션" }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { curationSlots } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.curation" });
  logger.info("loader_start");
  return { slots: await db(context.cloudflare.env.DB).select().from(curationSlots).orderBy(desc(curationSlots.position)) };
}
export async function action({ request, context }: Route.ActionArgs) {
  await requireRole(request, context, "admin");
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { curationSlots } = await import("~/db/schema.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.curation" });
  const f = await request.formData();
  const intent = f.get("intent");
  logger.info("action_start", { intent });
  const database = db(context.cloudflare.env.DB);
  if (intent === "pin") {
    await database.update(curationSlots).set({ pinned: true, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(curationSlots.id, f.get("id") as string));
  }
  if (intent === "hide") {
    await database.update(curationSlots).set({ hidden: true, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(curationSlots.id, f.get("id") as string));
  }
  if (intent === "unpin") {
    await database.update(curationSlots).set({ pinned: false, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(curationSlots.id, f.get("id") as string));
  }
  if (intent === "unhide") {
    await database.update(curationSlots).set({ hidden: false, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(curationSlots.id, f.get("id") as string));
  }
  logger.info("admin_update_curation", { slotId: f.get("id"), action: intent });
  throw redirect("/admin/curation");
}
export default function AdminCurationPage({ loaderData }: Route.ComponentProps) {
  const { slots } = loaderData;
  const navigation = useNavigation();
  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">큐레이션</h2>
      <Table>
        <TableHeader className="bg-admin-bg">
          <TableRow className="border-admin-border hover:bg-admin-bg">
            {["슬롯 유형", "대상 ID", "순서", "고정", "숨김", "작업"].map((header) => (
              <TableHead
                key={header}
                className="h-auto px-4 py-3 text-caption font-semibold text-admin-text-secondary uppercase tracking-wide"
              >
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {slots.map((slot: CurationSlot) => (
            <TableRow key={slot.id} className="border-admin-border hover:bg-admin-bg/50">
              <TableCell className="px-4 py-3 text-meta text-admin-text">
                <Badge variant="outline" className="text-admin-text">
                  {SLOT_TYPE_LABELS[slot.slotType] ?? slot.slotType}
                </Badge>
              </TableCell>
              <TableCell className="px-4 py-3 font-mono text-meta text-admin-text-secondary">
                {slot.targetId.substring(0, 12)}...
              </TableCell>
              <TableCell className="px-4 py-3 text-meta text-admin-text-secondary">
                {slot.position}
              </TableCell>
              <TableCell className="px-4 py-3 text-meta text-admin-text">
                <Badge variant={slot.pinned ? "default" : "outline"} className="text-admin-text">
                  {slot.pinned ? "고정됨" : "미고정"}
                </Badge>
              </TableCell>
              <TableCell className="px-4 py-3 text-meta text-admin-text">
                <Badge variant={slot.hidden ? "secondary" : "outline"} className="text-admin-text">
                  {slot.hidden ? "숨김" : "표시"}
                </Badge>
              </TableCell>
               <TableCell className="px-4 py-3">
                 <div className="flex gap-2">
                   <form method="post" className="inline">
                     <input type="hidden" name="id" value={slot.id} />
                     <input type="hidden" name="intent" value={slot.pinned ? "unpin" : "pin"} />
                     {(() => {
                       const isPinLoading = navigation.state === "submitting"
                         && navigation.formData?.get("intent") === (slot.pinned ? "unpin" : "pin")
                         && navigation.formData?.get("id") === slot.id;
                       return (
                         <Button
                           type="submit"
                           variant="outline"
                           size="sm"
                           disabled={isPinLoading}
                           className="disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                           {isPinLoading ? (
                             <><Spinner size="sm" /> {slot.pinned ? "해제 중..." : "고정 중..."}</>
                           ) : (
                             slot.pinned ? "고정 해제" : "고정"
                           )}
                         </Button>
                       );
                     })()}
                   </form>
                   <form method="post" className="inline">
                     <input type="hidden" name="id" value={slot.id} />
                     <input type="hidden" name="intent" value={slot.hidden ? "unhide" : "hide"} />
                     {(() => {
                       const isHideLoading = navigation.state === "submitting"
                         && navigation.formData?.get("intent") === (slot.hidden ? "unhide" : "hide")
                         && navigation.formData?.get("id") === slot.id;
                       return (
                         <Button
                           type="submit"
                           variant="outline"
                           size="sm"
                           disabled={isHideLoading}
                           className="disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                           {isHideLoading ? (
                             <><Spinner size="sm" /> {slot.hidden ? "표시 중..." : "숨김 중..."}</>
                           ) : (
                             slot.hidden ? "표시" : "숨김"
                           )}
                         </Button>
                       );
                     })()}
                   </form>
                 </div>
               </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
