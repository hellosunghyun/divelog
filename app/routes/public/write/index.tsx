import { Link } from "~/components/SmartLink";
import { FileText, MessageSquare } from "lucide-react";
import type { Route } from "./+types/index";
import { requireVerified } from "~/lib/auth.middleware";
import { useLoaderData } from "react-router";
import { hasDraftLocal } from "~/lib/draft-storage";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "기록하기 — DiveLog" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireVerified(request, context);
  return {};
}

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  const serverData = await serverLoader();
  return {
    ...serverData,
    hasNoteDraft: hasDraftLocal('note'),
    hasArticleDraft: hasDraftLocal('article'),
  };
}
clientLoader.hydrate = true as const;

export default function WritePage() {
  const { hasNoteDraft, hasArticleDraft } = useLoaderData<typeof clientLoader>();

  return (
    <div className="mx-auto py-16 px-4 md:py-24" style={{ maxWidth: 640 }}>
      <h1 className="text-3xl font-semibold text-text-primary mb-2">기록하기</h1>
      <p className="text-base text-text-secondary mb-10">
        완성된 글이 아니어도 괜찮습니다.
      </p>

      <div className="flex flex-col gap-4">
        <Link
          to="/write/note"
          className="group block rounded-2xl border border-border bg-surface p-7 no-underline transition-all duration-200 hover:border-ocean-blue hover:shadow-sm hover:-translate-y-0.5"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-mist-blue flex items-center justify-center">
              <MessageSquare size={20} className="text-ocean-blue" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-text-primary">
                  짧은 메모
                </h2>
                {hasNoteDraft && (
                  <span className="text-xs bg-ocean-blue/10 text-ocean-blue px-2 py-0.5 rounded-full">
                    작성 중인 메모
                  </span>
                )}
              </div>
              <p className="text-base text-text-secondary leading-relaxed">
                떠오르는 생각을 빠르게 남기세요.
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/write/article"
          className="group block rounded-2xl border border-border bg-surface p-7 no-underline transition-all duration-200 hover:border-ocean-blue hover:shadow-sm hover:-translate-y-0.5"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-mist-blue flex items-center justify-center">
              <FileText size={20} className="text-ocean-blue" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-text-primary">
                  글쓰기
                </h2>
                {hasArticleDraft && (
                  <span className="text-xs bg-ocean-blue/10 text-ocean-blue px-2 py-0.5 rounded-full">
                    작성 중인 글
                  </span>
                )}
              </div>
              <p className="text-base text-text-secondary leading-relaxed">
                여유롭게 탐구의 기록을 남기세요.
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
