import { useState } from "react";
import type { TagWithUsage } from "~/db/queries/records/tags.server";

interface TagSelectorProps {
  tags: TagWithUsage[];
  selectedTagIds: string[];
  name?: string;
  onChange?: (selectedIds: string[]) => void;
  onCreateTag?: (name: string) => void;
  allowCreate?: boolean;
  maxTags?: number;
}

export function TagSelector({
  tags,
  selectedTagIds,
  name = "tagIds",
  onChange,
  onCreateTag,
  allowCreate = false,
  maxTags = 10,
}: TagSelectorProps) {
  const selectedSet = new Set(selectedTagIds);
  const [newTagInput, setNewTagInput] = useState("");
  const [createdTagNames, setCreatedTagNames] = useState<string[]>([]);

  const handleChange = (tagId: string, checked: boolean) => {
    const newSet = new Set(selectedSet);
    if (checked) {
      newSet.add(tagId);
    } else {
      newSet.delete(tagId);
    }
    onChange?.(Array.from(newSet));
  };

  const handleCreateTag = () => {
    const trimmed = newTagInput.trim();
    
    if (!trimmed) return;
    if (trimmed.length > 30) return;

    const existingTag = tags.find(
      (t) => t.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existingTag) {
      if (!selectedSet.has(existingTag.id)) {
        onChange?.([...Array.from(selectedSet), existingTag.id]);
      }
      setNewTagInput("");
      return;
    }

    if (
      createdTagNames.some(
        (n) => n.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setNewTagInput("");
      return;
    }

    const totalSelected = selectedSet.size + createdTagNames.length;
    if (totalSelected >= maxTags) return;

    setCreatedTagNames((prev) => [...prev, trimmed]);
    onCreateTag?.(trimmed);
    setNewTagInput("");
  };

  const handleRemoveCreatedTag = (index: number) => {
    setCreatedTagNames((prev) => prev.filter((_, idx) => idx !== index));
  };

  const totalSelected = selectedSet.size + createdTagNames.length;

  if (tags.length === 0 && !allowCreate) {
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
      
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <label key={tag.id} className="cursor-pointer">
              <input
                type="checkbox"
                name={name}
                value={tag.id}
                checked={selectedSet.has(tag.id)}
                onChange={(e) => handleChange(tag.id, e.target.checked)}
                disabled={!selectedSet.has(tag.id) && totalSelected >= maxTags}
                className="hidden"
              />
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border transition-colors ${
                  selectedSet.has(tag.id)
                    ? "border-ocean-blue bg-mist-blue text-ocean-blue"
                    : "border-border bg-surface text-text-secondary hover:border-ocean-blue"
                } ${
                  !selectedSet.has(tag.id) && totalSelected >= maxTags
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                {selectedSet.has(tag.id) && (
                  <span aria-hidden="true" className="text-ocean-blue">
                    ✓
                  </span>
                )}
                {tag.name}
              </span>
            </label>
          ))}
        </div>
      )}

      {createdTagNames.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {createdTagNames.map((tagName, i) => (
            <span
              key={`created-${tagName}-${i}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border border-ocean-blue/50 bg-mist-blue text-ocean-blue"
            >
              <span aria-hidden="true" className="text-xs">
                ✓
              </span>
              {tagName}
              <button
                type="button"
                onClick={() => handleRemoveCreatedTag(i)}
                className="ml-0.5 text-ocean-blue/70 hover:text-ocean-blue"
                aria-label={`${tagName} 태그 제거`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {createdTagNames.map((tagName, i) => (
        <input
          key={`hidden-${tagName}-${i}`}
          type="hidden"
          name="newTagName"
          value={tagName}
        />
      ))}

      {allowCreate && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreateTag();
              }
            }}
            placeholder="새 태그 이름"
            maxLength={30}
            disabled={totalSelected >= maxTags}
            className="h-9 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-ocean-blue focus:outline-none focus:ring-2 focus:ring-ocean-blue/20 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="새 태그 이름 입력"
          />
          <button
            type="button"
            onClick={handleCreateTag}
            disabled={
              !newTagInput.trim() ||
              newTagInput.trim().length > 30 ||
              totalSelected >= maxTags
            }
            className="h-9 rounded-lg border border-ocean-blue/30 bg-mist-blue px-3 text-sm font-medium text-ocean-blue transition-colors hover:bg-ocean-blue/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            추가
          </button>
        </div>
      )}

      {maxTags > 0 && totalSelected >= maxTags && (
        <p className="mt-2 text-xs text-text-tertiary">
          최대 {maxTags}개까지 선택할 수 있습니다
        </p>
      )}
    </fieldset>
  );
}
