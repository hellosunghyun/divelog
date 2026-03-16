import { useEffect, useRef } from "react";
import { useNavigation } from "react-router";

export function useUnsavedWarning(hasChanges: boolean) {
  const hasChangesRef = useRef(hasChanges);
  const dismissedRef = useRef(false);
  const navigation = useNavigation();

  hasChangesRef.current = hasChanges;

  if (navigation.state === "submitting" || navigation.state === "loading") {
    dismissedRef.current = true;
  }

  if (navigation.state === "idle" && dismissedRef.current) {
    dismissedRef.current = false;
  }

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChangesRef.current && !dismissedRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);
}
