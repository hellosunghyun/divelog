import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";
import { render, screen } from "~/lib/test-utils";
import { DiscoveryHelperBlocks, StarterLinksBlock, CurrentStageBlock } from "../DiscoveryHelperBlocks";

describe("DiscoveryHelperBlocks", () => {
  const defaultProps = {
    currentStage: { id: "stage-1", name: "Prelude", slug: "prelude" },
    recentActivity: { recordCount: 5, questionCount: 3, lastActiveAt: "2024-01-15" },
    starterRecords: [
      { slug: "record-1", title: "첫 번째 기록" },
      { slug: "record-2", title: "두 번째 기록" },
    ],
  };

  describe("CurrentStageBlock", () => {
    it("renders current stage with link", () => {
      render(<CurrentStageBlock stage={defaultProps.currentStage} />);

      const stageBlock = screen.getByTestId("current-stage-block");
      expect(stageBlock).toBeInTheDocument();
      expect(stageBlock).toHaveTextContent("현재 여정");
      expect(stageBlock).toHaveTextContent("Prelude");

      const stageLink = screen.getByRole("link", { name: /Prelude/ });
      expect(stageLink).toHaveAttribute("href", "/journey/prelude");
    });
  });

  describe("StarterLinksBlock", () => {
    it("renders starter links with record links", () => {
      render(<StarterLinksBlock records={defaultProps.starterRecords} />);

      const starterLinksBlock = screen.getByTestId("starter-links");
      expect(starterLinksBlock).toBeInTheDocument();
      expect(starterLinksBlock).toHaveTextContent("여기서 시작해보세요");

      const firstRecordLink = screen.getByRole("link", { name: "첫 번째 기록" });
      expect(firstRecordLink).toHaveAttribute("href", "/logs/record-1");

      const secondRecordLink = screen.getByRole("link", { name: "두 번째 기록" });
      expect(secondRecordLink).toHaveAttribute("href", "/logs/record-2");
    });

    it("hides starter links block when records is empty", () => {
      const { container } = render(<StarterLinksBlock records={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it("shows only up to 2 starter record links even when more are provided", () => {
      render(
        <StarterLinksBlock
          records={[
            { slug: "record-1", title: "첫 번째 기록" },
            { slug: "record-2", title: "두 번째 기록" },
            { slug: "record-3", title: "세 번째 기록" },
          ]}
        />
      );

      const recordLinks = screen.getAllByRole("link", { name: /기록$/ });
      expect(recordLinks).toHaveLength(2);
    });

    it("shows only 1 starter link when only 1 is available", () => {
      render(
        <StarterLinksBlock
          records={[{ slug: "only-record", title: "유일한 기록" }]}
        />
      );

      expect(screen.getByRole("link", { name: "유일한 기록" })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /두 번째/ })).not.toBeInTheDocument();
    });

    it("links navigate to /logs/:recordSlug", () => {
      render(<StarterLinksBlock records={defaultProps.starterRecords} />);

      const links = screen.getAllByRole("link");
      const recordLinks = links.filter(
        (link) => link.getAttribute("href")?.startsWith("/logs/")
      );

      expect(recordLinks[0]).toHaveAttribute("href", "/logs/record-1");
      expect(recordLinks[1]).toHaveAttribute("href", "/logs/record-2");
    });
  });

  describe("DiscoveryHelperBlocks composite", () => {
    it("renders stage, recent activity, and starter links", () => {
      render(<DiscoveryHelperBlocks {...defaultProps} />);

      expect(screen.getByTestId("current-stage-block")).toBeInTheDocument();
      expect(screen.getByTestId("recent-activity-block")).toBeInTheDocument();
      expect(screen.getByTestId("starter-links")).toBeInTheDocument();
    });

    it("renders recent activity as inline text with record and question counts", () => {
      render(<DiscoveryHelperBlocks {...defaultProps} />);

      const activityBlock = screen.getByTestId("recent-activity-block");
      expect(activityBlock).toBeInTheDocument();
      expect(activityBlock).toHaveTextContent("기록 5개");
      expect(activityBlock).toHaveTextContent("질문 3개");
    });

    it("hides stage block when currentStage is null", () => {
      render(<DiscoveryHelperBlocks {...defaultProps} currentStage={null} />);

      expect(screen.queryByTestId("current-stage-block")).not.toBeInTheDocument();
      expect(screen.getByTestId("recent-activity-block")).toBeInTheDocument();
      expect(screen.getByTestId("starter-links")).toBeInTheDocument();
    });

    it("hides recent activity block when recentActivity is null", () => {
      render(<DiscoveryHelperBlocks {...defaultProps} recentActivity={null} />);

      expect(screen.queryByTestId("recent-activity-block")).not.toBeInTheDocument();
      expect(screen.getByTestId("current-stage-block")).toBeInTheDocument();
      expect(screen.getByTestId("starter-links")).toBeInTheDocument();
    });

    it("hides recent activity block when both counts are 0", () => {
      render(
        <DiscoveryHelperBlocks
          {...defaultProps}
          recentActivity={{ recordCount: 0, questionCount: 0, lastActiveAt: null }}
        />
      );

      expect(screen.queryByTestId("recent-activity-block")).not.toBeInTheDocument();
    });

    it("shows recent activity block when only recordCount is > 0", () => {
      render(
        <DiscoveryHelperBlocks
          {...defaultProps}
          recentActivity={{ recordCount: 3, questionCount: 0, lastActiveAt: "2024-01-15" }}
        />
      );

      const activityBlock = screen.getByTestId("recent-activity-block");
      expect(activityBlock).toBeInTheDocument();
      expect(activityBlock).toHaveTextContent("기록 3개");
      expect(activityBlock).not.toHaveTextContent("질문");
    });

    it("shows recent activity block when only questionCount is > 0", () => {
      render(
        <DiscoveryHelperBlocks
          {...defaultProps}
          recentActivity={{ recordCount: 0, questionCount: 2, lastActiveAt: "2024-01-15" }}
        />
      );

      const activityBlock = screen.getByTestId("recent-activity-block");
      expect(activityBlock).toBeInTheDocument();
      expect(activityBlock).not.toHaveTextContent("기록");
      expect(activityBlock).toHaveTextContent("질문 2개");
    });

    it("hides starter links block when starterRecords is empty", () => {
      render(<DiscoveryHelperBlocks {...defaultProps} starterRecords={[]} />);

      expect(screen.queryByTestId("starter-links")).not.toBeInTheDocument();
      expect(screen.getByTestId("current-stage-block")).toBeInTheDocument();
      expect(screen.getByTestId("recent-activity-block")).toBeInTheDocument();
    });

    it("returns null when all sections are empty", () => {
      const { container } = render(
        <DiscoveryHelperBlocks
          currentStage={null}
          recentActivity={null}
          starterRecords={[]}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("copy tone is warm, plain, non-judgmental", () => {
    it("uses warm language for starter links header", () => {
      render(<StarterLinksBlock records={defaultProps.starterRecords} />);

      expect(screen.getByText("여기서 시작해보세요")).toBeInTheDocument();
    });

    it("does NOT use popularity language", () => {
      render(<StarterLinksBlock records={defaultProps.starterRecords} />);

      const container = screen.getByTestId("starter-links");
      expect(container).not.toHaveTextContent(/인기/);
      expect(container).not.toHaveTextContent(/베스트/);
      expect(container).not.toHaveTextContent(/추천/);
    });
  });
});
