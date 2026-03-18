import { data } from "react-router";

const DISABLED_MESSAGE = "현재 Stage 상세 경로는 비활성화되어 있습니다.";

export async function loader() {
  throw data(DISABLED_MESSAGE, { status: 404 });
}
