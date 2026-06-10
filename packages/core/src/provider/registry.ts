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
    let candidates: PaymentProvider[];

    if (input.paymentMethod) {
      candidates = this.findByMethod(input.paymentMethod);
      if (candidates.length === 0) {
        throw new Error(`No provider supports payment method: ${input.paymentMethod}`);
      }
    } else {
      candidates = this.list();
    }

    return this.sortByPriority(candidates)[0]!;
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
