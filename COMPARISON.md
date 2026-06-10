# Architecture Doc Comparison: BetterPay vs Better Auth

> Perbandingan head-to-head antara arsitektur **BetterPay** (PayKit-inspired) dan **Better Auth** untuk menentukan best practices mana yang lebih unggul dan apa yang harus di-adopsi.

---

## Scoring Matrix

| Aspek | BetterPay (PayKit-based) | Better Auth | Winner | Skor |
|-------|--------------------------|-------------|--------|------|
| **Monorepo Infrastructure** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Better Auth | 3 vs 5 |
| **Plugin System** | ⭐⭐ | ⭐⭐⭐⭐⭐ | Better Auth | 2 vs 5 |
| **Database Abstraction** | ⭐⭐ | ⭐⭐⭐⭐⭐ | Better Auth | 2 vs 5 |
| **Provider Abstraction** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | BetterPay | 5 vs 3 |
| **Domain Model Depth** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | BetterPay | 5 vs 3 |
| **Client Architecture** | ⭐⭐ | ⭐⭐⭐⭐⭐ | Better Auth | 2 vs 5 |
| **Security Patterns** | ⭐⭐ | ⭐⭐⭐⭐⭐ | Better Auth | 2 vs 5 |
| **Testing Strategy** | ⭐⭐ | ⭐⭐⭐⭐⭐ | Better Auth | 2 vs 5 |
| **CI/CD Pipeline** | ⭐ | ⭐⭐⭐⭐⭐ | Better Auth | 1 vs 5 |
| **Error Handling** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Tie | 4 vs 4 |
| **Code Style Rigor** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Better Auth | 3 vs 5 |
| **Webhook Pipeline** | ⭐⭐⭐⭐⭐ | N/A | BetterPay | 5 vs N/A |
| **Entitlement Engine** | ⭐⭐⭐⭐⭐ | N/A | BetterPay | 5 vs N/A |
| **Documentation Quality** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Better Auth | 4 vs 5 |
| **Community/Extensibility** | ⭐⭐ | ⭐⭐⭐⭐⭐ | Better Auth | 2 vs 5 |

**Total: BetterPay 48 / 75 — Better Auth 66 / 75**

---

## 1. Monorepo Infrastructure

### Better Auth wins significantly

**Better Auth punya:**
- `pnpm-workspace.yaml` dengan **catalog** (version pinning), **overrides** (security), `minimumReleaseAge: 1440` (supply-chain defense)
- **Biome** (lint + format) — lebih fast dan unified vs oxlint + oxfmt
- **knip** — dead code detection
- **publint + attw** — package validation dan type export correctness
- **cspell** — spell checking
- **Docker Compose** per DB type untuk testing
- **8 CI workflow jobs** (lint, typecheck, test, e2e, preview, auto-label, semantic-pr, verify-changesets, zizmor security audit)

**BetterPay punya:**
- pnpm-workspace + catalog (basic)
- oxlint + oxfmt (fast but less comprehensive)
- Turborepo
- Changesets

### Gap Analysis — Yang Harus Diadopsi BetterPay

| Practice | Priority | Effort |
|----------|----------|--------|
| `minimumReleaseAge` | 🔴 High | Low — add 1 line |
| `overrides` for security | 🔴 High | Low — add to workspace yaml |
| `knip` dead code detection | 🟡 Medium | Low |
| `publint` + `attw` package validation | 🟡 Medium | Low |
| `cspell` spell checking | 🟢 Low | Low |
| Docker Compose per provider sandbox | 🟡 Medium | Medium |
| CI pipeline: lint → typecheck → test → e2e | 🔴 High | Medium |
| `zizmor` security audit | 🟢 Low | Low |

---

## 2. Plugin System

### Better Auth wins decisively

