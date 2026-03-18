import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils/cn";

interface RecordSearchProps {
  selectedRecords: { recordId: string; title: string; authorDisplayName: string | null }[];
  label: string;
  name: string;
  excludeRecordId?: string;
}

interface SearchResult {
  id: string;
  slug: string;
  title: string;
  format: "note" | "article";
  authorDisplayName: string | null;
}

interface SearchResponse {
  results: SearchResult[];
}

interface SelectedRecordEntry {
  recordId: string;
  title: string;
  authorDisplayName: string | null;
}

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

function isSearchResult(value: unknown): value is SearchResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.slug === "string" &&
    typeof candidate.title === "string" &&
    (candidate.format === "note" || candidate.format === "article") &&
    (typeof candidate.authorDisplayName === "string" || candidate.authorDisplayName === null)
  );
}

function isSearchResponse(value: unknown): value is SearchResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return Array.isArray(candidate.results) && candidate.results.every(isSearchResult);
}

function getFormatIcon(format: "note" | "article"): string {
  return format === "note" ? "📝" : "📄";
}

export default function RecordSearch({
  selectedRecords,
  label,
  name,
  excludeRecordId,
}: RecordSearchProps) {
  const inputId = useId();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<SelectedRecordEntry[]>(selectedRecords);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedIds = useMemo(
    () => new Set(selectedEntries.map((record) => record.recordId)),
    [selectedEntries]
  );

  const serializedValue = useMemo(
    () => JSON.stringify(selectedEntries.map((record) => record.recordId)),
    [selectedEntries]
  );

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      setDebouncedQuery("");
      setResults([]);
      setActiveIndex(-1);
      setIsOpen(false);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      setDebouncedQuery(trimmedQuery);
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      return;
    }

    const controller = new AbortController();

    async function searchRecords() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const searchResponse = await fetch(
          `/api/search-records?q=${encodeURIComponent(debouncedQuery)}&includeOwn=true`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!searchResponse.ok) {
          throw new Error(`Search failed with status ${searchResponse.status}`);
        }

        const responseJson: unknown = await searchResponse.json();
        const response = isSearchResponse(responseJson) ? responseJson : { results: [] };
        const nextResults = response.results.filter(
          (record) => !selectedIds.has(record.id) && record.id !== excludeRecordId
        );

        setResults(nextResults);
        setActiveIndex(nextResults.length > 0 ? 0 : -1);
        setIsOpen(true);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setResults([]);
        setActiveIndex(-1);
        setIsOpen(true);
        setErrorMessage("게시글을 불러오지 못했습니다");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void searchRecords();

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, excludeRecordId, selectedIds]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  function handleSelectRecord(record: SearchResult) {
    setSelectedEntries((current) => [
      ...current,
      {
        recordId: record.id,
        title: record.title,
        authorDisplayName: record.authorDisplayName,
      },
    ]);
    setQuery("");
    setDebouncedQuery("");
    setResults([]);
    setActiveIndex(-1);
    setIsOpen(false);
    setErrorMessage(null);
    inputRef.current?.focus();
  }

  function handleRemoveRecord(recordId: string) {
    setSelectedEntries((current) => current.filter((record) => record.recordId !== recordId));
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen && event.key === "ArrowDown" && results.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(0);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (results.length === 0) {
        return;
      }

      setIsOpen(true);
      setActiveIndex((current) => (current >= results.length - 1 ? 0 : current + 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (results.length === 0) {
        return;
      }

      setIsOpen(true);
      setActiveIndex((current) => (current <= 0 ? results.length - 1 : current - 1));
      return;
    }

    if (event.key === "Enter" && isOpen) {
      const record = results[activeIndex] ?? results[0];

      if (!record) {
        return;
      }

      event.preventDefault();
      handleSelectRecord(record);
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  const showDropdown = isOpen && query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <div className="space-y-3" ref={containerRef}>
      <Label htmlFor={inputId} className="block text-meta font-medium text-text-secondary">
        {label}
      </Label>

      <input type="hidden" name={name} value={serializedValue} />

      <div className="relative">
        <MagnifyingGlass
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-tertiary"
        />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleInputKeyDown}
          onFocus={() => {
            if (query.trim().length >= MIN_QUERY_LENGTH && (results.length > 0 || isLoading || errorMessage)) {
              setIsOpen(true);
            }
          }}
          placeholder="제목으로 게시글을 찾아보세요"
          autoComplete="off"
          className="h-12 w-full rounded-[calc(var(--radius)-0.125rem)] border border-border bg-surface pl-12 pr-4 text-base leading-relaxed text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-text-tertiary focus:border-ocean-blue focus:ring-2 focus:ring-ocean-blue/20"
          aria-autocomplete="list"
          aria-controls={showDropdown ? listboxId : undefined}
          aria-expanded={showDropdown}
          aria-activedescendant={showDropdown && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        />

        {showDropdown && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-[calc(var(--radius)+0.125rem)] border border-border bg-surface shadow-[0_18px_40px_rgba(11,36,71,0.08)]">
            <div id={listboxId} role="listbox" className="max-h-72 overflow-y-auto py-2">
              {isLoading && <div className="px-4 py-3 text-sm text-text-secondary">게시글을 찾는 중입니다</div>}

              {!isLoading && errorMessage && <div className="px-4 py-3 text-sm text-text-secondary">{errorMessage}</div>}

              {!isLoading && !errorMessage && results.length === 0 && (
                <div className="px-4 py-3 text-sm text-text-secondary">검색 결과가 없습니다</div>
              )}

              {!isLoading &&
                !errorMessage &&
                results.map((record, index) => (
                  <div key={record.id}>
                    <button
                      id={`${listboxId}-${index}`}
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => handleSelectRecord(record)}
                      className={cn(
                        "flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                        index === activeIndex ? "bg-mist-blue" : "hover:bg-mist-blue"
                      )}
                    >
                      <span className="text-lg">{getFormatIcon(record.format)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">{record.title}</p>
                        {record.authorDisplayName && (
                          <p className="truncate text-xs text-text-tertiary">{record.authorDisplayName}</p>
                        )}
                      </div>
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {selectedEntries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedEntries.map((record) => (
            <div
              key={record.recordId}
              className="flex min-h-11 items-center gap-2 rounded-2xl border border-ocean-blue bg-mist-blue px-3 py-1.5 text-sm text-ocean-blue"
            >
              <span className="max-w-[14rem] truncate font-medium">{record.title}</span>
              {record.authorDisplayName && (
                <span className="text-xs text-ocean-blue/70">· {record.authorDisplayName}</span>
              )}
              <button
                type="button"
                onClick={() => handleRemoveRecord(record.recordId)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-ocean-blue/80 transition-colors hover:bg-white/85 hover:text-ocean-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue/20"
                aria-label={`${record.title} 제거`}
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
