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

  const percentLabel = unlimited ? 'Unlimited' : `${Math.round(ratio * 100)}% used`;

  return (
    <Card data-slot="entitlement-meter" className={cn(className)}>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="text-sm font-medium">{entitlement.label}</CardTitle>
            <CardDescription>
              {unlimited
                ? 'No hard limit'
                : `${used.toLocaleString('id-ID')} of ${limit.toLocaleString('id-ID')} used`}
            </CardDescription>
          </div>
          <span
            className={cn(
              'shrink-0 text-xs font-medium tabular-nums',
              warn ? 'text-warning' : 'text-muted-foreground',
            )}
          >
            {percentLabel}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div
          data-slot="entitlement-meter-track"
          className="h-2 w-full overflow-hidden rounded-full bg-muted sm:h-1.5"
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
              warn ? 'bg-warning' : 'bg-primary',
              unlimited && 'w-0',
            )}
            style={unlimited ? undefined : { width: `${ratio * 100}%` }}
          />
        </div>
        <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-2">
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