**Better Auth plugin interface:**
```typescript
type BetterAuthPlugin = {
  id: string;
  version?: string;
  init?: (ctx) => Awaitable<...>;           // Lifecycle hook
  endpoints?: Record<string, Endpoint>;      // HTTP endpoints
  middlewares?: { path, middleware }[];       // Middleware registration
  onRequest?: (req, ctx) => ...;             // Global request hook
  onResponse?: (res, ctx) => ...;            // Global response hook
  hooks?: { before?, after? };               // Before/after hooks with matchers
  schema?: BetterAuthPluginDBSchema;         // DB schema contribution
  migrations?: Record<string, Migration>;    // Custom migrations
  adapter?: Record<string, Function>;        // Custom adapter methods
  rateLimit?: { window, max, pathMatcher }[];// Plugin-level rate limits
  $ERROR_CODES?: Record<string, RawError>;   // Type-safe error codes
  $Infer?: Record<string, any>;              // Type inference helper
};
```

**PayKit plugin interface:**
```typescript
interface PayKitPlugin {
  id: string;
  endpoints?: Record<string, unknown>;  // That's it.
}
```

### Key Differences

| Capability | Better Auth | PayKit/BetterPay |
|-----------|-------------|------------------|
| Lifecycle hooks (init) | ✅ | ❌ |
| Schema contribution | ✅ (auto-merge) | ❌ |
| Migration contribution | ✅ | ❌ |
| Before/After hooks | ✅ (with matcher) | ❌ |
| Middleware registration | ✅ | ❌ |
| onRequest/onResponse | ✅ | ❌ |
| Rate limiting per plugin | ✅ | ❌ |
| Custom adapter methods | ✅ | ❌ |
| Type-safe error codes | ✅ (`$ERROR_CODES`) | ❌ (global only) |
| Type inference (`$Infer`) | ✅ | ❌ |
| Plugin registry (module augmentation) | ✅ | ❌ |
| Client-side companion | ✅ | ❌ |
| Sub-module composition | ✅ (sub-plugins) | ❌ |

### Impact on BetterPay

BetterPay's current plugin design would mean:
- ❌ Notification providers **can't contribute schema** (notification_log table)
- ❌ Payment providers **can't register webhooks** cleanly
- ❌ Dashboard plugin **can't add routes** with middleware
- ❌ Community **can't extend** without forking

### Recommendation: Adopt Better Auth's Plugin Pattern

```typescript
// Proposed BetterPay plugin interface
type BetterPayPlugin = {
  id: string;
  version?: string;

  // Lifecycle
  init?: (ctx: BetterPayContext) => Awaitable<void>;

  // HTTP
  endpoints?: Record<string, Endpoint>;
  middlewares?: { path: string; middleware: Middleware }[];
  onRequest?: (req: Request, ctx: BetterPayContext) => Promise<...>;
  onResponse?: (res: Response, ctx: BetterPayContext) => Promise<...>;

  // Hooks
  hooks?: {
    before?: { matcher: (ctx) => boolean; handler: PayMiddleware }[];
    after?: { matcher: (ctx) => boolean; handler: PayMiddleware }[];
  };

  // Database
  schema?: BetterPayPluginDBSchema;
  migrations?: Record<string, Migration>;

  // Provider registration (NEW — unique to BetterPay)
  providers?: PaymentProvider[];

  // Notification channels (NEW)
  notificationChannels?: NotificationChannel[];

  // Rate limiting
  rateLimit?: { window: number; max: number; pathMatcher: (path: string) => boolean }[];

  // Type safety
  $ERROR_CODES?: Record<string, RawError>;
  $Infer?: Record<string, any>;
};
```

---

## 3. Database Abstraction

### Better Auth wins with Adapter Factory pattern

**Better Auth: Multi-ORM adapter**
- Drizzle, Kysely, Prisma, MongoDB, In-Memory
- Universal `DBAdapter` interface via `createAdapterFactory`
- **Capability flags** (`supportsBooleans`, `supportsDates`, `supportsJSON`, etc.)
- **Transform pipeline** (input/output/where) — handles ORM differences transparently
- Plugins contribute schema that auto-merges

**PayKit/BetterPay: Single ORM (Drizzle + pg only)**
- Hardcoded PostgreSQL
- No adapter layer
- Schema is internal, not extensible

### Impact

| Scenario | Better Auth | BetterPay |
|----------|-------------|-----------|
| User wants MySQL | ✅ (Drizzle MySQL adapter) | ❌ (pg only) |
| User wants Prisma | ✅ (Prisma adapter) | ❌ |
| User wants MongoDB | ✅ (Mongo adapter) | ❌ |
| User wants SQLite (dev) | ✅ | ❌ |
| Plugin adds DB table | ✅ (auto schema merge) | ❌ |

