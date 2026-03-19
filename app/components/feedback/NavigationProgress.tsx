import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigation } from "react-router";
import { motion, AnimatePresence } from "~/lib/motion/motion";

const SHOW_DELAY_MS = 300;
const COMPLETE_DELAY_MS = 350;
const TICK_INTERVAL_MS = 250;
const MAX_PROGRESS = 0.85;
const DECELERATION = 0.08;
const MIN_STEP = 0.003;

export function NavigationProgress() {
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const delayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasShown = useRef(false);

  const clearTimers = useCallback(() => {
    if (delayTimer.current) clearTimeout(delayTimer.current);
    if (tickTimer.current) clearInterval(tickTimer.current);
    if (completeTimer.current) clearTimeout(completeTimer.current);
  }, []);

  useEffect(() => {
    if (isNavigating) {
      clearTimers();

      delayTimer.current = setTimeout(() => {
        setVisible(true);
        wasShown.current = true;
        setProgress(0.15);

        tickTimer.current = setInterval(() => {
          setProgress((prev) => {
            if (prev >= MAX_PROGRESS) {
              if (tickTimer.current) clearInterval(tickTimer.current);
              return MAX_PROGRESS;
            }
            const step = (MAX_PROGRESS - prev) * DECELERATION;
            return prev + Math.max(step, MIN_STEP);
          });
        }, TICK_INTERVAL_MS);
      }, SHOW_DELAY_MS);
    } else {
      if (delayTimer.current) clearTimeout(delayTimer.current);
      if (tickTimer.current) clearInterval(tickTimer.current);

      if (wasShown.current) {
        setProgress(1);
        completeTimer.current = setTimeout(() => {
          setVisible(false);
          wasShown.current = false;
          setProgress(0);
        }, COMPLETE_DELAY_MS);
      }
    }

    return clearTimers;
  }, [isNavigating, clearTimers]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[60] h-0.5 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeOut" } }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="h-full w-full origin-left bg-gradient-to-r from-[#146C94] via-[#146C94] to-[#6CC4D6]"
            style={{
              boxShadow:
                "0 0 8px rgba(108, 196, 214, 0.3), 0 0 3px rgba(108, 196, 214, 0.15)",
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progress }}
            transition={{
              type: "spring",
              stiffness: 120,
              damping: 25,
              mass: 0.4,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
