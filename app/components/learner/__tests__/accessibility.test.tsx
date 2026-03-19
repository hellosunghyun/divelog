import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { screen, within } from "@testing-library/react";
import { render } from "~/lib/test-utils";
import { DiscoveryHelperBlocks, StarterLinksBlock } from "../DiscoveryHelperBlocks";
import SelfAnswerSection from "../SelfAnswerSection";

const discoveryProps = {
  currentStage: { id: "stage-1", name: "Challenge", slug: "challenge" },
  recentActivity: { recordCount: 4, questionCount: 2, lastActiveAt: "2026-03-18" },
  starterRecords: [
    { slug: "bridge-retrospective", title: "브리지 회고 기록" },
    { slug: "challenge-note", title: "챌린지 탐색 노트" },
  ],
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
  it("starter links are keyboard-focusable links", () => {
    render(<StarterLinksBlock records={discoveryProps.starterRecords} />);

    const starterLinks = within(screen.getByTestId("starter-links")).getAllByRole("link");
    expect(starterLinks).toHaveLength(2);
    starterLinks.forEach((starterLink: HTMLElement) => {
      expect(starterLink).toHaveAttribute("href");
      expect(starterLink.getAttribute("href")).toMatch(/^\/logs\//);
    });
  });

  it("activity line shows record and question counts", () => {
    render(<DiscoveryHelperBlocks {...discoveryProps} />);

    const activityBlock = screen.getByTestId("recent-activity-block");
    expect(activityBlock).toHaveTextContent("기록 4개");
    expect(activityBlock).toHaveTextContent("질문 2개");
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

    expect(screen.getByTestId("starter-links")).toHaveClass("min-w-0");
    expect(screen.getByRole("link", { name: /아주 긴 시작 기록 제목입니다/ })).toHaveClass("break-words");

    expect(screen.getByRole("link", { name: /카드 제목도 안전하게 줄바꿈되어야 하나요/ })).toHaveClass("min-w-0");
    expect(screen.getByText("긴 문장도 컨테이너 밖으로 넘치지 않고 읽을 수 있어야 합니다.")).toHaveClass(
      "break-words"
    );
  });
});
