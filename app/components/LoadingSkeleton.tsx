interface LoadingSkeletonProps {
  variant?: "card" | "detail" | "list";
  count?: number;
}

function SkeletonBox({ width = "100%", height = "20px", rounded = false }: { width?: string; height?: string; rounded?: boolean }) {
  return (
    <div
      style={{
        width,
        height,
        backgroundColor: "var(--color-border)",
        borderRadius: rounded ? "var(--radius-full)" : "var(--radius-sm)",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

function CardSkeleton() {
  return (
    <div
      style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border)",
        padding: "var(--space-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <SkeletonBox width="30%" height="18px" rounded />
      <SkeletonBox width="70%" height="22px" />
      <SkeletonBox height="16px" />
      <SkeletonBox width="85%" height="16px" />
    </div>
  );
}

export default function LoadingSkeleton({ variant = "card", count = 3 }: LoadingSkeletonProps) {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
      role="status"
      aria-busy="true"
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
