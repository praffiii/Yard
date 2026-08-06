export const motionTokens = {
  duration: {
    fast: 0.15,
    standard: 0.24,
  },
  easing: {
    standard: [0.22, 1, 0.36, 1] as const,
  },
  spring: {
    gentle: {
      type: 'spring' as const,
      stiffness: 320,
      damping: 30,
      mass: 0.8,
    },
  },
} as const;
