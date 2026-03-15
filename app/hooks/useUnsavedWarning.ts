import { useEffect, useRef } from "react";
import { useNavigation } from "react-router";

/**
 * Hook to warn users about unsaved changes before leaving the page.
 * Shows browser's native beforeunload dialog when user tries to navigate away
 * with unsaved changes.
 *
 * @param hasChanges - Whether there are unsaved changes
 */
export function useUnsavedWarning(hasChanges: boolean) {
  const hasChangesRef = useRef(hasChanges);
  const navigation = useNavigation();

  // Update ref when hasChanges prop changes
  useEffect(() => {
    hasChangesRef.current = hasChanges;
  }, [hasChanges]);

  // Clear warning flag when form submission succeeds (navigation away)
  useEffect(() => {
    if (navigation.state === "loading" && navigation.location) {
      // Form was submitted and we're navigating away
      hasChangesRef.current = false;
    }
  }, [navigation.state, navigation.location]);

  // Register beforeunload listener
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChangesRef.current) {
        e.preventDefault();
        // Modern browsers ignore custom message and show default message
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);
}
