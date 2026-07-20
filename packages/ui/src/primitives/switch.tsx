'use client';

/**
 * Animated switch — spring thumb + press/hover stretch (Fluid Functionalism).
 * Keeps Base UI switch semantics + BetterPay API (checked / onCheckedChange / size).
 *
 * Pointer interaction is owned by the outer shell (press / drag). Base UI stays
 * for a11y roles, keyboard, and form semantics — not for pointer toggles.
 *
 * @see https://www.fluidfunctionalism.com/r/base/switch.json
 */

import * as React from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { animate, motion, useMotionValue, type Transition } from 'framer-motion';
import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from '../lib/cn';
import { spring } from '../lib/springs';

type Size = 'sm' | 'default';

const GEOMETRY: Record<
  Size,
  {
    trackW: number;
    trackH: number;
    thumb: number;
    offset: number;
    pillExtend: number;
    pressExtend: number;
    pressShrink: number;
  }
> = {
  default: {
    trackW: 34,
    trackH: 20,
    thumb: 16,
    offset: 2,
    pillExtend: 2,
    pressExtend: 4,
    pressShrink: 4,
  },
  sm: {
    trackW: 28,
    trackH: 16,
    thumb: 12,
    offset: 2,
    pillExtend: 1.5,
    pressExtend: 3,
    pressShrink: 3,
  },
};

const DRAG_DEAD_ZONE = 2;

export type SwitchProps = Omit<SwitchPrimitive.Root.Props, 'render' | 'children' | 'className'> & {
  size?: Size;
  className?: string;
  /** Optional visible label (Fluid Functionalism layout). */
  label?: string;
  thumbTransition?: Transition;
};

