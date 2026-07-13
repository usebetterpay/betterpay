'use client';

import type * as React from 'react';
import {
  DemoBillingPortal,
  DemoCancelFlow,
  DemoEntitlementMeter,
  DemoInvoiceCard,
  DemoInvoiceTable,
  DemoPaymentStatusBanner,
  DemoPlanCard,
  DemoPlanComparison,
  DemoPlanGroup,
  DemoPlanSwitcher,
  DemoPricingTable,
  DemoSubscriptionSummary,
  DemoUsageSummary,
} from './index';
import { DEMO_NAMES, type DemoName } from './names';

export type DemoEntry = {
  component: React.ComponentType;
  /** iframe height in px (blocks.so style meta.iframeHeight) */
  iframeHeight: number;
};

/**
 * Maps ComponentPreview `name` → demo component + default iframe height.
 * Used by /preview/[name] and the iframe-based docs preview.
 */
export const DEMO_REGISTRY: Record<DemoName, DemoEntry> = {
  'pricing-table': { component: DemoPricingTable, iframeHeight: 920 },
  'plan-group': { component: DemoPlanGroup, iframeHeight: 900 },
  'plan-card': { component: DemoPlanCard, iframeHeight: 560 },
  'plan-comparison': { component: DemoPlanComparison, iframeHeight: 720 },
  'subscription-summary': { component: DemoSubscriptionSummary, iframeHeight: 420 },
  'plan-switcher': { component: DemoPlanSwitcher, iframeHeight: 200 },
  'cancel-flow': { component: DemoCancelFlow, iframeHeight: 200 },
  'billing-portal': { component: DemoBillingPortal, iframeHeight: 1100 },
  'entitlement-meter': { component: DemoEntitlementMeter, iframeHeight: 220 },
  'usage-summary': { component: DemoUsageSummary, iframeHeight: 520 },
  'invoice-table': { component: DemoInvoiceTable, iframeHeight: 420 },
  'invoice-card': { component: DemoInvoiceCard, iframeHeight: 480 },
  'payment-status-banner': { component: DemoPaymentStatusBanner, iframeHeight: 360 },
};

export { DEMO_NAMES };

export function getDemo(name: string): DemoEntry | undefined {
  return DEMO_REGISTRY[name as DemoName];
}
