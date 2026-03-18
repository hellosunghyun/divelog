import { Link } from "~/components/content/SmartLink";
import { FileText, Article } from "@phosphor-icons/react";
import type { Route } from "./+types/index";
import { requireVerified } from "~/lib/auth/auth.middleware.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "기록하기 — DiveLog" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireVerified(request, context);
  return {};
}

export default function WritePage() {
  return (
    <div className="mx-auto py-16 px-4 md:py-24 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-semibold text-text-primary mb-3">기록하기</h1>
        <p className="text-lg text-text-secondary">
          완성된 글이 아니어도 괜찮습니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        <Link to="/write/note" className="group bg-surface-secondary ring-1 ring-border p-1.5 rounded-2xl hover:shadow-tinted-md transition-premium active:scale-[0.98]">
          <div className="bg-surface rounded-xl p-8 text-center h-full flex flex-col items-center justify-center">
            <FileText size={48} weight="light" className="mx-auto text-text-tertiary mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-text-primary">노트</h2>
            <p className="text-sm text-text-secondary">짧은 생각, 메모, 일상 기록</p>
          </div>
        </Link>

        <Link to="/write/article" className="group bg-surface-secondary ring-1 ring-border p-1.5 rounded-2xl hover:shadow-tinted-md transition-premium active:scale-[0.98]">
          <div className="bg-surface rounded-xl p-8 text-center h-full flex flex-col items-center justify-center">
            <Article size={48} weight="light" className="mx-auto text-text-tertiary mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-text-primary">아티클</h2>
            <p className="text-sm text-text-secondary">깊이 있는 글, 에세이, 분석</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
