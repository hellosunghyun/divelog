import type { AutosaveStatus } from "~/hooks/useAutosave";

interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
  className?: string;
}

export function AutosaveIndicator({
  status,
  lastSavedAt,
  className = "",
}: AutosaveIndicatorProps) {
  if (status === "idle") {
    return null;
  }

  const baseClasses = "text-xs text-gray-600 font-medium";
  const combinedClasses = `${baseClasses} ${className}`;

  if (status === "saving") {
    return (
      <div className={combinedClasses} data-testid="autosave-indicator">
        저장 중...
      </div>
    );
  }

  if (status === "saved" && lastSavedAt) {
    const timeString = lastSavedAt.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div className={combinedClasses} data-testid="autosave-indicator">
        자동 저장됨 {timeString}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={`${combinedClasses} text-red-600`} data-testid="autosave-indicator">
        저장 실패
      </div>
    );
  }

  return null;
}
