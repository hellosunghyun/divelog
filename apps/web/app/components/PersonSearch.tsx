import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils/cn";

interface PersonSearchProps {
  selectedPeople: { userId: string; displayName: string; profilePhotoUrl: string | null }[];
  label: string;
  name: string;
  excludeUserId?: string;
  roleOptions?: { value: string; label: string }[];
}

interface SearchResult {
  id: string;
  slug: string;
  displayName: string;
  profilePhotoUrl: string | null;
}

interface SearchResponse {
  results: SearchResult[];
}

interface SelectedPersonEntry {
  userId: string;
  displayName: string;
  profilePhotoUrl: string | null;
  role?: string;
}

const MIN_QUERY_LENGTH = 0;
const DEBOUNCE_MS = 300;

function isSearchResult(value: unknown): value is SearchResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.slug === "string" &&
    typeof candidate.displayName === "string" &&
    (typeof candidate.profilePhotoUrl === "string" || candidate.profilePhotoUrl === null)
  );
}

function isSearchResponse(value: unknown): value is SearchResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return Array.isArray(candidate.results) && candidate.results.every(isSearchResult);
}

function getInitialRole(roleOptions?: { value: string; label: string }[]) {
  return roleOptions?.[0]?.value ?? "";
}

function createSelectedEntries(
  people: PersonSearchProps["selectedPeople"],
  roleOptions?: PersonSearchProps["roleOptions"]
): SelectedPersonEntry[] {
  const defaultRole = getInitialRole(roleOptions);

  return people.map((person) => ({
    ...person,
    ...(roleOptions?.length ? { role: defaultRole } : {}),
  }));
}

function getInitial(displayName: string) {
  return displayName.trim().charAt(0).toUpperCase() || "?";
}

export default function PersonSearch({
  selectedPeople,
  label,
  name,
  excludeUserId,
  roleOptions,
}: PersonSearchProps) {
  const inputId = useId();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<SelectedPersonEntry[]>(() =>
    createSelectedEntries(selectedPeople, roleOptions)
  );
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const defaultRole = useMemo(() => getInitialRole(roleOptions), [roleOptions]);

  const selectedIds = useMemo(() => new Set(selectedEntries.map((person) => person.userId)), [selectedEntries]);

  const serializedValue = useMemo(() => {
    if (roleOptions?.length) {
      return JSON.stringify(
        selectedEntries.map((person) => ({
          userId: person.userId,
          role: person.role ?? defaultRole,
        }))
      );
    }

    return JSON.stringify(selectedEntries.map((person) => person.userId));
  }, [defaultRole, roleOptions, selectedEntries]);

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

    async function searchPeople() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const searchResponse = await fetch(`/api/search-learners?q=${encodeURIComponent(debouncedQuery)}`, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        if (!searchResponse.ok) {
          throw new Error(`Search failed with status ${searchResponse.status}`);
        }

        const responseJson: unknown = await searchResponse.json();
        const response = isSearchResponse(responseJson) ? responseJson : { results: [] };
        const nextResults = response.results.filter(
          (person) => !selectedIds.has(person.id) && person.id !== excludeUserId
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
        setErrorMessage("사람을 불러오지 못했습니다");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void searchPeople();

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, excludeUserId, selectedIds]);

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

  function handleSelectPerson(person: SearchResult) {
    setSelectedEntries((current) => [
      ...current,
      {
        userId: person.id,
        displayName: person.displayName,
        profilePhotoUrl: person.profilePhotoUrl,
        ...(roleOptions?.length ? { role: defaultRole } : {}),
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

  function handleRemovePerson(userId: string) {
    setSelectedEntries((current) => current.filter((person) => person.userId !== userId));
  }

  function handleRoleChange(userId: string, role: string) {
    setSelectedEntries((current) =>
      current.map((person) => (person.userId === userId ? { ...person, role } : person))
    );
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
      const person = results[activeIndex] ?? results[0];

      if (!person) {
        return;
      }

      event.preventDefault();
      handleSelectPerson(person);
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
            if (results.length > 0 || isLoading || errorMessage) {
              setIsOpen(true);
            } else {
              setDebouncedQuery(query.trim());
            }
          }}
          placeholder="이름으로 사람을 찾아보세요"
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
              {isLoading && <div className="px-4 py-3 text-sm text-text-secondary">사람을 찾는 중입니다</div>}

              {!isLoading && errorMessage && <div className="px-4 py-3 text-sm text-text-secondary">{errorMessage}</div>}

              {!isLoading && !errorMessage && results.length === 0 && (
                <div className="px-4 py-3 text-sm text-text-secondary">검색 결과가 없습니다</div>
              )}

              {!isLoading &&
                !errorMessage &&
                results.map((person, index) => (
                  <div key={person.id}>
                    <button
                      id={`${listboxId}-${index}`}
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => handleSelectPerson(person)}
                      className={cn(
                        "flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                        index === activeIndex ? "bg-mist-blue" : "hover:bg-mist-blue"
                      )}
                    >
                      {person.profilePhotoUrl ? (
                        <img
                          src={person.profilePhotoUrl}
                          alt=""
                          aria-hidden="true"
                          className="h-10 w-10 rounded-full object-cover ring-1 ring-border"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mist-blue text-sm font-medium text-ocean-blue ring-1 ring-ocean-blue/10">
                          {getInitial(person.displayName)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">{person.displayName}</p>
                        <p className="truncate text-xs text-text-tertiary">@{person.slug}</p>
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
          {selectedEntries.map((person) => (
            <div
              key={person.userId}
              className="flex min-h-11 items-center gap-2 rounded-2xl border border-ocean-blue bg-mist-blue px-3 py-1.5 text-sm text-ocean-blue"
            >
              {person.profilePhotoUrl ? (
                <img
                  src={person.profilePhotoUrl}
                  alt=""
                  aria-hidden="true"
                  className="h-8 w-8 rounded-full object-cover ring-1 ring-ocean-blue/15"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-xs font-semibold text-ocean-blue">
                  {getInitial(person.displayName)}
                </div>
              )}

              <span className="max-w-[11rem] truncate font-medium">{person.displayName}</span>

              {roleOptions?.length ? (
                <select
                  value={person.role ?? defaultRole}
                  onChange={(event) => handleRoleChange(person.userId, event.target.value)}
                  className="h-11 rounded-full border border-ocean-blue/20 bg-white/85 px-3 text-sm text-ocean-blue outline-none transition-colors focus:border-ocean-blue focus:ring-2 focus:ring-ocean-blue/15"
                  aria-label={`${person.displayName} 역할 선택`}
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : null}

              <button
                type="button"
                onClick={() => handleRemovePerson(person.userId)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-ocean-blue/80 transition-colors hover:bg-white/85 hover:text-ocean-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue/20"
                aria-label={`${person.displayName} 제거`}
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