function Switch({
  className,
  size = 'default',
  label,
  checked: checkedProp,
  defaultChecked,
  onCheckedChange,
  disabled = false,
  thumbTransition,
  id: idProp,
  ...rootProps
}: SwitchProps) {
  const labelId = useId();
  const geo = GEOMETRY[size];
  const travel = geo.trackW - geo.thumb - geo.offset * 2;

  const isControlled = checkedProp !== undefined;
  const [uncontrolled, setUncontrolled] = useState(Boolean(defaultChecked));
  const checked = isControlled ? Boolean(checkedProp) : uncontrolled;

  const setChecked = useCallback(
    (next: boolean, eventDetails?: Parameters<NonNullable<SwitchPrimitive.Root.Props['onCheckedChange']>>[1]) => {
      if (!isControlled) setUncontrolled(next);
      if (onCheckedChange && eventDetails) {
        onCheckedChange(next, eventDetails);
      } else if (onCheckedChange) {
        (onCheckedChange as (checked: boolean) => void)(next);
      }
    },
    [isControlled, onCheckedChange],
  );

  const hasMounted = useRef(false);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const dragging = useRef(false);
  const pointerStart = useRef<{ clientX: number; originX: number } | null>(null);

  const restX = checked ? geo.offset + travel : geo.offset;
  const motionX = useMotionValue(restX);

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  const thumbWidth = pressed
    ? geo.thumb + geo.pressExtend
    : hovered
      ? geo.thumb + geo.pillExtend
      : geo.thumb;
  const thumbHeight = pressed ? geo.thumb - geo.pressShrink : geo.thumb;
  const thumbY = pressed ? geo.offset + geo.pressShrink / 2 : geo.offset;
  const extraWidth = thumbWidth - geo.thumb;
  const thumbX = checked ? geo.offset + travel - extraWidth : geo.offset;

  useEffect(() => {
    if (dragging.current) return;
    if (!hasMounted.current) {
      motionX.set(thumbX);
    } else {
      animate(motionX, thumbX, thumbTransition ?? spring.moderate);
    }
  }, [thumbX, motionX, thumbTransition]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      setPressed(true);
      dragging.current = false;
      pointerStart.current = { clientX: e.clientX, originX: motionX.get() };
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [disabled, motionX],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointerStart.current) return;
      const delta = e.clientX - pointerStart.current.clientX;

      if (!dragging.current) {
        if (Math.abs(delta) < DRAG_DEAD_ZONE) return;
        dragging.current = true;
      }

      const dragMin = geo.offset;
      const pressedThumbWidth = geo.thumb + geo.pressExtend;
      const dragMax = geo.trackW - geo.offset - pressedThumbWidth;
      const rawX = pointerStart.current.originX + delta;
      motionX.set(Math.max(dragMin, Math.min(dragMax, rawX)));
    },
    [geo, motionX],
  );

  const handlePointerUp = useCallback(() => {
    if (!pointerStart.current) return;
    setPressed(false);

    if (dragging.current) {
      dragging.current = false;
      const currentX = motionX.get();
      const dragMin = geo.offset;
      const pressedThumbWidth = geo.thumb + geo.pressExtend;
      const dragMax = geo.trackW - geo.offset - pressedThumbWidth;
      const midpoint = (dragMin + dragMax) / 2;
      const shouldBeOn = currentX > midpoint;

      if (shouldBeOn !== checked) {
        setChecked(shouldBeOn);
      } else {
        animate(motionX, restX, thumbTransition ?? spring.moderate);
      }
    } else {
      setChecked(!checked);
    }

    pointerStart.current = null;
  }, [checked, geo, motionX, restX, setChecked, thumbTransition]);

  const handlePointerCancel = useCallback(() => {
    if (!pointerStart.current) return;
    setPressed(false);
    if (dragging.current) {
      dragging.current = false;
      animate(motionX, restX, thumbTransition ?? spring.moderate);
    }
    pointerStart.current = null;
  }, [motionX, restX, thumbTransition]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setChecked(!checked);
      }
    },
    [checked, disabled, setChecked],
  );

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const transition = reducedMotion
    ? { duration: 0 }
    : hasMounted.current
      ? (thumbTransition ?? spring.moderate)
      : { duration: 0 };

  const ariaLabel =
    typeof rootProps['aria-label'] === 'string' ? rootProps['aria-label'] : undefined;

  const track = (
    <SwitchPrimitive.Root
      {...rootProps}
      id={idProp}
      checked={checked}
      disabled={disabled}
      aria-labelledby={label ? labelId : rootProps['aria-labelledby']}
      // State changes only via shell pointer / keyboard — ignore Base UI pointer path.
      onCheckedChange={() => {}}
      data-slot="switch"
      data-size={size}
      tabIndex={-1}
      className={cn(
        'bp-switch pointer-events-none relative shrink-0 rounded-full outline-none select-none',
        'transition-colors duration-100',
        'data-disabled:opacity-50',
      )}
      style={{
        width: geo.trackW,
        height: geo.trackH,
        backgroundColor: checked
          ? hovered
            ? 'var(--primary-hover)'
            : 'var(--primary)'
          : hovered
            ? 'var(--surface-hover)'
            : 'var(--input)',
      }}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        render={(props) => {
          const {
            style: baseStyle,
            onDrag: _onDrag,
            onDragStart: _onDragStart,
            onDragEnd: _onDragEnd,
            onAnimationStart: _onAnimationStart,
            onAnimationEnd: _onAnimationEnd,
            onAnimationIteration: _onAnimationIteration,
            className: thumbClass,
            ...rest
          } = props as React.HTMLAttributes<HTMLSpanElement>;

          return (
            <motion.span
              {...rest}
              className={cn(
                'bp-switch-thumb absolute top-0 left-0 block rounded-full bg-card shadow-sm',
                thumbClass,
              )}
              initial={false}
              style={{
                ...(baseStyle as React.CSSProperties | undefined),
                x: motionX,
              }}
              animate={{
                y: thumbY,
                width: thumbWidth,
                height: thumbHeight,
              }}
              transition={transition}
            />
          );
        }}
      />
    </SwitchPrimitive.Root>
  );

  const shellClass = cn(
    'inline-flex shrink-0 cursor-pointer touch-none select-none rounded-full',
    'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
    disabled && 'pointer-events-none cursor-not-allowed opacity-50',
    className,
  );

  const shellHandlers = {
    tabIndex: disabled ? -1 : 0,
    'aria-label': label ? undefined : ariaLabel,
    'aria-labelledby': label ? labelId : undefined,
    onKeyDown: handleKeyDown,
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') setHovered(true);
    },
    onPointerLeave: () => setHovered(false),
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
  };

  if (!label) {
    return (
      <div className={shellClass} {...shellHandlers}>
        {track}
      </div>
    );
  }

  return (
    <div
      className={cn(shellClass, 'relative z-10 items-center gap-2.5')}
      {...shellHandlers}
    >
      {track}
      <span
        id={labelId}
        className={cn(
          'text-[13px] transition-colors duration-100',
          checked ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
    </div>
  );
}

export { Switch };
