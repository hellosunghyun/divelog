import type { Route } from "./+types/terms";
import HeroSection from "~/components/sections/HeroSection";
import { createLogger } from "~/lib/infra/logger.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "이용약관 — DiveLog" }];
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
  const logger = createLogger(request, context.cloudflare.env).child({ route: "terms" });
  logger.info("loader_start");
  logger.info("loader_end");
  return {};
}

export default function TermsPage() {
  return (
    <div>
      <HeroSection
        variant="home"
        title="이용약관"
        subtitle="DiveLog 서비스 이용에 관한 약관입니다."
      />

      <div className="max-w-reading mx-auto pt-12 px-6 md:pt-20 pb-16 md:pb-24">
        <p className="text-sm text-text-tertiary mb-10">
          시행일: 2026년 3월 1일
        </p>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-4">
            제1조 (목적)
          </h2>
          <p className="text-base leading-relaxed text-text-secondary">
            이 약관은 DiveLog(이하 &ldquo;서비스&rdquo;)를 이용하는 데 필요한 조건과 절차,
            이용자와 운영자의 권리·의무를 안내하기 위한 것입니다.
            서비스는 Apple Developer Academy @ POSTECH(이하 &ldquo;아카데미&rdquo;) 참여자의
            학습 여정을 기록하고 공유하기 위해 운영됩니다.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-4">
            제2조 (서비스의 내용)
          </h2>
          <p className="text-base leading-relaxed text-text-secondary mb-4">
            서비스는 다음의 기능을 제공합니다.
          </p>
          <ul className="flex flex-col gap-2 pl-6 text-base text-text-secondary">
            <li>학습 기록(노트, 글) 작성 및 관리</li>
            <li>질문 남기기 및 응답(공명, 질문, 연결, 제안, 자기답변)</li>
            <li>여정(Stage) 탐색 및 기록 열람</li>
            <li>러너 프로필 열람</li>
            <li>기타 운영자가 정하는 부가 기능</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-4">
            제3조 (이용자격)
          </h2>
          <p className="text-base leading-relaxed text-text-secondary">
            서비스는 아카데미 참여자(Learner), 멘토, 운영진 및 이들이 초대한 사용자가
            이용할 수 있습니다. 서비스 가입 및 인증은 ada-kr-pos.com을 통해 이루어지며,
            별도의 회원가입 절차는 없습니다.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-4">
            제4조 (이용자의 의무)
          </h2>
          <p className="text-base leading-relaxed text-text-secondary mb-4">
            이용자는 서비스를 이용할 때 다음 사항을 지켜야 합니다.
          </p>
          <ul className="flex flex-col gap-2 pl-6 text-base text-text-secondary">
            <li>타인의 탐구와 기록을 존중하고, 비교·평가·순위를 목적으로 하지 않습니다.</li>
            <li>타인의 개인정보를 동의 없이 수집하거나 공개하지 않습니다.</li>
            <li>욕설, 혐오 표현, 차별적 발언을 하지 않습니다.</li>
            <li>서비스의 정상적인 운영을 방해하는 행위를 하지 않습니다.</li>
            <li>본인의 계정을 다른 사람에게 양도하거나 공유하지 않습니다.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-4">
            제5조 (콘텐츠의 권리)
          </h2>
          <p className="text-base leading-relaxed text-text-secondary">
            이용자가 작성한 기록, 질문, 응답 등의 콘텐츠에 대한 저작권은 이용자에게 있습니다.
            다만, 서비스 운영에 필요한 범위 내에서 콘텐츠를 저장, 표시, 백업하는 것에 동의합니다.
            이용자의 콘텐츠는 이용자가 설정한 공개 범위(임시저장, 코호트 공개, 전체 공개)에 따라 노출됩니다.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-4">
            제6조 (서비스 운영 및 변경)
          </h2>
          <p className="text-base leading-relaxed text-text-secondary">
            운영자는 서비스의 안정적 운영을 위해 사전 공지 후 서비스 내용을 변경하거나
            일시적으로 중단할 수 있습니다. 서비스는 비영리 목적으로 운영되며,
            아카데미 일정에 따라 운영 기간이 조정될 수 있습니다.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-4">
            제7조 (이용 제한)
          </h2>
          <p className="text-base leading-relaxed text-text-secondary">
            운영자는 제4조를 위반한 이용자에 대해 콘텐츠 비공개 처리, 기능 제한,
            이용 정지 등의 조치를 취할 수 있습니다. 조치 전 사유를 안내하며,
            이의가 있을 경우 운영자에게 문의할 수 있습니다.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-4">
            제8조 (면책)
          </h2>
          <p className="text-base leading-relaxed text-text-secondary">
            서비스는 &ldquo;있는 그대로&rdquo; 제공되며, 운영자는 서비스의 지속적인 제공이나
            데이터의 영구 보존을 보장하지 않습니다. 이용자 간 콘텐츠로 발생한 분쟁에 대해
            운영자는 중재를 지원하되, 법적 책임을 지지 않습니다.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-4">
            제9조 (약관의 변경)
          </h2>
          <p className="text-base leading-relaxed text-text-secondary">
            이 약관은 서비스 내 공지를 통해 변경될 수 있으며, 변경된 약관은
            공지한 날로부터 7일 후에 효력이 발생합니다.
          </p>
        </section>

        <div className="border-t border-border pt-8 mt-12">
          <p className="text-sm text-text-tertiary leading-relaxed">
            이 약관에 대해 궁금한 점이 있으시면 운영진에게 문의해 주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
