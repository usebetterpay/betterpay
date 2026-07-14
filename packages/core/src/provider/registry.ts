import type { PaymentProvider, PaymentMethod } from './interface';

/** Provider with an optional priority field (lower number = higher priority). */
interface ProviderWithPriority extends PaymentProvider {
  priority?: number;
}

const DEFAULT_PRIORITY = 999;

export class ProviderRegistry {
  private providers = new Map<string, ProviderWithPriority>();

  /** Register a provider. */
  register(provider: ProviderWithPriority): void {
    this.providers.set(provider.id, provider);
  }

  /** Get a provider by id. */
  get(id: string): PaymentProvider | undefined {
    return this.providers.get(id);
  }

  /** List all registered providers. */
  list(): PaymentProvider[] {
    return Array.from(this.providers.values());
  }

  /** Return the provider with the highest priority (lowest number). */
  getDefault(): PaymentProvider {
    const providers = this.list();
    if (providers.length === 0) {
      throw new Error('No providers registered');
    }
    return this.sortByPriority(providers)[0]!;
  }

  /** Find all providers that support a given payment method. */
  findByMethod(method: PaymentMethod): PaymentProvider[] {
    return this.list().filter((p) => p.paymentMethods.includes(method));
  }

  /**
   * Select the best provider for a subscribe request.
   * If paymentMethod is specified, filters to providers that support it.
   * Returns the highest-priority candidate.
   */
  selectForSubscribe(input: { paymentMethod?: PaymentMethod; amount?: number }): PaymentProvider {
    const candidates = this.listForCreate({
      paymentMethod: input.paymentMethod,
      failover: false,
    });
    if (candidates.length === 0) {
      throw new Error(
        input.paymentMethod
          ? `No provider supports payment method: ${input.paymentMethod}`
          : 'No providers registered',
      );
    }
    return candidates[0]!;
  }

  /**
   * Ordered candidates for createPaymentLink.
   * - If providerId set → that provider only.
   * - Else sorted by priority (lowest number first).
   * - If failover false → only the first candidate.
   * - If failover true → full priority list (caller tries each on failure).
   */
  listForCreate(input: {
    providerId?: string;
    paymentMethod?: PaymentMethod | string;
    failover?: boolean;
  }): PaymentProvider[] {
    if (input.providerId) {
      const p = this.get(input.providerId);
      if (!p) throw new Error(`Provider not found: ${input.providerId}`);
      return [p];
    }

    let candidates = this.list();
    if (input.paymentMethod) {
      const method = input.paymentMethod as PaymentMethod;
      candidates = this.findByMethod(method);
      if (candidates.length === 0) {
        throw new Error(`No provider supports payment method: ${input.paymentMethod}`);
      }
    }

    const sorted = this.sortByPriority(candidates);
    if (!input.failover) {
      return sorted.slice(0, 1);
    }
    return sorted;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private sortByPriority(providers: PaymentProvider[]): PaymentProvider[] {
    return [...providers].sort((a, b) => {
      const pa = (a as ProviderWithPriority).priority ?? DEFAULT_PRIORITY;
      const pb = (b as ProviderWithPriority).priority ?? DEFAULT_PRIORITY;
      return pa - pb;
    });
  }
}
