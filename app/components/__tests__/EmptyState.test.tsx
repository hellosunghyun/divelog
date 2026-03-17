// @ts-nocheck
import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";
import { render, screen } from "~/lib/test-utils";
import EmptyState from "../EmptyState";

describe("EmptyState", () => {
  it("renders with default generic message", () => {
    render(<EmptyState />);
    expect(screen.getByText("내용이 없습니다")).toBeInTheDocument();
    expect(
      screen.getByText("아직 이 공간이 비어 있습니다.")
    ).toBeInTheDocument();
  });

  it("renders with records variant", () => {
    render(<EmptyState variant="records" />);
    expect(screen.getByText("아직 기록이 없습니다")).toBeInTheDocument();
    expect(
      screen.getByText("완성된 글이 아니어도 괜찮습니다. 지금 이 순간을 기록해보세요.")
    ).toBeInTheDocument();
  });

  it("renders with questions variant", () => {
    render(<EmptyState variant="questions" />);
    expect(screen.getByText("남겨진 질문이 없습니다")).toBeInTheDocument();
    expect(
      screen.getByText("기록을 남기면 질문을 달 수 있습니다.")
    ).toBeInTheDocument();
  });

  it("renders with responses variant", () => {
    render(<EmptyState variant="responses" />);
    expect(screen.getByText("아직 응답이 없습니다")).toBeInTheDocument();
    expect(
      screen.getByText(
        "이 기록에 공명하거나, 질문을 남기거나, 연결할 수 있습니다."
      )
    ).toBeInTheDocument();
  });

  it("renders with custom message", () => {
    const customMessage = "커스텀 메시지입니다";
    render(<EmptyState variant="records" message={customMessage} />);
    expect(screen.getByText("아직 기록이 없습니다")).toBeInTheDocument();
    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it("renders action button when provided", () => {
    const action = { label: "기록 남기기", href: "/write" };
    render(<EmptyState variant="records" action={action} />);
    const button = screen.getByRole("link", { name: "기록 남기기" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("href", "/write");
  });

  it("does not render action button when not provided", () => {
    render(<EmptyState variant="records" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
