// ── @betterpay/ui — Public API ───────────────────────────────────────────

// Utils
export { cn } from './lib/cn';
export { formatMoney, formatIdr, type FormatMoneyOptions } from './lib/money';
export { formatDisplayDate } from './lib/dates';
export { useControllableState } from './lib/use-controllable-state';
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
export { Badge, badgeVariants } from './primitives/badge';
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from './primitives/card';
export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogBackdrop,
  DialogContent,
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
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from './primitives/table';

// Domain components
export {
  PlanCard,
  PlanCardHeader,
  PlanCardTitle,
  PlanCardDescription,
  PlanCardPrice,
  PlanCardFeatures,
  PlanCardFooter,
  type PlanCardProps,
  type PlanCardPriceProps,
  type PlanCardFeaturesProps,
} from './components/plan-card';
export {
  PlanGroup,
  PlanGroupIntervalToggle,
  usePlanGroup,
  type PlanGroupProps,
} from './components/plan-group';
export { PricingTable, type PricingTableProps } from './components/pricing-table';
export {
  PlanComparison,
  type PlanComparisonProps,
  type ComparisonFeatureRow,
  type ComparisonCell,
} from './components/plan-comparison';
export {
  SubscriptionSummary,
  type SubscriptionSummaryProps,
} from './components/subscription-summary';
export { PlanSwitcher, type PlanSwitcherProps } from './components/plan-switcher';
export { CancelFlow, type CancelFlowProps } from './components/cancel-flow';
export { EntitlementMeter, type EntitlementMeterProps } from './components/entitlement-meter';
export { UsageSummary, type UsageSummaryProps } from './components/usage-summary';
export { InvoiceTable, type InvoiceTableProps } from './components/invoice-table';
export {
  InvoiceCard,
  InvoiceCardList,
  type InvoiceCardProps,
  type InvoiceCardListProps,
} from './components/invoice-card';
export {
  PaymentStatusBanner,
  type PaymentStatusBannerProps,
} from './components/payment-status-banner';
export { BillingPortal, type BillingPortalProps } from './components/billing-portal';
