import "@testing-library/jest-dom";
import { screen, within } from "@testing-library/react";
import { render } from "~/lib/test-utils";
import { DiscoveryHelperBlocks } from "../DiscoveryHelperBlocks";
import ProfileIntroBlock from "../ProfileIntroBlock";
import SelfAnswerSection from "../SelfAnswerSection";

const profileProps = {
  profileIntro: "질문을 오래 붙잡으며 협업과 제품의 언어를 배우고 있습니다.",
  contextLine: "2기 · Challenge 단계",
  interestTags: [
    { slug: "swift", name: "Swift" },
    { slug: "design-systems", name: "Design Systems" },
  ],
  currentQuestion: "어떤 기록이 다음 질문으로 이어질까?",
};

const discoveryProps = {
  currentStage: { id: "stage-1", name: "Challenge", slug: "challenge" },
  recentActivity: { recordCount: 4, questionCount: 2, lastActiveAt: "2026-03-18" },
  starterRecords: [
    { slug: "bridge-retrospective", title: "브리지 회고 기록" },
    { slug: "challenge-note", title: "챌린지 탐색 노트" },
  ],
  learnerSlug: "sunghyun",
};

const selfAnswers = [
  {
    id: "self-answer-1",
    questionTitle: "이번 달에 다시 답해보고 싶은 질문은 무엇인가요?",
    snippet: "질문을 남기는 방식이 팀의 리듬을 바꿀 수 있다는 점을 다시 보게 되었습니다.",
    recordSlug: "monthly-self-answer",
  },
];

describe("learner profile accessibility regressions", () => {
  it("interest tags are keyboard-focusable links", () => {
    const { container } = render(
      <>
        <ProfileIntroBlock {...profileProps} />
        <DiscoveryHelperBlocks {...discoveryProps} />
      </>
    );

    const interestTags = within(screen.getByTestId("interest-tags")).getAllByRole("link");
    expect(interestTags).toHaveLength(2);

    interestTags.forEach((tagLink: HTMLElement) => {
      expect(tagLink.tagName).toBe("A");
      expect(tagLink).toHaveAttribute("href");
      expect(tagLink.getAttribute("href")).toMatch(/^\/tags\//);
      tagLink.focus();
      expect(tagLink).toHaveFocus();
      expect(tagLink).not.toHaveAttribute("aria-hidden", "true");
      expect(tagLink).not.toHaveAttribute("role", "presentation");
    });

    const starterLinks = within(screen.getByTestId("starter-links")).getAllByRole("link");
    expect(starterLinks).toHaveLength(2);
    starterLinks.forEach((starterLink: HTMLElement) => {
      expect(starterLink).toHaveAttribute("href");
      expect(starterLink.getAttribute("href")).toMatch(/^\/logs\//);
    });

    expect(
      container.querySelectorAll('a[aria-hidden="true"], a[role="presentation"], [role="presentation"][href], [aria-hidden="true"][href]')
    ).toHaveLength(0);
  });

  it("heading hierarchy is sequential", () => {
    render(
      <main>
        <h1>러너 프로필</h1>
        <SelfAnswerSection selfAnswers={selfAnswers} />
      </main>
    );

    const headings = screen.getAllByRole("heading");
    const levels = headings.map((heading: HTMLElement) => Number(heading.tagName.slice(1)));

    expect(screen.getByRole("heading", { name: "자기답변" }).tagName).toMatch(/^H[23]$/);

    for (let index = 1; index < levels.length; index += 1) {
      expect(levels[index] - levels[index - 1]).toBeLessThanOrEqual(1);
    }
  });

  it("mobile viewport renders without overflow", () => {
    window.innerWidth = 375;

    render(
      <div style={{ width: 320 }}>
        <ProfileIntroBlock
          {...profileProps}
          interestTags={[
            { slug: "really-long-tag", name: "아주길고줄바꿈이필요한관심사태그이름입니다" },
          ]}
          currentQuestion="아주 길게 이어지는 질문이 모바일 화면 안에서도 자연스럽게 줄바꿈되어야 합니다"
        />
        <DiscoveryHelperBlocks
          {...discoveryProps}
          starterRecords={[
            {
              slug: "very-long-record-slug",
              title: "모바일 화면에서도 넘치지 않아야 하는 아주 긴 시작 기록 제목입니다",
            },
          ]}
        />
        <SelfAnswerSection
          selfAnswers={[
            {
              id: "self-answer-mobile",
              questionTitle: "모바일 화면에서 카드 제목도 안전하게 줄바꿈되어야 하나요?",
              snippet: "긴 문장도 컨테이너 밖으로 넘치지 않고 읽을 수 있어야 합니다.",
              recordSlug: "mobile-self-answer",
            },
          ]}
        />
      </div>
    );

    expect(screen.getByTestId("profile-intro-block")).toHaveClass("min-w-0");
    expect(screen.getByTestId("interest-tags")).toHaveClass("flex-wrap");
    expect(screen.getByRole("link", { name: /관심사태그이름입니다/ })).toHaveClass("break-words");

    expect(screen.getByTestId("starter-links")).toHaveClass("min-w-0");
    expect(screen.getByRole("link", { name: /아주 긴 시작 기록 제목입니다/ })).toHaveClass("break-words");

    expect(screen.getByRole("link", { name: /카드 제목도 안전하게 줄바꿈되어야 하나요/ })).toHaveClass("min-w-0");
    expect(screen.getByText("긴 문장도 컨테이너 밖으로 넘치지 않고 읽을 수 있어야 합니다.")).toHaveClass(
      "break-words"
    );
  });
});
