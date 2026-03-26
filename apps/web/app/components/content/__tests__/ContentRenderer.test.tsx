import "@testing-library/jest-dom";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "~/lib/test-utils";
import { ContentRenderer } from "../ContentRenderer";

describe("ContentRenderer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

    it("preserves empty paragraphs as visible blank lines", () => {
      const contentHtml = "<p>첫 문단</p><p></p><p>둘째 문단</p>";
      const { container } = render(
        <ContentRenderer contentHtml={contentHtml} format="article" />
      );

      const paragraphs = container.querySelectorAll("p");
      expect(paragraphs).toHaveLength(3);
      expect(paragraphs[1]?.querySelector("br")).toBeInTheDocument();
    });

    it("re-renders corrupted article html from stored content", () => {
      const content = JSON.stringify({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "공통 키워드를 묶으니" }] }],
      });

      const { container } = render(
        <ContentRenderer contentHtml="<p>공통 키��드를 묶으니</p>" content={content} format="article" />
      );

      expect(container.textContent).toContain("공통 키워드를 묶으니");
      expect(container.textContent).not.toContain("키��드");
    });

    it("fetches clean article payload when streamed content and html are corrupted", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: JSON.stringify({
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text: "공통 키워드를 묶으니" }] }],
          }),
          contentHtml: "<p>공통 키워드를 묶으니</p>",
        }),
      });

      vi.stubGlobal("fetch", fetchMock);

      const { container, findByText } = render(
        <ContentRenderer
          contentHtml="<p>공통 키��드를 묶으니</p>"
          content={JSON.stringify({
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text: "공통 키��드를 묶으니" }] }],
          })}
          format="article"
          fallbackContentUrl="/api/record-content?id=rec-1"
        />
      );

      await findByText("공통 키워드를 묶으니");

      expect(fetchMock).toHaveBeenCalledWith("/api/record-content?id=rec-1", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      expect(container.textContent).toContain("공통 키워드를 묶으니");
      expect(container.textContent).not.toContain("키��드");
    });

    it("does not fetch clean article payload when rendered article text is already clean", () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const content = JSON.stringify({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "깨끗한 본문" }] }],
      });

      render(
        <ContentRenderer
          contentHtml="<p>깨끗한 본문</p>"
          content={content}
          format="article"
          fallbackContentUrl="/api/record-content?id=rec-1"
        />
      );

      expect(fetchMock).not.toHaveBeenCalled();
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
