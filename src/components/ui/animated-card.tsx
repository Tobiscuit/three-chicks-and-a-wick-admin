'use client';

import React from 'react';

type AnimatedCardProps = {
  children: React.ReactNode;
  index: number;
  className?: string;
};

/**
 * Wrapper component that applies staggered fade-in animations.
 * 
 * Uses Tailwind Motion utilities for smooth entrance animations.
 * Automatically calculates delay based on index for staggered effects.
 * 
 * @param index - Position in the sequence (0-based)
 * @param className - Additional CSS classes to apply
 * 
 * @example
 * ```tsx
 * {items.map((item, i) => (
 *   <AnimatedCard key={item.id} index={i}>
 *     <Card>{item.content}</Card>
 *   </AnimatedCard>
 * ))}
 * ```
 */
export function AnimatedCard({ children, index, className = '' }: AnimatedCardProps) {
  // 75ms stagger, max 400ms total delay
  const delay = Math.min(index * 75, 400);

  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={`
        motion-safe:motion-preset-fade-lg
        motion-safe:motion-translate-y-in-[10px]
        ${className}
      `}
    >
      {children}
    </div>
  );
}
