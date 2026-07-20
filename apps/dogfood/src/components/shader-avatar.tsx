'use client';

import { MeshGradient } from '@paper-design/shaders-react';
import { cn } from '@/lib/utils';
import { SHADER_COLORS_MIST } from '@/components/ShaderAccent';

type Size = 'xs' | 'sm' | 'md' | 'lg';

const SIZE: Record<Size, string> = {
  xs: 'size-4 md:size-5',
  sm: 'size-6',
  md: 'size-8',
  lg: 'size-10',
};

export interface ShaderAvatarProps {
  size?: Size;
  className?: string;
  /** Optional monogram over the mesh (e.g. D) */
  monogram?: string;
  /** Seed shifts mesh slightly so org vs user can differ quietly */
  seed?: number;
}

/**
 * Modern mist-teal mesh mark — replaces rainbow Vercel avatars.
 * Same calm palette as page ShaderAccent.
 */
export function ShaderAvatar({
  size = 'md',
  className,
  monogram,
  seed = 0,
}: ShaderAvatarProps) {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Slight palette shift by seed so workspace ≠ user, still monochrome teal
  const colors =
    seed % 2 === 0
      ? [...SHADER_COLORS_MIST]
      : (['#C5DCE8', '#B9D7E4', '#D2E8EF', '#E4EEF2'] as string[]);

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-border/60',
        SIZE[size],
        className,
      )}
      aria-hidden={!monogram}
      data-slot="shader-avatar"
    >
      <MeshGradient
        colors={colors}
        speed={reduced ? 0 : 0.08 + seed * 0.01}
        distortion={0.4}
        swirl={0.25}
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
      />
      {monogram ? (
        <span className="relative z-[1] flex size-full items-center justify-center font-semibold text-[0.62em] tracking-tight text-[color-mix(in_srgb,var(--primary)_72%,#0a1f26)] drop-shadow-[0_0_1px_rgba(255,255,255,0.35)]">
          {monogram}
        </span>
      ) : null}
    </span>
  );
}