### Recommendation

For BetterPay, full multi-ORM support is **overkill** (billing needs transactions, JSONB, indexes — PostgreSQL is ideal). But the **adapter factory pattern** is worth adopting for:

1. **Testing** — In-memory adapter for fast unit tests
2. **Future-proofing** — MySQL/MariaDB support (big in Indo hosting)
3. **Plugin schema contribution** — Let notification/dunning plugins add their own tables

**Priority:** 🟡 Medium — Implement adapter interface with pg adapter + memory adapter first.

---

## 4. Provider Abstraction

### BetterPay wins (this is PayKit's core strength)

**PayKit's `PaymentProvider` interface:**
- 20+ methods covering full billing lifecycle
- Normalized webhook events with action system
- Webhook signature verification built-in
- Product sync to provider
- Test clock support
- Diagnostic check

**Better Auth's Stripe plugin:**
- Focused on subscription + checkout
- No webhook normalization layer
- No product sync
- Simpler but less comprehensive

### Why BetterPay's Provider Abstraction is Better

1. **Normalized events** — Provider-agnostic event names (`checkout.completed`, `subscription.updated`)
2. **Action-based reconciliation** — Events produce typed actions (`subscription.upsert`, `payment.upsert`)
3. **Idempotent processing** — Built-in deduplication via webhook_event table
4. **Multi-event expansion** — Single Stripe event → multiple normalized events (e.g., checkout → payment_method.attached + payment.succeeded + checkout.completed)
5. **Provider diagnostics** — `check()` method for health monitoring

### BetterPay Should Keep This + Adopt Better Auth's Patterns For:
- Plugin lifecycle (init hooks)
- Schema contribution
- Hook system

---

## 5. Domain Model Depth

### BetterPay wins (billing is inherently more complex than auth)

**BetterPay covers:**
- Plan/Feature DSL with type-safe `feature()` and `plan()` builders
- Subscription state machine (5 states, complex transitions)
- Entitlement engine (lazy reset, stacked deductions, CTE queries)
- Product versioning
- Webhook pipeline with idempotency
- Dunning system

**Better Auth covers:**
- User/Session/Account model
- OAuth2 flows
- Session management (cookie caching, rotation)
- Rate limiting
- 2FA/Passkeys (as plugins)

### Verdict

Different domains, different complexities. BetterPay's domain model is deeper because billing IS more complex than auth. But Better Auth's **plugin decomposition** is superior.

---

## 6. Client Architecture

### Better Auth wins massively

**Better Auth:**
- Core client + framework adapters (React, Vue, Svelte, Solid, Lynx)
- Cross-tab sync via BroadcastChannel
- Session atom (reactive state management)
- Auto-refresh logic
- Focus/online managers
- Client plugin system with type inference from server
- `nanostores` for state

**PayKit/BetterPay:**
- Proxy-based client (clever but limited)
- No framework adapters
- No reactive state
- No cross-tab sync
- Type inference works but simpler

### Recommendation for BetterPay

```
packages/
├── client/              # Core client (proxy-based, keep)
├── client-react/        # React hooks (useSubscription, useEntitlement)
├── client-vue/          # Vue composables
├── client-next/         # Next.js integration
└── checkout/            # Hosted checkout widget (React)
```

Key hooks to build:
```typescript
const { subscription, isLoading } = useSubscription();
const { balance, check } = useEntitlement("messages");
const { invoices } = useInvoices();
const { subscribe, cancel } = useBillingActions();
```

**Priority:** 🟡 Medium — Start with React hooks (most common in Indo startup ecosystem).

---

## 7. Security Patterns

### Better Auth wins

**Better Auth has:**
- CSRF protection (Origin + Sec-Fetch-* headers)
- Rate limiting (per-endpoint, per-plugin)
- Secret rotation (versioned secrets)
- OAuth token encryption (AES-256-GCM)
- Fresh session checks
- Cookie caching strategies (compact, JWT, JWE)
- Entropy validation for secrets

