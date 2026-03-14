interface LoadingSkeletonProps {
  variant?: "card" | "detail" | "list";
  count?: number;
}

function SkeletonBox({ width = "w-full", height = "h-5", rounded = false }: { width?: string; height?: string; rounded?: boolean }) {
  return (
    <div
      className={`bg-surface-secondary animate-pulse ${width} ${height} ${rounded ? "rounded-full" : "rounded-sm"}`}
    />
  );
}

function CardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl border border-border p-6 flex flex-col gap-3">
      <SkeletonBox width="w-[30%]" height="h-[18px]" rounded />
      <SkeletonBox width="w-[70%]" height="h-[22px]" />
      <SkeletonBox height="h-4" />
      <SkeletonBox width="w-[85%]" height="h-4" />
    </div>
  );
}

export default function LoadingSkeleton({ variant = "card", count = 3 }: LoadingSkeletonProps) {
  return (
    <div
      className="flex flex-col gap-4"
      role="status"
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
