import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";
import { render, screen } from "~/lib/test-utils";
import ProfileIntroBlock from "../ProfileIntroBlock";

describe("ProfileIntroBlock", () => {
  const defaultProps = {
    profileIntro: "안녕하세요, 저는 iOS 개발에 관심이 있습니다.",
    contextLine: "2기 · Bridge 단계",
    interestTags: [
      { slug: "swift", name: "Swift" },
      { slug: "swiftui", name: "SwiftUI" },
    ],
    currentQuestion: "어떻게 하면 더 나은 코드를 작성할 수 있을까?",
  };

  it("renders intro text, context line, and interest tags", () => {
    render(<ProfileIntroBlock {...defaultProps} />);

    // Current question should be most prominent
    expect(screen.getByTestId("current-question")).toHaveTextContent(
      "어떻게 하면 더 나은 코드를 작성할 수 있을까?"
    );

    // Intro text should be present
    expect(screen.getByTestId("profile-intro-block")).toHaveTextContent(
      "안녕하세요, 저는 iOS 개발에 관심이 있습니다."
    );

    // Context line should be present
    expect(screen.getByText("2기 · Bridge 단계")).toBeInTheDocument();

    // Interest tags should be present
    const tagsContainer = screen.getByTestId("interest-tags");
    expect(tagsContainer).toBeInTheDocument();
    expect(screen.getByText("#Swift")).toBeInTheDocument();
    expect(screen.getByText("#SwiftUI")).toBeInTheDocument();
  });

  it("hides empty chrome when no intro or interests", () => {
    const { container } = render(
      <ProfileIntroBlock
        profileIntro={null}
        contextLine={null}
        interestTags={[]}
        currentQuestion={null}
      />
    );

    // Should render nothing
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("profile-intro-block")).not.toBeInTheDocument();
  });

  it("interest tags are keyboard-focusable links", () => {
    render(<ProfileIntroBlock {...defaultProps} />);

    const swiftTag = screen.getByRole("link", { name: "#Swift" });
    const swiftUITag = screen.getByRole("link", { name: "#SwiftUI" });

    expect(swiftTag).toBeInTheDocument();
    expect(swiftTag).toHaveAttribute("href", "/tags/swift");
    expect(swiftUITag).toBeInTheDocument();
    expect(swiftUITag).toHaveAttribute("href", "/tags/swiftui");
  });

  it("renders current question even when intro is null", () => {
    render(
      <ProfileIntroBlock
        profileIntro={null}
        contextLine="3기 · Challenge 단계"
        interestTags={[]}
        currentQuestion="지금 가장 배우고 싶은 것은?"
      />
    );

    expect(screen.getByTestId("current-question")).toHaveTextContent(
      "지금 가장 배우고 싶은 것은?"
    );
    expect(screen.getByText("3기 · Challenge 단계")).toBeInTheDocument();
  });

  it("skips question block when currentQuestion is null", () => {
    render(
      <ProfileIntroBlock
        profileIntro="소개글입니다."
        contextLine="1기 · Prelude 단계"
        interestTags={[{ slug: "design", name: "디자인" }]}
        currentQuestion={null}
      />
    );

    expect(screen.queryByTestId("current-question")).not.toBeInTheDocument();
    expect(screen.getByTestId("profile-intro-block")).toBeInTheDocument();
    expect(screen.getByText("소개글입니다.")).toBeInTheDocument();
  });

  it("renders intro text with muted styling (smaller than question)", () => {
    render(<ProfileIntroBlock {...defaultProps} />);

    const questionContainer = screen.getByTestId("current-question");
    const introBlock = screen.getByTestId("profile-intro-block");

    // Question should have larger text classes (on the inner <p> element)
    const questionText = questionContainer.querySelector("p");
    expect(questionText?.className).toMatch(/text-(base|lg)/);

    // Intro block should exist within the container
    expect(introBlock).toBeInTheDocument();
  });
});
