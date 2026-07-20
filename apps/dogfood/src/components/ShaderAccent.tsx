import { MeshGradient } from '@paper-design/shaders-react';
import type { CSSProperties } from 'react';

/**
 * Calm mist palette — brand teal adjacent, low chroma.
 * Not candy pink/peach; sits quietly on light SaaS surfaces.
 */
export const SHADER_COLORS_MIST = ['#D2E8EF', '#B9D7E4', '#C5DCE8', '#E4EEF2'] as const;

/** Slightly cooler variant for alternate focal spots */
export const SHADER_COLORS_COOL = ['#C8E4E0', '#B9D7E4', '#C5D4E8', '#DCE8F0'] as const;

/** @deprecated alias — same as mist */
export const SHADER_COLORS_WARM = SHADER_COLORS_MIST;

type Variant = 'header' | 'card' | 'strip';

const VARIANT: Record<
  Variant,
  { className: string; style?: CSSProperties; speed: number; distortion: number; swirl: number }
> = {
  header: {
    className: 'bp-mesh-host bp-mesh-fade',
    speed: 0.1,
    distortion: 0.45,
    swirl: 0.28,
  },
  card: {
    className: 'bp-mesh-host bp-mesh-fade-soft',
    speed: 0.07,
    distortion: 0.35,
    swirl: 0.2,
  },
  strip: {
    className: 'bp-mesh-strip',
    style: { height: 3 },
    speed: 0.14,
    distortion: 0.5,
    swirl: 0.3,
  },
};

export interface ShaderAccentProps {
  variant?: Variant;
  colors?: readonly string[];
  className?: string;
}

/**
 * Real @paper-design/shaders MeshGradient — soft visual moment only.
 * Parent must be position:relative; overflow:hidden.
 */
export function ShaderAccent({
  variant = 'header',
  colors = SHADER_COLORS_MIST,
  className,
}: ShaderAccentProps) {
  const v = VARIANT[variant];
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <div
      className={[v.className, className].filter(Boolean).join(' ')}
      style={v.style}
      aria-hidden
      data-slot="shader-accent"
    >
      <MeshGradient
        colors={[...colors]}
        speed={reduced ? 0 : v.speed}
        distortion={v.distortion}
        swirl={v.swirl}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
