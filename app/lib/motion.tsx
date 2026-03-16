import { LazyMotion, domAnimation, m } from "framer-motion";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}

export { m as motion };
export { AnimatePresence } from "framer-motion";
