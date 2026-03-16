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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

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
            <Label htmlFor="name" className="text-caption text-admin-text-secondary">
              이름 *
            </Label>
            <Input
              type="text"
              id="name"
              name="name"
              required
              className="h-10 rounded-md border-admin-border bg-admin-bg px-3 py-2 text-caption text-admin-text"
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
            <Label htmlFor="slug" className="text-caption text-admin-text-secondary">
              슬러그 *
            </Label>
            <Input
              type="text"
              id="slug"
              name="slug"
              required
              className="h-10 rounded-md border-admin-border bg-admin-bg px-3 py-2 text-caption text-admin-text"
              placeholder="tag-slug"
              onChange={(e) => {
                e.currentTarget.dataset.manual = "true";
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="description" className="text-caption text-admin-text-secondary">
              설명
            </Label>
            <Input
              type="text"
              id="description"
              name="description"
              className="h-10 w-48 rounded-md border-admin-border bg-admin-bg px-3 py-2 text-caption text-admin-text"
              placeholder="태그 설명"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="color" className="text-caption text-admin-text-secondary">
              색상
            </Label>
            <div className="flex items-center gap-2">
              <input type="color" id="color" name="color" defaultValue="#6E6E73" className="w-8 h-8 border border-admin-border rounded cursor-pointer" />
              <span className="text-caption text-admin-text-secondary">#</span>
            </div>
          </div>
          <Button type="submit" className="h-10 px-4 text-caption font-medium">
            추가
          </Button>
        </form>
      </div>

      {loaderData.tags.length === 0 ? (
        <EmptyState variant="generic" message="태그가 없습니다" />
      ) : (
        <Table>
          <TableHeader className="bg-admin-bg">
            <TableRow className="border-admin-border hover:bg-admin-bg">
              {["색상", "이름", "슬러그", "설명", "사용 횟수", "생성일", "작업"].map((header) => (
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
            {loaderData.tags.map((tag: TagWithUsage) => {
              const deleteFormId = `delete-tag-${tag.id}`;

              return (
                <TableRow key={tag.id} className="border-admin-border hover:bg-admin-bg/50">
                  <TableCell className="px-4 py-3">
                    <div
                      className="h-5 w-5 rounded border border-admin-border"
                      style={{ backgroundColor: tag.color ?? "#6E6E73" }}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-meta font-medium text-admin-text">
                    {tag.name}
                  </TableCell>
                  <TableCell className="px-4 py-3 font-mono text-meta text-admin-text-secondary">
                    <Badge variant="outline">{tag.slug}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] px-4 py-3 text-meta text-admin-text-secondary">
                    {tag.description || "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-meta text-admin-text-secondary">
                    <Badge variant="secondary">{tag.usageCount}회</Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-meta text-admin-text-secondary">
                    {new Date(tag.createdAt * 1000).toLocaleDateString("ko-KR")}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <form id={deleteFormId} method="post" className="inline">
                      <input type="hidden" name="intent" value="delete_tag" />
                      <input type="hidden" name="id" value={tag.id} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" variant="destructive" size="sm">
                            삭제
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>태그 삭제</AlertDialogTitle>
                            <AlertDialogDescription>
                              정말 삭제하시겠습니까?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => {
                                const form = document.getElementById(deleteFormId) as HTMLFormElement | null;
                                form?.requestSubmit();
                              }}
                            >
                              삭제
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </form>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
