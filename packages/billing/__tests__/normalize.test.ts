import { describe, it, expect } from 'vitest';
import { feature, plan } from '../src/schema';
import { normalizeSchema, computePlanHash, planChanged, featuresChanged } from '../src/normalize';
import type { ProductRecord, FeatureInclude } from '../src/types';

describe('computePlanHash', () => {
  it('returns consistent hash for same plan', () => {
    const p = plan({
      id: 'pro',
      group: 'base',
      price: { amount: 199000, currency: 'IDR', interval: 'month' },
    });
    const hash1 = computePlanHash(p);
    const hash2 = computePlanHash(p);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(16);
  });

  it('returns different hash for different plans', () => {
    const p1 = plan({ id: 'pro', group: 'base', price: { amount: 199000, currency: 'IDR' } });
    const p2 = plan({ id: 'pro', group: 'base', price: { amount: 299000, currency: 'IDR' } });
    expect(computePlanHash(p1)).not.toBe(computePlanHash(p2));
  });
});

describe('normalizeSchema', () => {
  it('normalizes and sorts plans', () => {
    const free = plan({ id: 'free', group: 'base', default: true });
    const pro = plan({
      id: 'pro',
      group: 'base',
      price: { amount: 199000, currency: 'IDR', interval: 'month' },
    });
    const enterprise = plan({
      id: 'enterprise',
      group: 'base',
      price: { amount: 999000, currency: 'IDR', interval: 'month' },
    });

    // Pass in non-sorted order
    const schema = normalizeSchema([pro, free, enterprise]);

    expect(schema.plans).toHaveLength(3);
    expect(schema.plans[0]!.id).toBe('enterprise');
    expect(schema.plans[1]!.id).toBe('free');
    expect(schema.plans[2]!.id).toBe('pro');
    expect(schema.planMap.get('pro')!.id).toBe('pro');
  });

  it('sorts features within each plan', () => {
    const messages = feature({ id: 'messages', type: 'metered' });
    const aiModels = feature({ id: 'ai-models', type: 'boolean' });

    const p = plan({
      id: 'pro',
      group: 'base',
      includes: [messages({ limit: 5000, reset: 'month' }), aiModels()],
    });

    const schema = normalizeSchema([p]);
    const features = schema.plans[0]!.features;
    expect(features[0]!.featureId).toBe('ai-models');
    expect(features[1]!.featureId).toBe('messages');
  });
});

describe('planChanged', () => {
  it('returns true for null existing', () => {
    const p = plan({ id: 'pro', group: 'base' });
    expect(planChanged(null, p)).toBe(true);
  });

  it('returns false when hashes match', () => {
    const p = plan({ id: 'pro', group: 'base' });
    const record: ProductRecord = {
      id: 'prod_1',
      planId: 'pro',
      name: 'Pro',
      group: 'base',
      isDefault: false,
      priceAmount: null,
      priceCurrency: null,
      priceInterval: null,
      version: 1,
      hash: computePlanHash(p),
      features: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(planChanged(record, p)).toBe(false);
  });

  it('returns true when hashes differ', () => {
    const p1 = plan({ id: 'pro', group: 'base', price: { amount: 199000, currency: 'IDR' } });
    const p2 = plan({ id: 'pro', group: 'base', price: { amount: 299000, currency: 'IDR' } });
    const record: ProductRecord = {
      id: 'prod_1',
      planId: 'pro',
      name: 'Pro',
      group: 'base',
      isDefault: false,
      priceAmount: 199000,
      priceCurrency: 'IDR',
      priceInterval: null,
      version: 1,
      hash: computePlanHash(p1),
      features: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(planChanged(record, p2)).toBe(true);
  });
});

describe('featuresChanged', () => {
  it('returns false for identical features', () => {
    const a: FeatureInclude[] = [
      { featureId: 'messages', type: 'metered', metered: { limit: 5000, reset: 'month' } },
    ];
    const b: FeatureInclude[] = [
      { featureId: 'messages', type: 'metered', metered: { limit: 5000, reset: 'month' } },
    ];
    expect(featuresChanged(a, b)).toBe(false);
  });

  it('returns true for different lengths', () => {
    const a: FeatureInclude[] = [{ featureId: 'a', type: 'boolean' }];
    const b: FeatureInclude[] = [
      { featureId: 'a', type: 'boolean' },
      { featureId: 'b', type: 'boolean' },
    ];
    expect(featuresChanged(a, b)).toBe(true);
  });

  it('returns true for different limits', () => {
    const a: FeatureInclude[] = [
      { featureId: 'x', type: 'metered', metered: { limit: 1000, reset: 'month' } },
    ];
    const b: FeatureInclude[] = [
      { featureId: 'x', type: 'metered', metered: { limit: 5000, reset: 'month' } },
    ];
    expect(featuresChanged(a, b)).toBe(true);
  });
});