**BetterPay has:**
- Webhook signature verification ✅
- `trustedOrigins` allowlist ✅
- Return URL anti-spoofing ✅
- Customer identity verification ✅
- No rate limiting ❌
- No secret rotation ❌
- No CSRF protection ❌

### Critical Gaps for BetterPay

| Security Feature | Priority | Notes |
|-----------------|----------|-------|
| **Rate limiting** | 🔴 Critical | Payment APIs are abuse targets |
| **API key auth** | 🔴 Critical | Server-to-server calls need auth |
| **Webhook replay protection** | 🟡 Medium | Timestamp validation |
| **Idempotency keys** | 🟡 Medium | Client-side payment dedup |
| **Request signing** | 🟡 Medium | For provider callbacks |
| **Secret rotation** | 🟢 Low | Future enhancement |

---

## 8. Testing Strategy

### Better Auth wins

**Better Auth:**
- Unit tests co-located with source
- Integration tests (`test/`)
- E2E tests (`e2e/`)
- `getTestInstance()` pattern — creates full auth + client in one call
- Docker Compose for multi-DB testing
- Coverage reporting
- Adapter tests run against all DBs

**BetterPay:**
- Basic Vitest setup
- Some unit tests in PayKit core
- No integration test infrastructure
- No test instance pattern
- No provider sandbox testing

### Recommendation

```typescript
// Proposed: getTestInstance pattern for BetterPay
export async function getTestInstance(options?: Partial<BetterPayOptions>) {
  const pool = await createTestPool();  // SQLite or pg test container
  await migrateDatabase(pool);

  const paykit = createPayKit({
    database: pool,
    providers: [createTestProvider()],  // Mock provider
    products: [freePlan, proPlan],
    ...options,
  });

  const client = createPayKitClient({
    baseURL: "/paykit",
    fetchOptions: {
      customFetchImpl: async (url, init) => paykit.handler(new Request(url, init)),
    },
  });

  return { paykit, client, pool };
}
```

---

## 9. Code Style Rigor

### Better Auth wins

| Aspect | Better Auth | BetterPay |
|--------|-------------|-----------|
| Linter | Biome (unified, strict) | oxlint (fast, less rules) |
| Formatter | Biome (integrated) | oxfmt (separate) |
| Import order | Enforced by Biome | Not enforced |
| Dead code detection | knip | None |
| Package validation | publint + attw | None |
| Spell check | cspell | None |
| Restricted imports | Yes (`Buffer` → `Uint8Array`) | None |
| Promise handling | `noFloatingPromises: error` | Not enforced |

### Key Adoption for BetterPay

```jsonc
// biome.json (replace oxlint + oxfmt)
{
  "linter": {
    "rules": {
      "style": {
        "useImportType": { "level": "error", "options": { "style": "separatedType" } },
        "useConst": "error",
        "noRestrictedTypes": {
          "options": {
            "types": {
              "Buffer": { "message": "Use Uint8Array", "use": "Uint8Array" }
            }
          }
        }
      },
      "nursery": {
        "noMisusedPromises": "error",
        "noFloatingPromises": "error"
      }
    }
  }
}
```

---

## 10. Community & Extensibility

### Better Auth wins massively

**Better Auth ecosystem:**
- 20+ official plugins (2FA, passkey, SSO, SCIM, Stripe, API key, etc.)
- 5 DB adapters (Drizzle, Kysely, Prisma, Mongo, Memory)
- 5 framework clients (React, Vue, Svelte, Solid, Lynx)
- Plugin registry via module augmentation
- Community can create and publish plugins independently
- OpenAPI spec generation built-in

**PayKit ecosystem:**
- 1 provider (Stripe)
- 1 framework handler (Next.js)
- 1 basic plugin (dashboard)
- No community plugin ecosystem
- No plugin registry

### What BetterPay Needs

```
Official plugins:
├── provider-midtrans      # Payment provider
├── provider-xendit
├── provider-doku
├── provider-stripe
├── notification-email     # Notification channel
├── notification-whatsapp
├── notification-sms
├── reconciliation-bca     # Bank reconciliation
├── reconciliation-mandiri
├── compliance-ojk         # OJK reporting
├── dashboard              # Admin dashboard
└── checkout               # Hosted checkout

Community plugins (examples):
├── betterpay-provider-espays
├── betterpay-notification-fonnte
├── betterpay-invoice-pdf
└── betterpay-analytics
```

