// ── Plan & Feature DSL ───────────────────────────────────────────────────
// Defines feature() and plan() factories with validation.

import type {
  FeatureFactory,
  FeatureType,
  MeteredFeatureConfig,
  FeatureInclude,
  PlanDefinition,
  PlanPrice,
} from './types';

const FEATURE_BRAND = Symbol.for('betterpay.feature');
const PLAN_BRAND = Symbol.for('betterpay.plan');

// ── Validation helpers ───────────────────────────────────────────────────

const ENTITY_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
const MAX_ENTITY_ID_LENGTH = 64;
const MAX_PRICE_AMOUNT = 999_999_999_999; // IDR can be large

function validateEntityId(id: string, label: string): void {
  if (!id) throw new Error(`${label} id is required`);
  if (id.length > MAX_ENTITY_ID_LENGTH) {
    throw new Error(`${label} id must be ≤ ${MAX_ENTITY_ID_LENGTH} characters, got ${id.length}`);
  }
  if (!ENTITY_ID_PATTERN.test(id)) {
    throw new Error(
      `${label} id must be lowercase alphanumeric with dash/underscore, cannot start with dash/underscore. Got: "${id}"`,
    );
  }
}

function validatePrice(price: PlanPrice): void {
  if (typeof price.amount !== 'number' || !Number.isFinite(price.amount)) {
    throw new Error('Price amount must be a finite number');
  }
  if (price.amount < 0) throw new Error('Price amount cannot be negative');
  if (price.amount > MAX_PRICE_AMOUNT) {
    throw new Error(`Price amount must be ≤ ${MAX_PRICE_AMOUNT}`);
  }
  if (!price.currency) throw new Error('Price currency is required');
}

// ── feature() factory ────────────────────────────────────────────────────

export function feature(def: { id: string; type: FeatureType }): FeatureFactory {
  validateEntityId(def.id, 'Feature');

  const factory = ((config?: MeteredFeatureConfig): FeatureInclude => {
    const include: FeatureInclude = {
      featureId: def.id,
      type: def.type,
    };
    if (def.type === 'metered' && config) {
      if (config.limit <= 0) throw new Error('Metered limit must be positive');
      include.metered = config;
    }
    return include;
  }) as FeatureFactory;

  Object.defineProperty(factory, 'id', { value: def.id, enumerable: true });
  Object.defineProperty(factory, 'type', { value: def.type, enumerable: true });
  Object.defineProperty(factory, FEATURE_BRAND, { value: true, enumerable: false });

  return factory;
}

// ── plan() factory ───────────────────────────────────────────────────────

export function plan(def: {
  id: string;
  group: string;
  name?: string;
  price?: PlanPrice;
  default?: boolean;
  includes?: Array<FeatureInclude | ((config?: MeteredFeatureConfig) => FeatureInclude)>;
}): PlanDefinition {
  validateEntityId(def.id, 'Plan');
  validateEntityId(def.group, 'Plan group');

  if (def.price) {
    validatePrice(def.price);
  }

  // Resolve includes: if it's a function (feature factory), call it without args
  const includes: FeatureInclude[] = (def.includes ?? []).map((item) => {
    if (typeof item === 'function') {
      return item();
    }
    return item;
  });

  return {
    id: def.id,
    group: def.group,
    name: def.name ?? deriveNameFromId(def.id),
    price: def.price,
    default: def.default ?? false,
    includes,
    [PLAN_BRAND]: true as const,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

function deriveNameFromId(id: string): string {
  return id
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Check if a value is a branded feature factory. */
export function isFeature(value: unknown): value is FeatureFactory {
  return (
    typeof value === 'function' &&
    FEATURE_BRAND in value &&
    (value as Record<symbol, unknown>)[FEATURE_BRAND] === true
  );
}

/** Check if a value is a branded plan definition. */
export function isPlan(value: unknown): value is PlanDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    PLAN_BRAND in value &&
    (value as Record<symbol, unknown>)[PLAN_BRAND] === true
  );
}
