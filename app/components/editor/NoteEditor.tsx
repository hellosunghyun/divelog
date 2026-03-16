import { useRef, useState, useCallback, type TextareaHTMLAttributes } from "react";

interface NoteEditorProps {
  name: string;
  defaultValue?: string;
  maxLength?: number;
  error?: string;
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  htmlProps?: Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "name" | "defaultValue" | "maxLength" | "onChange" | "disabled" | "readOnly" | "placeholder"
  >;
}

const DEFAULT_MAX_LENGTH = 50000;
const MIN_HEIGHT_REM = 6;
const MAX_HEIGHT_VH = 60;

export function NoteEditor({
  name,
  defaultValue = "",
  maxLength = DEFAULT_MAX_LENGTH,
  error,
  onChange,
  className = "",
  disabled = false,
  readOnly = false,
  placeholder = "짧은 생각, 메모, 기록을 남겨보세요...",
  htmlProps,
}: NoteEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [isFocused, setIsFocused] = useState(false);

  const charCount = value.length;
  const charRatio = charCount / maxLength;
  const isNearLimit = charRatio >= 0.8;
  const isAtLimit = charCount >= maxLength;

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const scrollHeight = textarea.scrollHeight;
    const minHeight = MIN_HEIGHT_REM * 16;
    const maxHeight = (MAX_HEIGHT_VH / 100) * window.innerHeight;
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, []);

  const adjustHeightAfterUpdate = () => {
    requestAnimationFrame(adjustHeight);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length > maxLength) return;
    setValue(newValue);
    onChange?.(newValue);
    adjustHeightAfterUpdate();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea || disabled || readOnly) return;

    const isModKey = e.metaKey || e.ctrlKey;

    if (isModKey && e.key === "b") {
      e.preventDefault();
      wrapSelection("**", "**");
      return;
    }

    if (isModKey && e.key === "i") {
      e.preventDefault();
      wrapSelection("*", "*");
      return;
    }

    if (isModKey && e.key === "k") {
      e.preventDefault();
      insertLink();
      return;
    }

    if (isModKey && e.key === "Enter") {
      e.preventDefault();
      const form = textarea.closest("form");
      const submitBtn = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
      submitBtn?.click();
      return;
    }
  };

  const wrapSelection = (prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newValue =
      value.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      value.substring(end);

    if (newValue.length > maxLength) return;

    setValue(newValue);
    onChange?.(newValue);
    adjustHeightAfterUpdate();

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    });
  };

  const insertLink = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || "링크 텍스트";
    const linkMarkdown = `[${selectedText}](url)`;
    const newValue =
      value.substring(0, start) + linkMarkdown + value.substring(end);

    if (newValue.length > maxLength) return;

    setValue(newValue);
    onChange?.(newValue);
    adjustHeightAfterUpdate();

    requestAnimationFrame(() => {
      textarea.focus();
      const urlStart = start + selectedText.length + 3;
      const urlEnd = urlStart + 3;
      textarea.setSelectionRange(urlStart, urlEnd);
    });
  };

  const getCharCountColor = () => {
    if (isAtLimit) return "var(--color-error)";
    if (isNearLimit) return "var(--color-warning)";
    return "var(--color-text-tertiary)";
  };

  const editorId = `note-editor-${name}`;
  const errorId = `${editorId}-error`;
  const charCountId = `${editorId}-char-count`;

  return (
    <div className={`note-editor-container ${className}`}>
      <div
        className="relative"
        style={{
          borderRadius: "var(--radius-sm)",
          border: `1px solid ${error ? "var(--color-error)" : isFocused ? "var(--color-ocean-blue)" : "var(--color-border)"}`,
          backgroundColor: disabled ? "var(--color-surface-secondary)" : "var(--color-surface)",
          transition: "border-color var(--duration-fast) var(--ease-default)",
        }}
      >
        <textarea
          {...htmlProps}
          ref={textareaRef}
          id={editorId}
          name={name}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          readOnly={readOnly}
          placeholder={placeholder}
          data-testid="note-editor"
          aria-label="메모 작성"
          aria-describedby={error ? errorId : charCountId}
          aria-invalid={!!error}
          aria-errormessage={error ? errorId : undefined}
          style={{
            width: "100%",
            minHeight: `${MIN_HEIGHT_REM}rem`,
            maxHeight: `${MAX_HEIGHT_VH}vh`,
            padding: "var(--space-4)",
            fontSize: "var(--font-size-base)",
            lineHeight: "var(--line-height-relaxed)",
            fontFamily: "var(--font-sans)",
            color: "var(--color-text-primary)",
            backgroundColor: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            overflowY: "auto",
          }}
        />

        <div
          id={charCountId}
          aria-live="polite"
          style={{
            position: "absolute",
            bottom: "var(--space-2)",
            right: "var(--space-3)",
            fontSize: "var(--font-size-caption)",
            fontWeight: "var(--font-weight-medium)",
            color: getCharCountColor(),
            transition: "color var(--duration-fast) var(--ease-default)",
            pointerEvents: "none",
          }}
        >
          {charCount.toLocaleString()} / {maxLength.toLocaleString()}
        </div>
      </div>

      {error && (
        <p
          id={errorId}
          role="alert"
          style={{
            marginTop: "var(--space-2)",
            fontSize: "var(--font-size-meta)",
            fontWeight: "var(--font-weight-medium)",
            color: "var(--color-error)",
          }}
        >
          {error}
        </p>
      )}

      {isFocused && !disabled && !readOnly && (
        <div
          style={{
            marginTop: "var(--space-2)",
            fontSize: "var(--font-size-caption)",
            color: "var(--color-text-tertiary)",
            display: "flex",
            gap: "var(--space-4)",
          }}
        >
          <span>
            <kbd
              style={{
                padding: "1px 4px",
                backgroundColor: "var(--color-surface-secondary)",
                borderRadius: "4px",
                fontSize: "11px",
              }}
            >
              ⌘B
            </kbd>{" "}
            굵게
          </span>
          <span>
            <kbd
              style={{
                padding: "1px 4px",
                backgroundColor: "var(--color-surface-secondary)",
                borderRadius: "4px",
                fontSize: "11px",
              }}
            >
              ⌘I
            </kbd>{" "}
            기울임
          </span>
          <span>
            <kbd
              style={{
                padding: "1px 4px",
                backgroundColor: "var(--color-surface-secondary)",
                borderRadius: "4px",
                fontSize: "11px",
              }}
            >
              ⌘K
            </kbd>{" "}
            링크
          </span>
          <span>
            <kbd
              style={{
                padding: "1px 4px",
                backgroundColor: "var(--color-surface-secondary)",
                borderRadius: "4px",
                fontSize: "11px",
              }}
            >
              ⌘↵
            </kbd>{" "}
            저장
          </span>
        </div>
      )}
    </div>
  );
}

export default NoteEditor;
