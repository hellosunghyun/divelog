import { data } from "react-router";
import { Link } from "~/components/content/SmartLink";
const DISABLED_MESSAGE = "Collective Memory 편집 화면은 현재 비활성화되어 있습니다.";

export async function loader() {
  throw data(DISABLED_MESSAGE, { status: 404 });
}

export async function action() {
  throw data(DISABLED_MESSAGE, { status: 404 });
}

export function meta() {
  return [{ title: "Collective Memory 비활성화" }];
}

export default function AdminMemoryEditPage() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-[720px] flex-col justify-center px-6 py-16 text-center">
      <p className="text-sm font-medium text-admin-text-secondary">비활성화된 화면</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-admin-text">
        Collective Memory 편집은 현재 닫혀 있습니다
      </h1>
      <p className="mt-4 text-base leading-7 text-admin-text-secondary">
        현재 워크트리에서는 관련 경로가 비활성화되어 있어, 이 파일은 안전한 404 동작만 유지합니다.
      </p>
      <div className="mt-8">
        <Link
          to="/admin"
          className="inline-flex items-center justify-center rounded-full bg-admin-accent px-6 py-3 text-sm font-medium text-white no-underline transition-opacity hover:opacity-90"
        >
          관리자 홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
