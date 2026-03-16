import { useEffect, useRef } from "react";
import { useNavigation } from "react-router";

export function useUnsavedWarning(hasChanges: boolean) {
  const hasChangesRef = useRef(hasChanges);
  const navigation = useNavigation();

  useEffect(() => {
    hasChangesRef.current = hasChanges;
  }, [hasChanges]);

  useEffect(() => {
    if (navigation.state === "submitting" || (navigation.state === "loading" && navigation.location)) {
      hasChangesRef.current = false;
    }
  }, [navigation.state, navigation.location]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChangesRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);
}
