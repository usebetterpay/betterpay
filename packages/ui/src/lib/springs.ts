/**
 * Motion tokens from Fluid Functionalism springs.
 * Enter = critically damped spring; `.exit` = quicker tween.
 *
 * @see https://www.fluidfunctionalism.com/r/springs.json
 */
export const spring = {
  fast: {
    type: 'spring' as const,
    duration: 0.08,
    bounce: 0,
    exit: { duration: 0.06 },
  },
  moderate: {
    type: 'spring' as const,
    duration: 0.16,
    bounce: 0,
    exit: { duration: 0.12 },
  },
  slow: {
    type: 'spring' as const,
    duration: 0.24,
    bounce: 0.12,
    exit: { duration: 0.16 },
  },
} as const;

export const exitFallbackMs = (tier: { exit: { duration: number } }) =>
  Math.round(tier.exit.duration * 1000) + 100;
