import { cn } from '../lib/cn';
import type { EntitlementView } from '../types/billing-ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../primitives/card';

export interface EntitlementMeterProps {
  entitlement: EntitlementView;
  className?: string;
  /** Warn when remaining ratio is at or below this (0–1). Default 0.15 */
  warnAt?: number;
  /**
   * `card` — standalone surface (default).
   * `embedded` — flat row inside UsageSummary (no nested card chrome).
   */
  variant?: 'card' | 'embedded';
}

export function EntitlementMeter({
  entitlement,
  className,
  warnAt = 0.15,
  variant = 'card',
}: EntitlementMeterProps) {
  const unlimited = entitlement.limit == null;
  const limit = entitlement.limit ?? 0;
  const used = Math.max(0, entitlement.used);
  const remaining = unlimited ? null : Math.max(0, limit - used);
  const ratio = unlimited || limit <= 0 ? 0 : Math.min(1, used / limit);
  const remainingRatio = unlimited || limit <= 0 ? 1 : Math.max(0, 1 - ratio);
  const warn = !unlimited && remainingRatio <= warnAt;

  const percentLabel = unlimited ? 'Unlimited' : `${Math.round(ratio * 100)}% used`;
  const unitSuffix = entitlement.unit ? ` ${entitlement.unit}` : '';

  const body = (
    <div className="flex flex-col gap-3.5">
      <div
        data-slot="entitlement-meter-track"
        className="h-2.5 w-full overflow-hidden rounded-full bg-muted/90"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={unlimited ? undefined : limit}
        aria-valuenow={unlimited ? undefined : used}
        aria-label={entitlement.label}
      >
        <div
          data-slot="entitlement-meter-fill"
          className={cn(
            'h-full rounded-full transition-[width] duration-[var(--duration,180ms)] ease-[var(--ease-out,cubic-bezier(0.16,1,0.3,1))]',
            warn ? 'bg-warning' : 'bg-primary/90',
            unlimited && 'w-0',
          )}
          style={unlimited ? undefined : { width: `${ratio * 100}%` }}
        />
      </div>
      <div className="flex flex-col gap-1.5 text-sm leading-relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <span>
          {remaining == null
            ? 'Remaining: unlimited'
            : `Remaining: ${remaining.toLocaleString('id-ID')}${unitSuffix}`}
        </span>
        {entitlement.resetLabel ? <span>Resets {entitlement.resetLabel}</span> : null}
      </div>
    </div>
  );

  if (variant === 'embedded') {
    return (
      <div
        data-slot="entitlement-meter"
        data-variant="embedded"
        className={cn(
          'flex flex-col gap-4 rounded-xl border border-border/70 bg-muted/20 px-5 py-5',
          className,
        )}
      >
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="text-sm font-semibold tracking-tight text-foreground">
              {entitlement.label}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {unlimited
                ? 'No hard limit'
                : `${used.toLocaleString('id-ID')} of ${limit.toLocaleString('id-ID')}${unitSuffix} used`}
            </p>
          </div>
          <span
            className={cn(
              'shrink-0 self-start rounded-full px-2.5 py-1 text-xs font-medium tabular-nums',
              warn
                ? 'bg-[color-mix(in_oklch,var(--warning)_12%,transparent)] text-warning'
                : 'bg-muted/80 text-muted-foreground',
            )}
          >
            {percentLabel}
          </span>
        </div>
        {body}
      </div>
    );
  }

  return (
    <Card data-slot="entitlement-meter" className={cn(className)}>
      <CardHeader>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <CardTitle className="text-base font-semibold tracking-tight">
              {entitlement.label}
            </CardTitle>
            <CardDescription>
              {unlimited
                ? 'No hard limit'
                : `${used.toLocaleString('id-ID')} of ${limit.toLocaleString('id-ID')}${unitSuffix} used`}
            </CardDescription>
          </div>
          <span
            className={cn(
              'shrink-0 self-start rounded-full px-2.5 py-1 text-xs font-medium tabular-nums',
              warn
                ? 'bg-[color-mix(in_oklch,var(--warning)_12%,transparent)] text-warning'
                : 'bg-muted/80 text-muted-foreground',
            )}
          >
            {percentLabel}
          </span>
        </div>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
