// ── @betterpay/ui — Public API ───────────────────────────────────────────

// Utils
export { cn } from './lib/cn';
export { formatMoney, formatIdr, type FormatMoneyOptions } from './lib/money';
export {
  subscriptionStatusPresentation,
  invoiceStatusPresentation,
  paymentCalloutPresentation,
  isTerminalSubscription,
  type SubscriptionStatus,
  type InvoiceStatus,
  type PaymentCalloutStatus,
  type BadgeTone,
  type StatusPresentation,
} from './lib/status';

// Types
export type {
  PlanView,
  BillingInterval,
  SubscriptionView,
  InvoiceView,
  EntitlementView,
  PaymentCalloutView,
} from './types/billing-ui';

// Primitives
export { Button, buttonVariants, type ButtonProps } from './primitives/button';
export { Badge, badgeVariants, type BadgeProps } from './primitives/badge';
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './primitives/card';
export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
  DialogClose,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from './primitives/dialog';
export { Separator } from './primitives/separator';
export { Switch } from './primitives/switch';
export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './primitives/table';

// Domain components
export { PricingTable, type PricingTableProps } from './components/pricing-table';
export {
  SubscriptionSummary,
  type SubscriptionSummaryProps,
} from './components/subscription-summary';
export { PlanSwitcher, type PlanSwitcherProps } from './components/plan-switcher';
export { CancelFlow, type CancelFlowProps } from './components/cancel-flow';
export { EntitlementMeter, type EntitlementMeterProps } from './components/entitlement-meter';
export { InvoiceTable, type InvoiceTableProps } from './components/invoice-table';
export {
  PaymentStatusBanner,
  type PaymentStatusBannerProps,
} from './components/payment-status-banner';
export { BillingPortal, type BillingPortalProps } from './components/billing-portal';
