import type { Variants } from "framer-motion";

// Quiet Depth 기준: subtle, 시선 잡지 않음
// MOTION_INTENSITY: 3-4 (스킬 파일 6에서 하향)

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] },
  },
};

export const hoverScale = {
  whileHover: { scale: 1.02 },
  transition: { duration: 0.15, ease: [0.32, 0.72, 0, 1] },
};

export const tapScale = {
  whileTap: { scale: 0.98 },
};

// prefers-reduced-motion 감지
export function shouldReduceMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
