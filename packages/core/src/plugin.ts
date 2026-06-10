import type { PayContext } from './context';

// ── Endpoint & Middleware stubs ────────────────────────────────────────────
export interface PayEndpoint {
  [key: string]: unknown;
}

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
export interface BetterPayPlugin {
  id: string;
  version?: string;

  // Lifecycle
  init?: (ctx: PayContext) => Promise<void>;

  // HTTP
  endpoints?: Record<string, PayEndpoint>;
  middlewares?: Array<{ path: string; middleware: PayMiddleware }>;
  onRequest?: (req: Request, ctx: PayContext) => Promise<{ response: Response } | void>;
  onResponse?: (res: Response, ctx: PayContext) => Promise<void>;

  // Hooks
  hooks?: {
    before?: Array<{ matcher: (ctx: HookContext) => boolean; handler: PayMiddleware }>;
    after?: Array<{ matcher: (ctx: HookContext) => boolean; handler: PayMiddleware }>;
  };

  // Database
  schema?: Record<string, unknown>;
  migrations?: Record<string, unknown>;

  // Provider
  providers?: unknown[];
  defaultProvider?: string;

  // Notifications
  notificationChannels?: unknown[];

  // Rate Limiting
  rateLimit?: Array<{
    window: number;
    max: number;
    pathMatcher: (path: string) => boolean;
  }>;

  // Type Safety
  $ERROR_CODES?: Record<string, RawError>;
  $Infer?: Record<string, unknown>;
}
