import { data } from "react-router";
import { Link } from "~/components/content/SmartLink";
const DISABLED_MESSAGE = "Collective Memory 경로는 현재 비활성화되어 있습니다.";

export async function loader() {
  throw data(DISABLED_MESSAGE, { status: 404 });
}

export function meta() {
  return [{ title: "Collective Memory 비활성화 — DiveLog" }];
}

export default function MemoryPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[720px] flex-col justify-center px-6 py-16 text-center">
      <p className="text-sm font-medium text-text-tertiary">비활성화된 경로</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary">
        Collective Memory는 현재 열려 있지 않습니다
      </h1>
      <p className="mt-4 text-base leading-7 text-text-secondary">
        현재 스키마와 라우트 구성에서는 Collective Memory 기능이 비활성화되어 있어, 이 파일은 안전한 404 경로로만 유지됩니다.
      </p>
      <div className="mt-8">
        <Link
          to="/journey"
          className="inline-flex items-center justify-center rounded-full bg-deep-ocean px-6 py-3 text-sm font-medium text-white no-underline transition-colors hover:bg-ocean-blue"
        >
          여정으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
