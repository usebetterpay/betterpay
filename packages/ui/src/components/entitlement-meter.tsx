import { cn } from '../lib/cn';
import type { EntitlementView } from '../types/billing-ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../primitives/card';

export interface EntitlementMeterProps {
  entitlement: EntitlementView;
  className?: string;
  /** Warn when remaining ratio is at or below this (0–1). Default 0.15 */
  warnAt?: number;
}

export function EntitlementMeter({
  entitlement,
  className,
  warnAt = 0.15,
}: EntitlementMeterProps) {
  const unlimited = entitlement.limit == null;
  const limit = entitlement.limit ?? 0;
  const used = Math.max(0, entitlement.used);
  const remaining = unlimited ? null : Math.max(0, limit - used);
  const ratio = unlimited || limit <= 0 ? 0 : Math.min(1, used / limit);
  const remainingRatio = unlimited || limit <= 0 ? 1 : Math.max(0, 1 - ratio);
  const warn = !unlimited && remainingRatio <= warnAt;

  const percentLabel = unlimited
    ? 'Unlimited'
    : `${Math.round(ratio * 100)}% used`;

  return (
    <Card data-slot="entitlement-meter" className={cn(className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-sm font-medium">{entitlement.label}</CardTitle>
            <CardDescription>
              {unlimited
                ? 'No hard limit'
                : `${used.toLocaleString('id-ID')} of ${limit.toLocaleString('id-ID')} used`}
            </CardDescription>
          </div>
          <span
            className={cn(
              'text-xs font-medium tabular-nums',
              warn
                ? 'text-[var(--bp-warning,#8a6500)]'
                : 'text-[var(--bp-muted-foreground,#64748b)]',
            )}
          >
            {percentLabel}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div
          data-slot="entitlement-meter-track"
          className="h-2 w-full overflow-hidden rounded-full bg-[var(--bp-muted,#e2e8f0)]"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={unlimited ? undefined : limit}
          aria-valuenow={unlimited ? undefined : used}
          aria-label={entitlement.label}
        >
          <div
            data-slot="entitlement-meter-fill"
            className={cn(
              'h-full rounded-full transition-[width]',
              warn
                ? 'bg-[var(--bp-warning,#b8860b)]'
                : 'bg-[var(--bp-primary,#0f3d4c)]',
              unlimited && 'w-0',
            )}
            style={unlimited ? undefined : { width: `${ratio * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-[var(--bp-muted-foreground,#64748b)]">
          <span>
            {remaining == null
              ? 'Remaining: unlimited'
              : `Remaining: ${remaining.toLocaleString('id-ID')}`}
          </span>
          {entitlement.resetLabel ? <span>Resets {entitlement.resetLabel}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
