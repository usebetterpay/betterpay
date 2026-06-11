// Structured Logging with Request Scoping
// Provides consistent, traceable logging across requests

import { AsyncLocalStorage } from 'async_hooks';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

export interface LoggerConfig {
  level: LogLevel;
  pretty?: boolean;
  redactPaths?: string[]; // JSON paths to redact (e.g., ['password', 'apiKey'])
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private contextStorage = new AsyncLocalStorage<LogContext>();
  private config: LoggerConfig;
  private baseContext: LogContext = {};

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: config.level || 'info',
      pretty: config.pretty ?? process.env.NODE_ENV !== 'production',
      redactPaths: config.redactPaths || ['password', 'apiKey', 'secret', 'token'],
    };
  }

  /**
   * Run function with log context.
   */
  runWithContext<T>(context: LogContext, fn: () => T): T {
    return this.contextStorage.run(context, fn);
  }

  /**
   * Get current log context.
   */
  getContext(): LogContext {
    return { ...this.baseContext, ...(this.contextStorage.getStore() || {}) };
  }

  /**
   * Update current log context.
   */
  updateContext(updates: Partial<LogContext>): void {
    const store = this.contextStorage.getStore();
    if (store) {
      Object.assign(store, updates);
    }
  }

  /**
   * Log debug message.
   */
  debug(message: string, data?: Record<string, any>): void {
    this.log('debug', message, data);
  }

  /**
   * Log info message.
   */
  info(message: string, data?: Record<string, any>): void {
    this.log('info', message, data);
  }

  /**
   * Log warning message.
   */
  warn(message: string, data?: Record<string, any>): void {
    this.log('warn', message, data);
  }

  /**
   * Log error message.
   */
  error(message: string, data?: Record<string, any>): void {
    this.log('error', message, data);
  }

  /**
   * Create child logger with additional context.
   */
  child(additionalContext: LogContext): Logger {
    const childLogger = new Logger(this.config);
    const parentContext = this.getContext();
    childLogger.baseContext = { ...parentContext, ...additionalContext };
    return childLogger;
  }

  private log(level: LogLevel, message: string, data?: Record<string, any>): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.level]) {
      return;
    }

    const context = this.getContext();
    const timestamp = new Date().toISOString();

    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...context,
      ...this.redactSensitiveData(data || {}),
    };

    if (this.config.pretty) {
      this.prettyPrint(logEntry);
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  private prettyPrint(entry: Record<string, any>): void {
    const { timestamp, level, message, ...rest } = entry;
    const levelColor = this.getLevelColor(level);
    const contextStr = Object.keys(rest).length > 0 
      ? ' ' + JSON.stringify(rest, null, 2)
      : '';

    console.log(`${timestamp} ${levelColor}[${level}]${'\x1b[0m'} ${message}${contextStr}`);
  }

  private getLevelColor(level: string): string {
    const colors: Record<string, string> = {
      DEBUG: '\x1b[36m',  // Cyan
      INFO: '\x1b[32m',   // Green
      WARN: '\x1b[33m',   // Yellow
      ERROR: '\x1b[31m',  // Red
    };
    return colors[level] || '\x1b[0m';
  }

  private redactSensitiveData(data: Record<string, any>): Record<string, any> {
    const redacted = { ...data };

    for (const path of this.config.redactPaths!) {
      if (path in redacted) {
        redacted[path] = '[REDACTED]';
      }
    }

    return redacted;
  }
}

/**
 * Create logger instance.
 */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}

/**
 * Create request-scoped logger middleware for Express/Fastify/Hono.
 */
export function createLoggerMiddleware(logger: Logger) {
  return (req: any, res: any, next: any) => {
    const requestId = req.headers['x-request-id'] || 
                      req.headers['x-correlation-id'] || 
                      generateRequestId();
    
    const context: LogContext = {
      requestId,
      method: req.method,
      path: req.path || req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
    };

    const startTime = Date.now();

    logger.runWithContext(context, () => {
      logger.info('Request started');

      // Log response when finished
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.info('Request completed', {
          statusCode: res.statusCode,
          duration,
        });
      });

      next();
    });
  };
}

/**
 * Generate unique request ID.
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create error logging middleware.
 */
export function createErrorLogger(logger: Logger) {
  return (error: Error, _req: any, res: any, _next: any) => {
    const context = logger.getContext();
    
    logger.error('Unhandled error', {
      error: error.message,
      stack: error.stack,
      ...context,
    });

    res.status(500).json({
      error: 'Internal server error',
      requestId: context.requestId,
    });
  };
}
