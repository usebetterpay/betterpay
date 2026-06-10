// ── Schema normalization + hashing ──────────────────────────────────────
// Converts PlanDefinition[] → NormalizedSchema for internal use.

import { createHash } from 'node:crypto';
import type { PlanDefinition, FeatureInclude, ProductRecord } from './types';

export interface NormalizedPlan {
  id: string;
  group: string;
  name: string;
  isDefault: boolean;
  priceAmount: number | null;
  priceCurrency: string | null;
  priceInterval: string | null;
  features: FeatureInclude[];
  hash: string;
}

export interface NormalizedSchema {
  plans: NormalizedPlan[];
  planMap: Map<string, NormalizedPlan>;
}

/**
 * Normalize an array of PlanDefinitions into a sorted, deduped schema.
 */
export function normalizeSchema(plans: PlanDefinition[]): NormalizedSchema {
  const normalized = plans
    .map((p) => normalizePlan(p))
    .sort((a, b) => a.id.localeCompare(b.id));

  const planMap = new Map<string, NormalizedPlan>();
  for (const plan of normalized) {
    planMap.set(plan.id, plan);
  }

  return { plans: normalized, planMap };
}

function normalizePlan(plan: PlanDefinition): NormalizedPlan {
  const sortedFeatures = [...plan.includes].sort((a, b) =>
    a.featureId.localeCompare(b.featureId),
  );

  return {
    id: plan.id,
    group: plan.group,
    name: plan.name,
    isDefault: plan.default ?? false,
    priceAmount: plan.price?.amount ?? null,
    priceCurrency: plan.price?.currency ?? null,
    priceInterval: plan.price?.interval ?? null,
    features: sortedFeatures,
    hash: computePlanHash(plan),
  };
}

/**
 * Compute a SHA-256 hash of a plan's configuration.
 * Used to detect plan changes for versioning and sync.
 * Returns first 16 hex chars.
 */
export function computePlanHash(plan: PlanDefinition): string {
  const payload = {
    id: plan.id,
    group: plan.group,
    price: plan.price ?? null,
    includes: plan.includes
      .map((f) => ({
        featureId: f.featureId,
        type: f.type,
        metered: f.metered ?? null,
      }))
      .sort((a, b) => a.featureId.localeCompare(b.featureId)),
  };

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
}

/**
 * Check if two plans have changed (different hash).
 */
export function planChanged(existing: ProductRecord | null, next: PlanDefinition): boolean {
  if (!existing) return true;
  return existing.hash !== computePlanHash(next);
}

/**
 * Compare feature arrays for changes.
 */
export function featuresChanged(
  existing: FeatureInclude[],
  next: FeatureInclude[],
): boolean {
  if (existing.length !== next.length) return true;

  const sortedExisting = [...existing].sort((a, b) => a.featureId.localeCompare(b.featureId));
  const sortedNext = [...next].sort((a, b) => a.featureId.localeCompare(b.featureId));

  for (let i = 0; i < sortedExisting.length; i++) {
    const a = sortedExisting[i]!;
    const b = sortedNext[i]!;
    if (a.featureId !== b.featureId) return true;
    if (a.type !== b.type) return true;
    if (JSON.stringify(a.metered) !== JSON.stringify(b.metered)) return true;
  }

  return false;
}
