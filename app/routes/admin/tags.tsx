import type { Route } from "./+types/tags";
import { data, redirect } from "react-router";
import { db } from "~/db/client.server";
import { createLogger } from "~/lib/logger.server";
import { tags } from "~/db/schema.server";
import { eq } from "drizzle-orm";
import {
  getAllTags,
  createTag,
  updateTag,
  deleteTag,
  getTagByName,
  getTagBySlug,
  type TagWithUsage,
} from "~/db/queries/tags.server";
import EmptyState from "~/components/EmptyState";

export function meta(_: Route.MetaArgs) {
  return [{ title: "태그 관리" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.tags" });
  logger.info("loader_start");
  const allTags = await getAllTags(context.cloudflare.env.DB);
  return { tags: allTags };
}

export async function action({ request, context }: Route.ActionArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.tags" });
  const formData = await request.formData();
  const intent = formData.get("intent");
  logger.info("action_start", { intent });

  const database = db(context.cloudflare.env.DB);

  if (intent === "create_tag") {
    const name = formData.get("name")?.toString()?.trim();
    const slug = formData.get("slug")?.toString()?.trim();
    const description = formData.get("description")?.toString()?.trim() ?? "";
    const color = formData.get("color")?.toString()?.trim() ?? "#6E6E73";

    if (!name || !slug) {
      return data({ error: "이름과 슬러그는 필수입니다." }, { status: 400 });
    }

    const existingByName = await getTagByName(context.cloudflare.env.DB, name);
    if (existingByName) {
      return data({ error: "이미 존재하는 태그 이름입니다." }, { status: 400 });
    }

    const existingBySlug = await getTagBySlug(context.cloudflare.env.DB, slug);
    if (existingBySlug) {
      return data({ error: "이미 존재하는 슬러그입니다." }, { status: 400 });
    }

    const createdTag = await createTag(context.cloudflare.env.DB, {
      name,
      slug,
      description,
      color,
    });

    logger.info("admin_create_tag", { tagId: createdTag?.id, slug: createdTag?.slug });
    return redirect("/admin/tags");
  }

  if (intent === "update_tag") {
    const id = formData.get("id")?.toString();
    const name = formData.get("name")?.toString()?.trim();
    const slug = formData.get("slug")?.toString()?.trim();
    const description = formData.get("description")?.toString()?.trim();
    const color = formData.get("color")?.toString()?.trim();

    if (!id) {
      return data({ error: "태그 ID가 필요합니다." }, { status: 400 });
    }

    const updateData: {
      name?: string;
      slug?: string;
      description?: string;
      color?: string;
    } = {};

    if (name) {
      const existing = await database
        .select()
        .from(tags)
        .where(eq(tags.name, name))
        .limit(1);
      if (existing.length > 0 && existing[0].id !== id) {
        return data({ error: "이미 존재하는 태그 이름입니다." }, { status: 400 });
      }
      updateData.name = name;
    }

    if (slug) {
      const existing = await database
        .select()
        .from(tags)
        .where(eq(tags.slug, slug))
        .limit(1);
      if (existing.length > 0 && existing[0].id !== id) {
        return data({ error: "이미 존재하는 슬러그입니다." }, { status: 400 });
      }
      updateData.slug = slug;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (color) {
      updateData.color = color;
    }

    const updatedTag = await updateTag(context.cloudflare.env.DB, id, updateData);

    logger.info("admin_update_tag", { tagId: updatedTag?.id ?? id, slug: updatedTag?.slug });
    return redirect("/admin/tags");
  }

  if (intent === "delete_tag") {
    const id = formData.get("id")?.toString();

    if (!id) {
      return data({ error: "태그 ID가 필요합니다." }, { status: 400 });
    }

    await deleteTag(context.cloudflare.env.DB, id);

    logger.info("admin_delete_tag", { tagId: id });
    return redirect("/admin/tags");
  }

  return data({ error: "알 수 없는 작업입니다." }, { status: 400 });
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminTagsPage({ loaderData, actionData }: Route.ComponentProps) {
  const error = (actionData as { error?: string } | undefined)?.error;

  return (
    <div>
      <h2 className="text-xl font-semibold text-admin-text mb-6">태그 관리</h2>

      {error && (
        <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-caption">
          {error}
        </div>
      )}

      <div className="bg-admin-surface rounded-lg border border-admin-border p-4 mb-6">
        <h3 className="text-meta font-semibold text-admin-text mb-4">새 태그 추가</h3>
        <form method="post" className="flex flex-wrap gap-3 items-end">
          <input type="hidden" name="intent" value="create_tag" />
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-caption text-admin-text-secondary">
              이름 *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="px-3 py-2 text-caption border border-admin-border rounded-md bg-admin-bg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
              placeholder="태그 이름"
              onInput={(e) => {
                const slugInput = document.getElementById("slug") as HTMLInputElement;
                if (slugInput && !slugInput.dataset.manual) {
                  slugInput.value = generateSlug(e.currentTarget.value);
                }
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="slug" className="text-caption text-admin-text-secondary">
              슬러그 *
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              required
              className="px-3 py-2 text-caption border border-admin-border rounded-md bg-admin-bg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
              placeholder="tag-slug"
              onChange={(e) => {
                e.currentTarget.dataset.manual = "true";
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="description" className="text-caption text-admin-text-secondary">
              설명
            </label>
            <input
              type="text"
              id="description"
              name="description"
              className="px-3 py-2 text-caption border border-admin-border rounded-md bg-admin-bg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent w-48"
              placeholder="태그 설명"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="color" className="text-caption text-admin-text-secondary">
              색상
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="color"
                name="color"
                defaultValue="#6E6E73"
                className="w-8 h-8 border border-admin-border rounded cursor-pointer"
              />
              <span className="text-caption text-admin-text-secondary">#</span>
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-caption font-medium bg-admin-accent text-white rounded-md hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-admin-accent focus:ring-offset-2"
          >
            추가
          </button>
        </form>
      </div>

      {loaderData.tags.length === 0 ? (
        <EmptyState variant="generic" message="태그가 없습니다" />
      ) : (
        <div className="bg-admin-surface rounded-lg border border-admin-border overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-admin-bg">
                {["색상", "이름", "슬러그", "설명", "사용 횟수", "생성일", "작업"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-caption font-semibold text-admin-text-secondary uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loaderData.tags.map((tag: TagWithUsage) => (
                <tr
                  key={tag.id}
                  className="border-t border-admin-border hover:bg-admin-bg/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div
                      className="w-5 h-5 rounded border border-admin-border"
                      style={{ backgroundColor: tag.color ?? "#6E6E73" }}
                    />
                  </td>
                  <td className="px-4 py-3 text-meta text-admin-text font-medium">
                    {tag.name}
                  </td>
                  <td className="px-4 py-3 text-meta text-admin-text-secondary font-mono">
                    {tag.slug}
                  </td>
                  <td className="px-4 py-3 text-meta text-admin-text-secondary max-w-[200px] truncate">
                    {tag.description || "-"}
                  </td>
                  <td className="px-4 py-3 text-meta text-admin-text-secondary">
                    {tag.usageCount}
                  </td>
                  <td className="px-4 py-3 text-meta text-admin-text-secondary">
                    {new Date(tag.createdAt * 1000).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-3">
                    <form method="post" className="inline">
                      <input type="hidden" name="intent" value="delete_tag" />
                      <input type="hidden" name="id" value={tag.id} />
                      <button
                        type="submit"
                        className="text-caption text-error hover:underline focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2 rounded px-1"
                        onClick={(e) => {
                          if (!confirm("정말 이 태그를 삭제하시겠습니까?")) {
                            e.preventDefault();
                          }
                        }}
                      >
                        삭제
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
