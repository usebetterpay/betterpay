import { cn } from '@/lib/utils';

type LogoProps = {
  className?: string;
  /** Accessible name — defaults to DEMO CORP */
  alt?: string;
};

/**
 * BetterPay mark — theme-aware light/dark PNGs from brand pack.
 * Light chrome uses dark mark; dark chrome uses light mark.
 */
export function LogoIcon({ className, alt = 'DEMO CORP' }: LogoProps) {
  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
    >
      <img
        src="/logo-dark.png"
        alt={alt}
        className="h-full w-full object-contain dark:hidden"
        draggable={false}
      />
      <img
        src="/logo-light.png"
        alt=""
        aria-hidden
        className="hidden h-full w-full object-contain dark:block"
        draggable={false}
      />
    </span>
  );
}

/** Full wordmark row: mark + DEMO CORP label */
export function Logo({ className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoIcon className="h-5 w-5" />
      <span className="font-semibold text-sm tracking-tight text-foreground">DEMO CORP</span>
    </span>
  );
}
