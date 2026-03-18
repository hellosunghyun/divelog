import { useEffect, useRef } from "react";
import { useNavigation } from "react-router";

export function useUnsavedWarning(hasChanges: boolean) {
  const hasChangesRef = useRef(hasChanges);
  const submittedRef = useRef(false);
  const navigation = useNavigation();

  hasChangesRef.current = hasChanges;

  if (navigation.state === "submitting") {
    submittedRef.current = true;
  }

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
}
