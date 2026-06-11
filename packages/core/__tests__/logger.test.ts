import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Logger, createLogger, createLoggerMiddleware } from '../src/logging/logger';

describe('Logger', () => {
  let logger: Logger;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logger = createLogger({ level: 'debug', pretty: false });
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('basic logging', () => {
    it('should log info message', () => {
      logger.info('Test message');

      expect(consoleSpy).toHaveBeenCalled();
      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output.level).toBe('INFO');
      expect(output.message).toBe('Test message');
      expect(output.timestamp).toBeDefined();
    });

    it('should log with data', () => {
      logger.info('Test', { userId: '123', action: 'login' });

      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output.userId).toBe('123');
      expect(output.action).toBe('login');
    });

    it('should respect log level', () => {
      const warnLogger = createLogger({ level: 'warn', pretty: false });
      warnLogger.debug('Debug message');
      warnLogger.info('Info message');

      expect(consoleSpy).not.toHaveBeenCalled();

      warnLogger.warn('Warn message');
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it('should log all levels', () => {
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');

      expect(consoleSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('context scoping', () => {
    it('should include context in logs', () => {
      logger.runWithContext({ requestId: 'req_123', userId: 'user_456' }, () => {
        logger.info('Test message');
      });

      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output.requestId).toBe('req_123');
      expect(output.userId).toBe('user_456');
    });

    it('should isolate context between runs', () => {
      logger.runWithContext({ requestId: 'req_1' }, () => {
        logger.info('First');
      });

      logger.runWithContext({ requestId: 'req_2' }, () => {
        logger.info('Second');
      });

      const output1 = JSON.parse(consoleSpy.mock.calls[0][0]);
      const output2 = JSON.parse(consoleSpy.mock.calls[1][0]);

      expect(output1.requestId).toBe('req_1');
      expect(output2.requestId).toBe('req_2');
    });

    it('should get current context', () => {
      logger.runWithContext({ requestId: 'req_123' }, () => {
        const context = logger.getContext();
        expect(context.requestId).toBe('req_123');
      });
    });

    it('should update context', () => {
      logger.runWithContext({ requestId: 'req_123' }, () => {
        logger.updateContext({ userId: 'user_456' });
        logger.info('Test');
      });

      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output.requestId).toBe('req_123');
      expect(output.userId).toBe('user_456');
    });
  });

  describe('sensitive data redaction', () => {
    it('should redact password', () => {
      logger.info('Login', { username: 'user', password: 'secret123' });

      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output.username).toBe('user');
      expect(output.password).toBe('[REDACTED]');
    });

    it('should redact apiKey', () => {
      logger.info('API call', { apiKey: 'sk_test_123' });

      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output.apiKey).toBe('[REDACTED]');
    });

    it('should redact custom paths', () => {
      const customLogger = createLogger({
        level: 'info',
        pretty: false,
        redactPaths: ['ssn', 'creditCard'],
      });

      customLogger.info('Data', { ssn: '123-45-6789', creditCard: '4111', name: 'John' });

      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output.ssn).toBe('[REDACTED]');
      expect(output.creditCard).toBe('[REDACTED]');
      expect(output.name).toBe('John');
    });
  });

  describe('child logger', () => {
    it('should inherit parent context', () => {
      logger.runWithContext({ requestId: 'req_123' }, () => {
        const child = logger.child({ module: 'billing' });
        child.info('Test');

        const output = JSON.parse(consoleSpy.mock.calls[0][0]);
        expect(output.requestId).toBe('req_123');
        expect(output.module).toBe('billing');
      });
    });
  });
});

describe('createLoggerMiddleware', () => {
  it('should create middleware function', () => {
    const logger = createLogger();
    const middleware = createLoggerMiddleware(logger);
    expect(typeof middleware).toBe('function');
  });

  it('should add request context', () => {
    const logger = createLogger({ level: 'info', pretty: false });
    const middleware = createLoggerMiddleware(logger);

    const req = {
      method: 'POST',
      path: '/api/transactions',
      headers: { 'x-request-id': 'req_123' },
      ip: '127.0.0.1',
    };

    const res = {
      on: vi.fn(),
      statusCode: 200,
    };

    const next = vi.fn();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    const output = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(output.requestId).toBe('req_123');
    expect(output.method).toBe('POST');
    expect(output.path).toBe('/api/transactions');

    consoleSpy.mockRestore();
  });
});
