'use client';

import { useState, useEffect } from 'react';

/**
 * Hook for animating a number counter with smooth easing.
 * 
 * @param end - The target number to animate to
 * @param duration - Animation duration in milliseconds (default: 1000)
 * @returns The current animated count value
 * 
 * @example
 * ```tsx
 * const total = useAnimatedCounter(1234, 800);
 * return <span>${(total / 100).toFixed(2)}</span>;
 * ```
 */
export function useAnimatedCounter(end: number, duration: number = 1000): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Easing function: easeOutQuart for smooth deceleration
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
}
