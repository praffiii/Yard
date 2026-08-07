import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { motionTokens } from '../../lib/motion.js';

type RevealProps = Readonly<{
  children: ReactNode;
  className?: string;
  delay?: number;
}>;

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={className}
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : {
              delay,
              duration: motionTokens.duration.standard,
              ease: motionTokens.easing.standard,
            }
      }
    >
      {children}
    </motion.div>
  );
}
