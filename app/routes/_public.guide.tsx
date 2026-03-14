import type { Route } from "./+types/_public.guide";
import HeroSection from "../components/HeroSection";
import CTABand from "../components/CTABand";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "가이드 — divelog" }];
}

export async function loader(_args: Route.LoaderArgs) {
  return {};
}

export default function GuidePage() {
  return (
    <div>
      <HeroSection
        variant="home"
        title="divelog 가이드"
        subtitle="탐구를 기록하는 방법을 안내합니다. 완성된 글이 아니어도 괜찮습니다."
      />

      <div
        style={{
          maxWidth: "var(--max-reading-width)",
          margin: "0 auto",
          padding: "var(--space-12) var(--space-4)",
        }}
      >
        <section style={{ marginBottom: "var(--space-10)" }}>
          <h2
            style={{
              fontSize: "var(--font-size-2xl)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-4)",
            }}
          >
            기록하기
          </h2>
          <p
            style={{
              fontSize: "var(--font-size-base)",
              lineHeight: "var(--line-height-relaxed)",
              color: "var(--color-text-secondary)",
            }}
          >
            divelog는 완성된 글을 쓰는 곳이 아닙니다. 탐구하는 과정을 기록하는 곳입니다.
            아직 정리되지 않은 생각, 막막한 질문, 작은 발견 — 모두 기록할 수 있습니다.
          </p>
          <ul
            style={{
              marginTop: "var(--space-4)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
              paddingLeft: "var(--space-6)",
            }}
          >
            <li style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-secondary)" }}>
              <strong>노트</strong> — 짧고 자유로운 기록
            </li>
            <li style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-secondary)" }}>
              <strong>글</strong> — 조금 더 깊이 있는 탐구
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: "var(--space-10)" }}>
          <h2
            style={{
              fontSize: "var(--font-size-2xl)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-4)",
            }}
          >
            질문 남기기
          </h2>
          <p
            style={{
              fontSize: "var(--font-size-base)",
              lineHeight: "var(--line-height-relaxed)",
              color: "var(--color-text-secondary)",
            }}
          >
            기록마다 질문을 달 수 있습니다. 함께 생각해볼 질문, 나에게 던지는 질문 — 답을
            찾기보다 더 좋은 질문을 가지고 다니는 것이 목표입니다.
          </p>
        </section>

        <section style={{ marginBottom: "var(--space-10)" }}>
          <h2
            style={{
              fontSize: "var(--font-size-2xl)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-4)",
            }}
          >
            응답하기
          </h2>
          <p
            style={{
              fontSize: "var(--font-size-base)",
              lineHeight: "var(--line-height-relaxed)",
              color: "var(--color-text-secondary)",
            }}
          >
            다른 Learner의 기록에 응답할 수 있습니다. 응답에는 5가지 유형이 있습니다:
          </p>
          <ul
            style={{
              marginTop: "var(--space-4)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
              paddingLeft: "var(--space-6)",
            }}
          >
            <li style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-secondary)" }}>
              <strong>공명</strong> — 이 기록이 나에게도 와닿습니다
            </li>
            <li style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-secondary)" }}>
              <strong>질문</strong> — 이 기록에 대해 궁금한 것이 있습니다
            </li>
            <li style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-secondary)" }}>
              <strong>연결</strong> — 내 경험과 연결됩니다
            </li>
            <li style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-secondary)" }}>
              <strong>제안</strong> — 한 가지 제안합니다
            </li>
            <li style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-secondary)" }}>
              <strong>자기답변</strong> — 나 자신의 질문에 답합니다
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: "var(--space-10)" }}>
          <h2
            style={{
              fontSize: "var(--font-size-2xl)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-4)",
            }}
          >
            공개 범위
          </h2>
          <p
            style={{
              fontSize: "var(--font-size-base)",
              lineHeight: "var(--line-height-relaxed)",
              color: "var(--color-text-secondary)",
            }}
          >
            기록의 공개 범위를 선택할 수 있습니다: 임시저장(나만), 코호트 공개(같은 기수에게),
            전체 공개.
          </p>
        </section>

        <section style={{ marginBottom: "var(--space-10)" }}>
          <h2
            style={{
              fontSize: "var(--font-size-2xl)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-4)",
            }}
          >
            운영 원칙
          </h2>
          <p
            style={{
              fontSize: "var(--font-size-base)",
              lineHeight: "var(--line-height-relaxed)",
              color: "var(--color-text-secondary)",
            }}
          >
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
