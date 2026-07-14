import type { PayContext } from './context';
import type { NotificationChannel } from './notification/channel';

// ── Endpoint & Middleware ──────────────────────────────────────────────────
/** better-call endpoint instance (from createEndpoint). */
export type PayEndpoint = unknown;

export type PayMiddleware = (ctx: PayContext) => Promise<void>;

export interface HookContext {
  path: string;
  method: string;
  [key: string]: unknown;
}

export interface RawError {
  code: string;
  message: string;
}

// ── Plugin interface ───────────────────────────────────────────────────────
/**
 * Plugin contract for betterPay({ plugins }).
 *
 * Wired today:
 * - `providers` — payment adapters
 * - `notificationChannels` — event dispatch
 * - `endpoints` — merged into the HTTP router (better-call endpoints)
 * - `onRequest` / `onResponse` — run around the main handler
 * - `$Infer` / `$ERROR_CODES` — billing bridge + errors
 *
 * Not wired (do not rely on these):
 * - `hooks`, `middlewares`, `schema`, `migrations`, `rateLimit`
 */
export interface BetterPayPlugin {
  id: string;
  version?: string;

  /** Optional async init (not called by factory yet). */
  init?: (ctx: PayContext) => Promise<void>;

  /**
   * Extra better-call endpoints merged into the router.
   * Keys must not collide with core routes (webhook, createTransaction, …).
   */
  endpoints?: Record<string, PayEndpoint>;

  /** Run before the router handles the request. Return a Response to short-circuit. */
  onRequest?: (req: Request, ctx: PayContext) => Promise<{ response: Response } | void>;

  /** Run after a successful router response (best-effort). */
  onResponse?: (res: Response, ctx: PayContext) => Promise<void>;

  /**
   * @deprecated Not merged by the factory. Use options.middleware or onRequest.
   */
  middlewares?: Array<{ path: string; middleware: PayMiddleware }>;

  /**
   * @deprecated Not merged by the factory.
   */
  hooks?: {
    before?: Array<{ matcher: (ctx: HookContext) => boolean; handler: PayMiddleware }>;
    after?: Array<{ matcher: (ctx: HookContext) => boolean; handler: PayMiddleware }>;
  };

  /**
   * @deprecated Schema/migrations are owned by @betterpay/drizzle-adapter + your app.
   */
  schema?: Record<string, unknown>;
  /**
   * @deprecated
   */
  migrations?: Record<string, unknown>;

  providers?: unknown[];
  defaultProvider?: string;

  /** Channels collected and used by NotificationDispatcher. */
  notificationChannels?: NotificationChannel[];

  /**
   * @deprecated Use betterPay({ rateLimit }) instead.
   */
  rateLimit?: Array<{
    window: number;
    max: number;
    pathMatcher: (path: string) => boolean;
  }>;

  $ERROR_CODES?: Record<string, RawError>;
  $Infer?: Record<string, unknown>;
}
