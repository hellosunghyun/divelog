import { useSearchParams } from "react-router";
import type { Route } from "./+types/_public.guide";
import HeroSection from "../components/HeroSection";
import CTABand from "../components/CTABand";
import { createLogger } from "../lib/logger.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "가이드 — divelog" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "guide" });
  logger.info("loader_start");
  logger.info("loader_end");
  return {};
}

export default function GuidePage() {
  const [searchParams] = useSearchParams();
  const authError = searchParams.get("auth_error");
  const isSessionError = authError === "1";
  const isConfigError = authError === "config";

  return (
    <div>
      <HeroSection
        variant="home"
        title="divelog 가이드"
        subtitle="탐구를 기록하는 방법을 안내합니다. 완성된 글이 아니어도 괜찮습니다."
      />

      <div className="max-w-reading mx-auto py-12 px-6 md:py-20">
        {(isSessionError || isConfigError) && (
          <div className="mb-8 rounded-2xl border border-ocean-blue/20 bg-mist-blue/30 p-6">
            {isConfigError ? (
              <>
                <h3 className="text-lg font-bold text-deep-ocean mb-2">로그인 설정 확인이 필요합니다</h3>
                <p className="text-sm text-text-secondary leading-relaxed mb-4">
                  현재는 다시 로그인해도 divelog에서 세션을 확인할 수 없는 상태입니다.
                  잠시 후 다시 시도하거나 운영진에게 알려주세요.
                </p>
                <a
                  href="/"
                  className="inline-block rounded-full bg-ocean-blue text-white px-6 py-2.5 text-sm font-bold hover:bg-ocean-blue/90 transition-all no-underline"
                >
                  홈으로 이동
                </a>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-deep-ocean mb-2">로그인 인증을 확인할 수 없습니다</h3>
                <p className="text-sm text-text-secondary leading-relaxed mb-4">
                  ada-kr-pos.com에 로그인되어 있지만 divelog에서 세션을 확인하지 못했습니다.
                  브라우저의 쿠키 설정을 확인하거나, 다시 시도해 주세요.
                </p>
                <a
                  href="https://ada-kr-pos.com/login?callbackUrl=https%3A%2F%2Fdivelog.ada-kr-pos.com%2Fwrite"
                  className="inline-block rounded-full bg-ocean-blue text-white px-6 py-2.5 text-sm font-bold hover:bg-ocean-blue/90 transition-all no-underline"
                >
                  다시 로그인 시도
                </a>
              </>
            )}
          </div>
        )}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-4">
            기록하기
          </h2>
          <p className="text-base leading-relaxed text-text-secondary">
            divelog는 완성된 글을 쓰는 곳이 아닙니다. 탐구하는 과정을 기록하는 곳입니다.
            아직 정리되지 않은 생각, 막막한 질문, 작은 발견 — 모두 기록할 수 있습니다.
          </p>
          <ul className="mt-4 flex flex-col gap-2 pl-6">
            <li className="text-base text-text-secondary">
              <strong>노트</strong> — 짧고 자유로운 기록
            </li>
            <li className="text-base text-text-secondary">
              <strong>글</strong> — 조금 더 깊이 있는 탐구
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-4">
            질문 남기기
          </h2>
          <p className="text-base leading-relaxed text-text-secondary">
            기록마다 질문을 달 수 있습니다. 함께 생각해볼 질문, 나에게 던지는 질문 — 답을
            찾기보다 더 좋은 질문을 가지고 다니는 것이 목표입니다.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-4">
            응답하기
          </h2>
          <p className="text-base leading-relaxed text-text-secondary">
            다른 Learner의 기록에 응답할 수 있습니다. 응답에는 5가지 유형이 있습니다:
          </p>
          <ul className="mt-4 flex flex-col gap-2 pl-6">
            <li className="text-base text-text-secondary">
              <strong>공명</strong> — 이 기록이 나에게도 와닿습니다
            </li>
            <li className="text-base text-text-secondary">
              <strong>질문</strong> — 이 기록에 대해 궁금한 것이 있습니다
            </li>
            <li className="text-base text-text-secondary">
              <strong>연결</strong> — 내 경험과 연결됩니다
            </li>
            <li className="text-base text-text-secondary">
              <strong>제안</strong> — 한 가지 제안합니다
            </li>
            <li className="text-base text-text-secondary">
              <strong>자기답변</strong> — 나 자신의 질문에 답합니다
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-4">
            공개 범위
          </h2>
          <p className="text-base leading-relaxed text-text-secondary">
            기록의 공개 범위를 선택할 수 있습니다: 임시저장(나만), 코호트 공개(같은 기수에게),
            전체 공개.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-4">
            운영 원칙
          </h2>
          <p className="text-base leading-relaxed text-text-secondary">
            divelog는 평가보다 질문을, 비교보다 연결을, 조언보다 공명을 중심으로 운영됩니다.
            다른 사람의 탐구를 존중하고, 나 자신의 탐구를 솔직하게 기록해주세요.
          </p>
        </section>

        <CTABand
          message="지금 시작할 준비가 됐다면, 첫 기록을 남겨보세요."
          primaryCta={{ label: "기록하기", href: "/write" }}
          secondaryCta={{ label: "기록 둘러보기", href: "/logs" }}
        />
      </div>
    </div>
  );
}
