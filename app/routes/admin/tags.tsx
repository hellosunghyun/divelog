import type { Route } from "./+types/tags";
import type { TagWithUsage } from "~/db/queries/records/tags.server";
import { data, redirect, useNavigation } from "react-router";
import { Spinner } from "~/components/feedback/Spinner";
import { Input } from "~/components/ui/input";
import {
  adminBadgeBase,
  adminBadgeDefault,
  adminBadgePrimary,
  adminBtnDanger,
  adminBtnPrimary,
  adminBtnSecondary,
  adminBtnSm,
  adminCardBodyClass,
  adminCardClass,
  adminCardHeaderClass,
  adminEmptyDescClass,
  adminEmptyIconClass,
  adminEmptyStateClass,
  adminEmptyTitleClass,
  adminInputClass,
  adminLabelClass,
  adminTableClass,
  adminTdClass,
  adminThClass,
  adminTrClass,
} from "~/components/admin/admin-patterns";
import { requireRole } from "~/lib/auth/auth.middleware";

export function meta(_: Route.MetaArgs) {
  return [{ title: "게시글 태그 관리" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { getAllTags } = await import("~/db/queries/records/tags.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.tags" });
  logger.info("loader_start");

  return {
    tags: await getAllTags(context.cloudflare.env.DB),
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  await requireRole(request, context, "admin");

  const { createLogger } = await import("~/lib/infra/logger.server");
  const { createTag, updateTag, deleteTag, getTagById, getTagByName, getTagBySlug, getTagUsageCount } = await import(
    "~/db/queries/records/tags.server"
  );

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.tags" });
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();
  logger.info("action_start", { intent });

  if (intent === "create_tag") {
    const name = formData.get("name")?.toString().trim() ?? "";
    const rawSlug = formData.get("slug")?.toString().trim() ?? "";
    const description = formData.get("description")?.toString().trim() ?? "";
    const color = normalizeHexColor(formData.get("color")?.toString()) ?? "#6E6E73";

    if (!name) {
      return data({ error: "태그 이름은 필수입니다." }, { status: 400 });
    }

    const slug = normalizeSlug(rawSlug || generateSlug(name));
    if (!slug) {
      return data({ error: "슬러그 형식이 올바르지 않습니다." }, { status: 400 });
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
    const name = formData.get("name")?.toString().trim() ?? "";
    const rawSlug = formData.get("slug")?.toString().trim() ?? "";
    const description = formData.get("description")?.toString().trim() ?? "";
    const color = normalizeHexColor(formData.get("color")?.toString()) ?? "#6E6E73";

    if (!id) {
      return data({ error: "태그 ID가 필요합니다." }, { status: 400 });
    }

    const existingTag = await getTagById(context.cloudflare.env.DB, id);
    if (!existingTag) {
      return data({ error: "수정할 태그를 찾을 수 없습니다." }, { status: 404 });
    }

    if (!name) {
      return data({ error: "태그 이름은 비워둘 수 없습니다." }, { status: 400 });
    }

    const slug = normalizeSlug(rawSlug || generateSlug(name));
    if (!slug) {
      return data({ error: "슬러그 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const existingByName = await getTagByName(context.cloudflare.env.DB, name);
    if (existingByName && existingByName.id !== id) {
      return data({ error: "이미 존재하는 태그 이름입니다." }, { status: 400 });
    }

    const existingBySlug = await getTagBySlug(context.cloudflare.env.DB, slug);
    if (existingBySlug && existingBySlug.id !== id) {
      return data({ error: "이미 존재하는 슬러그입니다." }, { status: 400 });
    }

    const updatedTag = await updateTag(context.cloudflare.env.DB, id, {
      name,
      slug,
      description,
      color,
    });

    if (!updatedTag) {
      return data({ error: "태그 수정에 실패했습니다. 다시 시도해 주세요." }, { status: 500 });
    }

    logger.info("admin_update_tag", { tagId: updatedTag?.id ?? id, slug: updatedTag?.slug });
    return redirect("/admin/tags");
  }

  if (intent === "delete_tag") {
    const id = formData.get("id")?.toString();

    if (!id) {
      return data({ error: "태그 ID가 필요합니다." }, { status: 400 });
    }

    const existingTag = await getTagById(context.cloudflare.env.DB, id);
    if (!existingTag) {
      return data({ error: "삭제할 태그를 찾을 수 없습니다." }, { status: 404 });
    }

    const usageCount = await getTagUsageCount(context.cloudflare.env.DB, id);
    if (usageCount > 0) {
      return data(
        {
          error: `이 태그는 게시글 ${usageCount}개에서 사용 중입니다. 먼저 게시글에서 태그를 제거해 주세요.`,
        },
        { status: 400 }
      );
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

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeHexColor(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : null;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("ko-KR");
}

export default function AdminTagsPage({ loaderData, actionData }: Route.ComponentProps) {
  const error = (actionData as { error?: string } | undefined)?.error;
  const navigation = useNavigation();
  const currentIntent = navigation.formData?.get("intent")?.toString();
  const currentTagId = navigation.formData?.get("id")?.toString();
  const isCreating = navigation.state === "submitting" && currentIntent === "create_tag";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-admin-text">게시글 태그 관리</h2>
        <p className="text-meta text-admin-text-secondary">전체 {loaderData.tags.length}개</p>
      </div>

      <div className={`${adminCardClass} mb-4`}>
        <div className={adminCardBodyClass}>
          <p className="text-sm text-admin-text-secondary">
            이 태그는 기록 작성 화면에서 선택됩니다. 사용 중인 태그는 실수로 삭제되지 않도록 보호됩니다.
          </p>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg border border-error/20 bg-error/10 p-3 text-caption text-error">{error}</div>}

      <div className={`${adminCardClass} mb-6`}>
        <div className={adminCardHeaderClass}>
          <h3 className="text-sm font-semibold text-admin-text">새 태그 추가</h3>
        </div>
        <div className={adminCardBodyClass}>
          <form method="post" className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_2fr_auto_auto] md:items-end">
            <input type="hidden" name="intent" value="create_tag" />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className={adminLabelClass}>
                이름 <span className="text-error">*</span>
              </label>
              <Input
                id="name"
                name="name"
                required
                className={adminInputClass}
                placeholder="태그 이름"
                onInput={(event) => {
                  const slugInput = document.getElementById("slug") as HTMLInputElement | null;
                  if (slugInput && !slugInput.dataset.manual) {
                    slugInput.value = generateSlug(event.currentTarget.value);
                  }
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="slug" className={adminLabelClass}>
                슬러그
              </label>
              <Input
                id="slug"
                name="slug"
                className={`${adminInputClass} font-mono`}
                placeholder="tag-slug"
                onChange={(event) => {
                  event.currentTarget.dataset.manual = "true";
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="description" className={adminLabelClass}>
                설명
              </label>
              <Input id="description" name="description" className={adminInputClass} placeholder="태그 설명" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="color" className={adminLabelClass}>
                색상
              </label>
              <input
                type="color"
                id="color"
                name="color"
                defaultValue="#6E6E73"
                className="h-10 w-10 cursor-pointer rounded border border-admin-border"
              />
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className={`${adminBtnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {isCreating ? (
                <>
                  <Spinner size="sm" /> 추가 중...
                </>
              ) : (
                "추가"
              )}
            </button>
          </form>
        </div>
      </div>

      {loaderData.tags.length === 0 ? (
        <div className={adminCardClass}>
          <div className={adminEmptyStateClass}>
            <svg className={adminEmptyIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <p className={adminEmptyTitleClass}>태그가 없습니다</p>
            <p className={adminEmptyDescClass}>위에서 새 태그를 추가해 주세요</p>
          </div>
        </div>
      ) : (
        <div className={adminCardClass}>
          <table className={adminTableClass}>
            <thead>
              <tr>
                {["색상", "이름", "슬러그", "설명", "사용 중", "생성일", "작업"].map((header) => (
                  <th key={header} className={adminThClass}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loaderData.tags.map((tag: TagWithUsage) => {
                const updateFormId = `update-tag-${tag.id}`;
                const deleteFormId = `delete-tag-${tag.id}`;
                const isUpdatingThisTag =
                  navigation.state === "submitting" && currentIntent === "update_tag" && currentTagId === tag.id;
                const isDeletingThisTag =
                  navigation.state === "submitting" && currentIntent === "delete_tag" && currentTagId === tag.id;

                return (
                  <tr key={tag.id} className={adminTrClass}>
                    <td className={adminTdClass}>
                      <input
                        type="color"
                        name="color"
                        form={updateFormId}
                        defaultValue={tag.color ?? "#6E6E73"}
                        className="h-10 w-10 cursor-pointer rounded border border-admin-border"
                        aria-label={`${tag.name} 색상`}
                      />
                    </td>
                    <td className={adminTdClass}>
                      <Input
                        name="name"
                        form={updateFormId}
                        defaultValue={tag.name}
                        required
                        className={adminInputClass}
                        aria-label={`${tag.name} 이름`}
                      />
                    </td>
                    <td className={adminTdClass}>
                      <Input
                        name="slug"
                        form={updateFormId}
                        defaultValue={tag.slug}
                        className={`${adminInputClass} font-mono`}
                        aria-label={`${tag.name} 슬러그`}
                      />
                    </td>
                    <td className={adminTdClass}>
                      <Input
                        name="description"
                        form={updateFormId}
                        defaultValue={tag.description ?? ""}
                        className={adminInputClass}
                        placeholder="설명 없음"
                        aria-label={`${tag.name} 설명`}
                      />
                    </td>
                    <td className={adminTdClass}>
                      <span className={`${adminBadgeBase} ${tag.usageCount > 0 ? adminBadgePrimary : adminBadgeDefault} tabular-nums`}>
                        {tag.usageCount}개 게시글
                      </span>
                    </td>
                    <td className={`${adminTdClass} tabular-nums text-admin-text-secondary`}>{formatDate(tag.createdAt)}</td>
                    <td className={adminTdClass}>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            form={updateFormId}
                            disabled={isUpdatingThisTag}
                            className={`${adminBtnSecondary} ${adminBtnSm} disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            {isUpdatingThisTag ? (
                              <>
                                <Spinner size="sm" /> 저장 중...
                              </>
                            ) : (
                              "저장"
                            )}
                          </button>
                          <button
                            type="submit"
                            form={deleteFormId}
                            disabled={tag.usageCount > 0 || isDeletingThisTag}
                            className={`${adminBtnDanger} ${adminBtnSm} disabled:cursor-not-allowed disabled:opacity-50`}
                            onClick={(event) => {
                              if (!confirm(`\"${tag.name}\" 태그를 삭제하시겠습니까?`)) {
                                event.preventDefault();
                              }
                            }}
                          >
                            {isDeletingThisTag ? (
                              <>
                                <Spinner size="sm" /> 삭제 중...
                              </>
                            ) : (
                              "삭제"
                            )}
                          </button>
                        </div>
                        {tag.usageCount > 0 && (
                          <p className="text-[11px] text-admin-text-secondary">사용 중 태그는 삭제할 수 없습니다.</p>
                        )}
                      </div>

                      <form id={updateFormId} method="post" className="hidden">
                        <input type="hidden" name="intent" value="update_tag" />
                        <input type="hidden" name="id" value={tag.id} />
                      </form>

                      <form id={deleteFormId} method="post" className="hidden">
                        <input type="hidden" name="intent" value="delete_tag" />
                        <input type="hidden" name="id" value={tag.id} />
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
