import type { Route } from "./+types/_admin.admin.templates._index";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { templates } from "../db/schema.server";
import { asc } from "drizzle-orm";
import EmptyState from "../components/EmptyState";

export function meta(_: Route.MetaArgs) { return [{ title: "템플릿" }]; }
export async function loader({ context }: Route.LoaderArgs) {
  return { templates: await db(context.cloudflare.env.DB).select().from(templates).orderBy(asc(templates.name)) };
}
export default function AdminTemplatesPage({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">템플릿 ({loaderData.templates.length}개)</h2>
      {loaderData.templates.length === 0 ? (
        <EmptyState variant="generic" message="등록된 템플릿이 없습니다" />
      ) : (
        <table className="w-full border-collapse bg-admin-surface rounded-md overflow-hidden">
          <thead>
            <tr className="border-b border-admin-border">
              {["이름", "형식", "리듬", "활성", "작업"].map((h) => (
                <th key={h} className="text-left px-4 py-2 text-caption font-semibold text-admin-text-secondary uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loaderData.templates.map((t) => (
              <tr key={t.id} className="border-b border-admin-border hover:bg-admin-bg transition-colors">
                <td className="px-4 py-2 text-meta text-admin-text">{t.name}</td>
                <td className="px-4 py-2 text-meta">{t.form ?? "-"}</td>
                <td className="px-4 py-2 text-meta">{t.rhythm ?? "-"}</td>
                <td className="px-4 py-2 text-meta">{t.active ? "✓" : "✗"}</td>
                <td className="px-4 py-2"><Link to={`/admin/templates/${t.id}`} className="text-caption text-admin-accent hover:underline">편집</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
