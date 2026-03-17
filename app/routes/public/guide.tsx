import { useSearchParams } from "react-router";
import type { Route } from "./+types/guide";
import HeroSection from "~/components/sections/HeroSection";
import CTABand from "~/components/sections/CTABand";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "가이드 — DiveLog" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { createLogger } = await import("~/lib/infra/logger.server");

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
        title="DiveLog 가이드"
        subtitle="탐구를 기록하는 방법을 안내합니다. 완성된 글이 아니어도 괜찮습니다."
      />

      <div className="max-w-reading mx-auto py-12 px-6 md:py-20">
        {(isSessionError || isConfigError) && (
          <div className="mb-8 rounded-2xl border border-ocean-blue/20 bg-mist-blue/30 p-6">
            {isConfigError ? (
              <>
                <h3 className="text-lg font-bold text-deep-ocean mb-2">로그인 설정 확인이 필요합니다</h3>
                <p className="text-sm text-text-secondary leading-relaxed mb-4">
                  현재는 다시 로그인해도 DiveLog에서 세션을 확인할 수 없는 상태입니다.
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
             다른 러너의 기록에 응답할 수 있습니다. 응답에는 5가지 유형이 있습니다:
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

        <section className="mb-10">
          <h2 className="text-2xl font-semibold leading-title text-text-primary mb-6">
            자주 묻는 질문
          </h2>
          <div className="flex flex-col gap-6">
            <div className="border-b border-border pb-6">
              <h3 className="text-lg font-semibold text-text-primary mb-3">
                기록이란 무엇인가요?
              </h3>
              <p className="text-base leading-relaxed text-text-secondary">
                기록은 완성된 글이 아니어도 괜찮습니다. 탐구하는 과정을 남기는 곳입니다.
                <strong className="text-text-primary"> 노트</strong>는 짧고 자유로운 기록에,
                <strong className="text-text-primary"> 글</strong>은 조금 더 깊이 있는 탐구에 적합합니다.
                아직 정리되지 않은 생각이나 막막한 질문도 모두 기록이 될 수 있습니다.
              </p>
            </div>

            <div className="border-b border-border pb-6">
              <h3 className="text-lg font-semibold text-text-primary mb-3">
                응답 유형에는 어떤 것이 있나요?
              </h3>
              <p className="text-base leading-relaxed text-text-secondary">
                다른 러너의 기록에 남길 수 있는 응답은 5가지입니다:
              </p>
              <ul className="mt-3 flex flex-col gap-2 pl-5 text-base text-text-secondary">
                <li><strong className="text-text-primary">공명</strong> — 이 기록에서 무엇이 남았는지 말합니다</li>
                <li><strong className="text-text-primary">질문</strong> — 더 듣고 싶은 지점을 엽니다</li>
                <li><strong className="text-text-primary">연결</strong> — 내 경험이나 다른 기록과 이어봅니다</li>
                <li><strong className="text-text-primary">제안</strong> — 다음 시도를 조심스럽게 제안합니다</li>
                <li><strong className="text-text-primary">자기답변</strong> — 나 자신의 질문에 답합니다</li>
              </ul>
            </div>

            <div className="border-b border-border pb-6">
              <h3 className="text-lg font-semibold text-text-primary mb-3">
                공개 범위(Visibility)는 어떻게 설정하나요?
              </h3>
              <p className="text-base leading-relaxed text-text-secondary">
                기록의 공개 범위는 세 단계로 설정할 수 있습니다:
              </p>
              <ul className="mt-3 flex flex-col gap-2 pl-5 text-base text-text-secondary">
                <li><strong className="text-text-primary">임시저장</strong> — 나만 볼 수 있습니다. 작성 중인 생각을 안전하게 보관합니다.</li>
                <li><strong className="text-text-primary">코호트 공개</strong> — 같은 기수의 러너들에게 공개됩니다.</li>
                <li><strong className="text-text-primary">전체 공개</strong> — 모든 사람이 볼 수 있습니다.</li>
              </ul>
              <p className="mt-3 text-base leading-relaxed text-text-secondary">
                공개 범위는 언제든 변경할 수 있습니다. 처음에는 코호트 공개로 시작하고, 준비가 되면 전체 공개로 전환해도 좋습니다.
              </p>
            </div>

            <div className="border-b border-border pb-6">
              <h3 className="text-lg font-semibold text-text-primary mb-3">
                협업은 어떻게 시작하나요?
              </h3>
              <p className="text-base leading-relaxed text-text-secondary">
                협업 단위(Collaboration Unit)는 챌린지 진행 중 실제로 협업이 필요할 때 자연스럽게 형성됩니다.
                개인 탐구가 먼저이며, 협업은 선택 사항입니다. 협업이 시작되면 팀 이름보다
                <strong className="text-text-primary"> 무엇을 붙들고 있는가</strong>가 먼저 보이게 됩니다.
              </p>
            </div>

            <div className="border-b border-border pb-6">
              <h3 className="text-lg font-semibold text-text-primary mb-3">
                설정은 어디서 변경하나요?
              </h3>
              <p className="text-base leading-relaxed text-text-secondary">
                기본 공개 범위, 응답 선호도, 알림 설정 등은{" "}
                <a href="/settings" className="text-ocean-blue hover:underline">
                  설정 페이지
                </a>
                에서 변경할 수 있습니다. 프로필 정보(이름, 사진, 소개)는{" "}
                <a href="https://ada-kr-pos.com" className="text-ocean-blue hover:underline" target="_blank" rel="noopener noreferrer">
                  ada-kr-pos.com
                </a>
                에서 관리됩니다.
              </p>
            </div>
          </div>
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
