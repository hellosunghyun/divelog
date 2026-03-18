import type { Route } from "./+types/tags";
import type { TagWithUsage } from "~/db/queries/records/tags.server";
import { data, redirect } from "react-router";
import { eq } from "drizzle-orm";
import {
  adminTableClass,
  adminThClass,
  adminTdClass,
  adminTrClass,
  adminLabelClass,
  adminBtnPrimary,
  adminBtnDanger,
  adminBtnSm,
  adminCardClass,
  adminCardHeaderClass,
  adminCardBodyClass,
  adminBadgeBase,
  adminBadgeDefault,
  adminEmptyStateClass,
  adminEmptyIconClass,
  adminEmptyTitleClass,
  adminEmptyDescClass,
} from "~/components/admin/admin-patterns";
import { Input } from "~/components/ui/input";

export function meta(_: Route.MetaArgs) {
  return [{ title: "태그 관리" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { tags } = await import("~/db/schema.server");
  const { getAllTags, createTag, updateTag, deleteTag, getTagByName, getTagBySlug } = await import("~/db/queries/records/tags.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.tags" });
  logger.info("loader_start");
  const allTags = await getAllTags(context.cloudflare.env.DB);
  return { tags: allTags };
}

export async function action({ request, context }: Route.ActionArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { tags } = await import("~/db/schema.server");
  const { getAllTags, createTag, updateTag, deleteTag, getTagByName, getTagBySlug } = await import("~/db/queries/records/tags.server");

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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-admin-text">태그 관리</h2>
        <p className="text-meta text-admin-text-secondary">
          전체 {loaderData.tags.length}개
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-caption">
          {error}
        </div>
      )}

      <div className={`${adminCardClass} mb-6`}>
        <div className={adminCardHeaderClass}>
          <h3 className="text-sm font-semibold text-admin-text">새 태그 추가</h3>
        </div>
        <div className={adminCardBodyClass}>
          <form method="post" className="flex flex-wrap gap-4 items-end">
            <input type="hidden" name="intent" value="create_tag" />
            
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className={adminLabelClass}>
                이름 <span className="text-error">*</span>
              </label>
              <Input
                id="name"
                name="name"
                required
                className="w-40"
                placeholder="태그 이름"
                onInput={(e) => {
                  const slugInput = document.getElementById("slug") as HTMLInputElement;
                  if (slugInput && !slugInput.dataset.manual) {
                    slugInput.value = generateSlug(e.currentTarget.value);
                  }
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="slug" className={adminLabelClass}>
                슬러그 <span className="text-error">*</span>
              </label>
              <Input
                id="slug"
                name="slug"
                required
                className="w-40 font-mono"
                placeholder="tag-slug"
                onChange={(e) => {
                  e.currentTarget.dataset.manual = "true";
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="description" className={adminLabelClass}>
                설명
              </label>
              <Input
                id="description"
                name="description"
                className="w-56"
                placeholder="태그 설명"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="color" className={adminLabelClass}>
                색상
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="color"
                  name="color"
                  defaultValue="#6E6E73"
                  className="w-9 h-9 border border-admin-border rounded cursor-pointer"
                />
              </div>
            </div>

            <button type="submit" className={adminBtnPrimary}>
              추가
            </button>
          </form>
        </div>
      </div>

      {loaderData.tags.length === 0 ? (
        <div className={adminCardClass}>
          <div className={adminEmptyStateClass}>
            <svg className={adminEmptyIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <p className={adminEmptyTitleClass}>태그가 없습니다</p>
            <p className={adminEmptyDescClass}>위에서 새 태그를 추가하세요</p>
          </div>
        </div>
      ) : (
        <div className={adminCardClass}>
          <table className={adminTableClass}>
            <thead>
              <tr>
                {["색상", "이름", "슬러그", "설명", "사용", "생성일", "작업"].map((header) => (
                  <th key={header} className={adminThClass}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loaderData.tags.map((tag: TagWithUsage) => {
                const deleteFormId = `delete-tag-${tag.id}`;

                return (
                  <tr key={tag.id} className={adminTrClass}>
                    <td className={adminTdClass}>
                      <div
                        className="h-5 w-5 rounded border border-admin-border"
                        style={{ backgroundColor: tag.color ?? "#6E6E73" }}
                      />
                    </td>
                    <td className={`${adminTdClass} font-medium text-admin-text`}>
                      {tag.name}
                    </td>
                    <td className={adminTdClass}>
                      <span className={`${adminBadgeBase} ${adminBadgeDefault} font-mono`}>
                        {tag.slug}
                      </span>
                    </td>
                    <td className={`${adminTdClass} max-w-[200px] truncate text-admin-text-secondary`}>
                      {tag.description || <span className="text-admin-text-tertiary">-</span>}
                    </td>
                    <td className={adminTdClass}>
                      <span className="text-caption text-admin-text-secondary tabular-nums">
                        {tag.usageCount}회
                      </span>
                    </td>
                    <td className={`${adminTdClass} text-admin-text-secondary tabular-nums`}>
                      {new Date(tag.createdAt * 1000).toLocaleDateString("ko-KR")}
                    </td>
                    <td className={adminTdClass}>
                      <form id={deleteFormId} method="post" className="inline">
                        <input type="hidden" name="intent" value="delete_tag" />
                        <input type="hidden" name="id" value={tag.id} />
                        <button
                          type="submit"
                          className={`${adminBtnDanger} ${adminBtnSm}`}
                          onClick={(e) => {
                            if (!confirm(`"${tag.name}" 태그를 삭제하시겠습니까?`)) {
                              e.preventDefault();
                            }
                          }}
                        >
                          삭제
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
