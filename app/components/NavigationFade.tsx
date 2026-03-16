import { useNavigation } from "react-router";
import { useEffect, useRef, useState } from "react";

export function NavigationFade({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation();
  const [isSlowNav, setIsSlowNav] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (navigation.state === "loading") {
      timerRef.current = setTimeout(() => setIsSlowNav(true), 150);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsSlowNav(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [navigation.state]);

  return (
    <div
      className={
        isSlowNav
          ? "motion-safe:opacity-60 motion-safe:transition-opacity motion-safe:duration-150"
          : ""
      }
    >
      {children}
    </div>
  );
}