---

## Final Verdict

### Better Auth is the Gold Standard for Framework Architecture

Better Auth unggul di hampir semua aspek **infrastructure dan maintainability**:
- ✅ Plugin system yang mature dan extensible
- ✅ Multi-DB adapter pattern
- ✅ Security-first approach
- ✅ Testing infrastructure yang comprehensive
- ✅ CI/CD pipeline yang production-grade
- ✅ Multi-framework client support
- ✅ Community ecosystem

### BetterPay (PayKit) is Domain-Superior for Billing

BetterPay/PayKit unggul di **domain depth**:
- ✅ Provider abstraction yang comprehensive (20+ methods)
- ✅ Normalized webhook events + action system
- ✅ Entitlement engine dengan lazy reset + stacked deductions
- ✅ Subscription state machine yang complex
- ✅ Webhook idempotency pipeline
- ✅ Plan/Feature DSL yang elegant

### Recommendation: Hybrid Architecture for BetterPay

**Adopt from Better Auth:**
1. 🔴 Plugin system (full rewrite — current is too basic)
2. 🔴 Security patterns (rate limiting, API key auth)
3. 🔴 Testing infrastructure (test instance pattern, Docker Compose)
4. 🟡 CI/CD pipeline (lint → typecheck → test → e2e)
5. 🟡 Client framework adapters (React first)
6. 🟡 Biome linter (replace oxlint + oxfmt)
7. 🟡 Supply-chain defense (`minimumReleaseAge`, `overrides`)
8. 🟢 Dead code detection (knip)
9. 🟢 Package validation (publint + attw)

**Keep from PayKit:**
1. ✅ Provider abstraction (`PaymentProvider` interface)
2. ✅ Normalized webhook events
3. ✅ Entitlement engine
4. ✅ Subscription state machine
5. ✅ Plan/Feature DSL
6. ✅ Webhook pipeline with idempotency
7. ✅ Product sync service
8. ✅ Database schema (evolve to support multi-provider mapping tables)

### Proposed Architecture Doc Structure

```
ARCHITECTURE.md (restructured)
├── Part 1: Infrastructure (from Better Auth)
│   ├── Monorepo setup
│   ├── CI/CD pipeline
│   ├── Testing strategy
│   └── Security patterns
├── Part 2: Plugin System (from Better Auth, adapted)
│   ├── Plugin interface
│   ├── Plugin registry
│   ├── Schema contribution
│   └── Hook system
├── Part 3: Provider Layer (from PayKit — keep)
│   ├── PaymentProvider interface
│   ├── Provider registry
│   ├── Normalized events
│   └── Webhook pipeline
├── Part 4: Domain Model (from PayKit — keep)
│   ├── Plan/Feature DSL
│   ├── Subscription state machine
│   ├── Entitlement engine
│   └── Product sync
├── Part 5: Indonesian Extensions (original)
│   ├── Payment link recurring
│   ├── Notification system
│   ├── Dunning
│   ├── QRIS
│   └── Settlement reconciliation
└── Part 6: Client & Dashboard
    ├── Multi-framework client
    ├── Checkout page
    └── Admin dashboard
```

---

## Action Items

### Immediate (Before Any Code)

- [ ] Rewrite plugin interface based on Better Auth's pattern
- [ ] Add rate limiting to API design
- [ ] Plan test infrastructure (test instance + Docker Compose)
- [ ] Set up Biome + knip + publint
- [ ] Add `minimumReleaseAge` and `overrides` to workspace

### Before First Release

- [ ] Implement adapter interface (pg + memory)
- [ ] Build React client hooks
- [ ] Add OpenAPI spec generation
- [ ] CI pipeline (lint → typecheck → test → e2e)
- [ ] Security audit prep

### Post-Launch

- [ ] Plugin registry for community
- [ ] Vue/Svelte client adapters
- [ ] Additional DB adapters (MySQL)
- [ ] OpenTelemetry tracing (from Better Auth's instrumentation)

---

*Comparison based on: Better Auth v1.6.15 vs BetterPay ARCHITECTURE.md v1.0.0*
*Date: 2026-06-10*
