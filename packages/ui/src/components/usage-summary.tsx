'use client';

import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '../lib/cn';
import type { EntitlementView } from '../types/billing-ui';
import { Button } from '../primitives/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../primitives/card';
import { EntitlementMeter } from './entitlement-meter';

export interface UsageSummaryProps {
  entitlements: EntitlementView[];
  title?: string;
  description?: string;
  /** e.g. "12 days left in cycle" */
  periodLabel?: string;
  /** Warn threshold for meters (0–1). */
  warnAt?: number;
  /** Collapse list when more than this many (default 3). 0 = never collapse. */
  collapseAfter?: number;
  className?: string;
}

/**
 * Multi-entitlement usage panel with optional expand for long lists.
 */
export function UsageSummary({
  entitlements,
  title = 'Usage',
  description,
  periodLabel,
  warnAt,
  collapseAfter = 3,
  className,
}: UsageSummaryProps) {
  const [expanded, setExpanded] = React.useState(false);
  const collapsible = collapseAfter > 0 && entitlements.length > collapseAfter;
  const visible =
    collapsible && !expanded ? entitlements.slice(0, collapseAfter) : entitlements;
  const hiddenCount = entitlements.length - visible.length;

  return (
    <Card data-slot="usage-summary" className={cn(className)}>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {periodLabel ? (
            <span className="shrink-0 rounded-full bg-muted/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              {periodLabel}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {entitlements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No metered features on this plan.</p>
        ) : (
          <>
            <div className="grid gap-4">
              {visible.map((item) => (
                <EntitlementMeter
                  key={item.featureId}
                  entitlement={item}
                  warnAt={warnAt}
                  variant="embedded"
                />
              ))}
            </div>
            {collapsible ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center sm:w-auto sm:self-start sm:justify-start"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
              >
                {expanded ? 'Show less' : `Show ${hiddenCount} more`}
                <ChevronDownIcon
                  className={cn(
                    'size-4 transition-transform duration-[var(--duration,180ms)]',
                    expanded && 'rotate-180',
                  )}
                />
              </Button>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
