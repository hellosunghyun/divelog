import { Link } from "~/components/content/SmartLink";

export { loader } from "./$stageSlug.server";

export function meta() {
  return [{ title: "Stage 상세 비활성화 — DiveLog" }];
}

export default function StageDetailPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[720px] flex-col justify-center px-6 py-16 text-center">
      <p className="text-sm font-medium text-text-tertiary">비활성화된 경로</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary">
        Stage 상세는 현재 열려 있지 않습니다
      </h1>
      <p className="mt-4 text-base leading-7 text-text-secondary">
        `routes.ts`에서 Stage 상세 경로가 비활성화되어 있어, 이 파일은 워크트리 타입 안정성을 위한 안전한 자리표시자만 유지합니다.
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
