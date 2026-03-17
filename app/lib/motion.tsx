import { LazyMotion, MotionConfig, domAnimation, m } from "framer-motion";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}

export { m as motion };
export { AnimatePresence } from "framer-motion";
