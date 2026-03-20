import { useEffect, useRef } from "react";
import { useBlocker, useNavigation } from "react-router";

export function useUnsavedWarning(hasChanges: boolean) {
  const hasChangesRef = useRef(hasChanges);
  const submittedRef = useRef(false);
  const navigation = useNavigation();

  hasChangesRef.current = hasChanges;

  if (navigation.state === "submitting") {
    submittedRef.current = true;
  }

  // Browser-level navigation (tab close, refresh, URL bar)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChangesRef.current && !submittedRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Client-side React Router navigation (links, back button)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasChangesRef.current &&
      !submittedRef.current &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  return blocker;
}
