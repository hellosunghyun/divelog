import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";
import { render, screen } from "~/lib/test-utils";
import { ContentRenderer } from "../ContentRenderer";

describe("ContentRenderer", () => {
  describe("article format", () => {
    it("renders blockquote content", () => {
      const contentHtml = "<blockquote><p>첫 번째 문단</p><p>두 번째 문단</p></blockquote>";
      const { container } = render(
        <ContentRenderer contentHtml={contentHtml} format="article" />
      );

      const blockquote = container.querySelector("blockquote");
      expect(blockquote).toBeInTheDocument();
      expect(blockquote).not.toBeNull();

      const paragraphs = blockquote!.querySelectorAll("p");
      expect(paragraphs).toHaveLength(2);
      expect(paragraphs[0]).toHaveTextContent("첫 번째 문단");
      expect(paragraphs[1]).toHaveTextContent("두 번째 문단");
    });

    it("applies editor-content class for article format", () => {
      const contentHtml = "<p>단락그 내용</p>";
      const { container } = render(
        <ContentRenderer contentHtml={contentHtml} format="article" />
      );

      const root = container.firstElementChild;
      expect(root).toHaveClass("editor-content");
    });
  });

  describe("note format", () => {
    it("renders note with editor-content class", () => {
      const contentHtml = "<blockquote><p>인용문</p></blockquote>";
      const { container } = render(
        <ContentRenderer contentHtml={contentHtml} format="note" />
      );

      const root = container.firstElementChild;
      expect(root).toHaveClass("editor-content");
      expect(container.querySelector("blockquote")).toBeInTheDocument();
    });
  });

  describe("mention links", () => {
    it("renders user mention links", () => {
      const contentHtml = '<a class="user-mention" href="/learners/test-user">@테스트사용자</a>';
      render(<ContentRenderer contentHtml={contentHtml} format="article" />);

      const link = screen.getByRole("link", { name: /테스트사용자/ });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/learners/test-user");
    });

    it("renders record reference links", () => {
      const contentHtml = '<a class="record-ref" href="/logs/test-record">#테스트기록</a>';
      render(<ContentRenderer contentHtml={contentHtml} format="article" />);

      const link = screen.getByRole("link", { name: /테스트기록/ });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/logs/test-record");
    });
  });
});
