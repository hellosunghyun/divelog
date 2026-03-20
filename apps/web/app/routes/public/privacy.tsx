import type { Route } from "./+types/privacy";
import HeroSection from "~/components/sections/HeroSection";
import { createLogger } from "~/lib/infra/logger.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "개인정보처리방침 — DiveLog" }];
}

export function shouldRevalidate({
  formMethod,
  defaultShouldRevalidate,
}: {
  formMethod?: string;
  defaultShouldRevalidate: boolean;
}): boolean {
  if (formMethod && formMethod !== "GET") {
    return defaultShouldRevalidate;
  }
  return false;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "privacy" });
  logger.info("loader_start");
  logger.info("loader_end");
  return {};
}

export default function PrivacyPage() {
  return (
    <div>
      <HeroSection
        variant="home"
        title="개인정보처리방침"
        subtitle="DiveLog가 수집하고 이용하는 개인정보에 관한 안내입니다."
      />

      <div className="max-w-reading mx-auto pt-12 px-6 md:pt-20 pb-16 md:pb-24">
        <p className="text-sm text-text-tertiary mb-10">
          시행일: 2026년 3월 1일
        </p>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-4">
            1. 개인정보의 수집 항목 및 방법
          </h2>
          <p className="text-base leading-relaxed text-text-secondary mb-4">
            DiveLog(이하 &ldquo;서비스&rdquo;)는 다음의 개인정보를 수집합니다.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-base text-text-secondary border-collapse">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left py-3 pr-4 font-semibold text-text-primary">구분</th>
                  <th className="text-left py-3 pr-4 font-semibold text-text-primary">항목</th>
                  <th className="text-left py-3 font-semibold text-text-primary">수집 방법</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-3 pr-4 align-top">필수</td>
                  <td className="py-3 pr-4 align-top">이름, 이메일, 프로필 사진 URL, 코호트 정보</td>
                  <td className="py-3 align-top">ada-kr-pos.com 인증 시 자동 연동</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 pr-4 align-top">서비스 이용</td>
                  <td className="py-3 pr-4 align-top">작성한 기록, 질문, 응답, 공개 범위 설정</td>
                  <td className="py-3 align-top">서비스 이용 과정에서 직접 입력</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 pr-4 align-top">자동 수집</td>
                  <td className="py-3 pr-4 align-top">세션 쿠키, 오류 로그</td>
                  <td className="py-3 align-top">서비스 이용 시 자동 생성</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-4">
            2. 개인정보의 이용 목적
          </h2>
          <p className="text-base leading-relaxed text-text-secondary mb-4">
            수집한 개인정보는 다음의 목적으로만 이용합니다.
          </p>
          <ul className="flex flex-col gap-2 pl-6 text-base text-text-secondary">
            <li>서비스 제공 및 이용자 식별</li>
            <li>기록, 질문, 응답 등 콘텐츠 표시</li>
            <li>알림 발송 (응답, 언급, 시스템 안내)</li>
            <li>서비스 오류 진단 및 개선</li>
            <li>서비스 운영 통계 (비식별 처리)</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-4">
            3. 개인정보의 보유 및 파기
          </h2>
          <p className="text-base leading-relaxed text-text-secondary mb-4">
            개인정보는 서비스 운영 기간 동안 보유하며, 다음의 경우 지체 없이 파기합니다.
          </p>
          <ul className="flex flex-col gap-2 pl-6 text-base text-text-secondary">
            <li>이용자가 탈퇴를 요청한 경우</li>
            <li>서비스 운영이 종료된 경우</li>
            <li>수집 목적이 달성된 경우</li>
          </ul>
          <p className="text-base leading-relaxed text-text-secondary mt-4">
            파기 시 전자적 파일은 복구할 수 없는 방법으로 삭제합니다.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-4">
            4. 개인정보의 제3자 제공
          </h2>
          <p className="text-base leading-relaxed text-text-secondary">
            서비스는 이용자의 개인정보를 제3자에게 제공하지 않습니다.
            다만, 법령에 의해 요구되는 경우에는 관련 법률에 따라 제공될 수 있습니다.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-4">
            5. 개인정보의 처리 위탁
          </h2>
          <p className="text-base leading-relaxed text-text-secondary mb-4">
            서비스 운영을 위해 다음과 같이 개인정보 처리를 위탁하고 있습니다.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-base text-text-secondary border-collapse">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left py-3 pr-4 font-semibold text-text-primary">수탁자</th>
                  <th className="text-left py-3 pr-4 font-semibold text-text-primary">위탁 업무</th>
                  <th className="text-left py-3 font-semibold text-text-primary">보유 기간</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-3 pr-4 align-top">Cloudflare, Inc.</td>
                  <td className="py-3 pr-4 align-top">데이터 저장 및 서비스 호스팅 (D1, Pages)</td>
                  <td className="py-3 align-top">서비스 운영 기간</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 pr-4 align-top">Sentry (Functional Software, Inc.)</td>
                  <td className="py-3 pr-4 align-top">오류 모니터링 및 진단</td>
                  <td className="py-3 align-top">오류 데이터 수집 후 90일</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-4">
            6. 쿠키의 사용
          </h2>
          <p className="text-base leading-relaxed text-text-secondary mb-4">
            서비스는 인증을 위해 다음의 쿠키를 사용합니다.
          </p>
          <ul className="flex flex-col gap-2 pl-6 text-base text-text-secondary">
            <li>
              <strong className="text-text-primary">adakrpos_session</strong> —
              로그인 상태를 유지하기 위한 세션 쿠키 (유효기간 7일, 자동 갱신)
            </li>
          </ul>
          <p className="text-base leading-relaxed text-text-secondary mt-4">
            광고 목적의 쿠키나 행동 추적 쿠키는 사용하지 않습니다.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-4">
            7. 이용자의 권리
          </h2>
          <p className="text-base leading-relaxed text-text-secondary mb-4">
            이용자는 언제든지 다음의 권리를 행사할 수 있습니다.
          </p>
          <ul className="flex flex-col gap-2 pl-6 text-base text-text-secondary">
            <li>본인의 개인정보 열람, 정정, 삭제 요청</li>
            <li>기록의 공개 범위 변경 (임시저장, 나만 보기, 코호트 공개, 전체 공개)</li>
            <li>서비스 탈퇴 및 개인정보 파기 요청</li>
          </ul>
          <p className="text-base leading-relaxed text-text-secondary mt-4">
            프로필 정보(이름, 사진, 소개)의 변경은{" "}
            <a
              href="https://ada-kr-pos.com"
              className="text-ocean-blue hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              ada-kr-pos.com
            </a>
            에서 가능합니다.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-4">
            8. 개인정보의 안전성 확보 조치
          </h2>
          <p className="text-base leading-relaxed text-text-secondary mb-4">
            서비스는 개인정보의 안전한 처리를 위해 다음의 조치를 취하고 있습니다.
          </p>
          <ul className="flex flex-col gap-2 pl-6 text-base text-text-secondary">
            <li>모든 통신에 HTTPS(TLS) 암호화 적용</li>
            <li>인증 토큰 및 API 키의 서버 측 관리</li>
            <li>데이터베이스 접근 권한 최소화</li>
            <li>오류 로그의 개인정보 최소 수집</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-4">
            9. 개인정보처리방침의 변경
          </h2>
          <p className="text-base leading-relaxed text-text-secondary">
            이 방침은 서비스 내 공지를 통해 변경될 수 있으며, 변경된 방침은
            공지한 날로부터 7일 후에 효력이 발생합니다.
          </p>
        </section>

        <div className="border-t border-border pt-8 mt-12">
          <p className="text-sm text-text-tertiary leading-relaxed">
            개인정보 관련 문의는 운영진에게 연락해 주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
