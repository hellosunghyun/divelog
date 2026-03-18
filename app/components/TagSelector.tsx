import type { TagWithUsage } from "~/db/queries/records/tags.server";

interface TagSelectorProps {
  tags: TagWithUsage[];
  selectedTagIds: string[];
  name?: string;
  onChange?: (selectedIds: string[]) => void;
}

export function TagSelector({
  tags,
  selectedTagIds,
  name = "tagIds",
  onChange,
}: TagSelectorProps) {
  const selectedSet = new Set(selectedTagIds);

  const handleChange = (tagId: string, checked: boolean) => {
    const newSet = new Set(selectedSet);
    if (checked) {
      newSet.add(tagId);
    } else {
      newSet.delete(tagId);
    }
    onChange?.(Array.from(newSet));
  };

  if (tags.length === 0) {
    return (
      <fieldset className="border-0 m-0 p-0">
        <legend className="block text-meta font-medium text-text-secondary mb-3">
          태그 (선택)
        </legend>
        <p className="text-text-secondary text-sm">등록된 태그가 없습니다</p>
      </fieldset>
    );
  }

  return (
    <fieldset className="border-0 m-0 p-0">
      <legend className="block text-meta font-medium text-text-secondary mb-3">
        태그 (선택)
      </legend>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <label key={tag.id} className="cursor-pointer">
            <input
              type="checkbox"
              name={name}
              value={tag.id}
              checked={selectedSet.has(tag.id)}
              onChange={(e) => handleChange(tag.id, e.target.checked)}
              className="hidden"
            />
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm border transition-colors ${
                selectedSet.has(tag.id)
                  ? "border-ocean-blue bg-mist-blue text-ocean-blue"
                  : "border-border bg-surface text-text-secondary hover:border-ocean-blue"
              }`}
            >
              {tag.name}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
