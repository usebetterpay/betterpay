'use client';

import { useEffect, useState } from 'react';

/**
 * Touch-primary devices (coarse pointer + touch). Hydration-stable default: false.
 * @see https://www.fluidfunctionalism.com/r/use-touch-primary.json (Lina)
 */
export function useTouchPrimary() {
  const [isTouchPrimary, setIsTouchPrimary] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const controller = new AbortController();
    const { signal } = controller;

    const handleTouch = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const prefersTouch = window.matchMedia('(pointer: coarse)').matches;
      setIsTouchPrimary(hasTouch && prefersTouch);
    };

    const mq = window.matchMedia('(pointer: coarse)');
    mq.addEventListener('change', handleTouch, { signal });
    window.addEventListener('pointerdown', handleTouch, { signal });
    handleTouch();

    return () => controller.abort();
  }, []);

  return isTouchPrimary;
}
