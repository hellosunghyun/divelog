import { formatFieldChange, computeTagDiff } from "~/lib/utils/record-diff.server";

interface RevisionDiffViewProps {
  changedFields: string[];
  beforeSnapshot: Record<string, unknown>;
  afterState: Record<string, unknown>;
  beforeTags?: Array<{ id: string; name: string }>;
  afterTags?: Array<{ id: string; name: string }>;
}

export function RevisionDiffView({
  changedFields,
  beforeSnapshot,
  afterState,
  beforeTags = [],
  afterTags = [],
}: RevisionDiffViewProps) {
  if (changedFields.length === 0) {
    return null;
  }

  const regularFields = changedFields.filter((field) => field !== "tags");
  const hasTagsChange = changedFields.includes("tags");

  return (
    <div className="mt-3 space-y-1.5">
      {regularFields.map((field) => {
        const { label, summary } = formatFieldChange(
          field,
          beforeSnapshot[field],
          afterState[field],
        );

        return (
          <p
            key={field}
            className="text-[13px] leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <span className="font-medium">{label}</span>: {summary}
          </p>
        );
      })}

      {hasTagsChange && (
        <TagDiffLine
          beforeTags={beforeTags}
          afterTags={afterTags}
        />
      )}
    </div>
  );
}

interface TagDiffLineProps {
  beforeTags: Array<{ id: string; name: string }>;
  afterTags: Array<{ id: string; name: string }>;
}

function TagDiffLine({ beforeTags, afterTags }: TagDiffLineProps) {
  const { added, removed } = computeTagDiff(beforeTags, afterTags);

  if (added.length === 0 && removed.length === 0) {
    return null;
  }

  const parts: string[] = [];
  if (added.length > 0) {
    parts.push(`+${added.join(", ")}`);
  }
  if (removed.length > 0) {
    parts.push(`-${removed.join(", ")}`);
  }

  return (
    <p
      className="text-[13px] leading-relaxed"
      style={{ color: "var(--color-text-secondary)" }}
    >
      <span className="font-medium">태그</span>: {parts.join(" ")}
    </p>
  );
}
