// @ts-nocheck
import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";
import { render, screen } from "~/lib/test-utils";
import SelfAnswerSection from "../SelfAnswerSection";

describe("SelfAnswerSection", () => {
  const mockSelfAnswers = [
    {
      id: "sa-1",
      questionTitle: "이번 주 가장 큰 배움은 무엇이었나요?",
      snippet: "협업의 중요성을 깨달았습니다...",
      recordSlug: "week-10-reflection",
    },
    {
      id: "sa-2",
      questionTitle: "어떤 점이 가장 어려웠나요?",
      snippet: "기술적인 문제보다 소통의 문제가...",
      recordSlug: "week-11-challenges",
    },
  ];

  it("renders section heading", () => {
    render(<SelfAnswerSection selfAnswers={mockSelfAnswers} />);
    expect(screen.getByRole("heading", { name: "자기답변" })).toBeInTheDocument();
  }, 15000);

  it("renders self-answer cards with links", () => {
    render(<SelfAnswerSection selfAnswers={mockSelfAnswers} />);

    // Check section container
    expect(screen.getByTestId("self-answer-section")).toBeInTheDocument();

    // Check cards are rendered
    const cards = screen.getAllByTestId("self-answer-card");
    expect(cards).toHaveLength(2);

    // Check first card content
    expect(screen.getByText("이번 주 가장 큰 배움은 무엇이었나요?")).toBeInTheDocument();
    expect(screen.getByText("협업의 중요성을 깨달았습니다...")).toBeInTheDocument();

    // Check second card content
    expect(screen.getByText("어떤 점이 가장 어려웠나요?")).toBeInTheDocument();
    expect(screen.getByText("기술적인 문제보다 소통의 문제가...")).toBeInTheDocument();

    // Check links to records
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/logs/week-10-reflection");
    expect(links[1]).toHaveAttribute("href", "/logs/week-11-challenges");
  });

  it("shows empty state when no self-answers", () => {
    render(<SelfAnswerSection selfAnswers={[]} />);

    expect(screen.getByTestId("self-answer-section")).toBeInTheDocument();
    expect(screen.getByText("아직 자기답변이 없습니다")).toBeInTheDocument();

    // Should NOT render any cards
    expect(screen.queryAllByTestId("self-answer-card")).toHaveLength(0);
  });

  it("renders cards with editorial style (not chat bubbles)", () => {
    render(<SelfAnswerSection selfAnswers={mockSelfAnswers} />);

    const cards = screen.getAllByTestId("self-answer-card");

    // Each card should be an article element (editorial pattern)
    cards.forEach((card) => {
      expect(card.tagName).toBe("ARTICLE");
    });
  });
});
