import { describe, it, expect } from 'vitest';
import {
  detectEndpointConflicts,
  validateEndpointPatterns,
  generateEndpointDocs,
  type EndpointDefinition,
} from '../../src/utils/endpoint-conflict';

describe('Endpoint Conflict Detection', () => {
  describe('detectEndpointConflicts', () => {
    it('should detect no conflicts when endpoints are unique', () => {
      const endpoints: EndpointDefinition[] = [
        { path: '/api/subscribe', method: 'POST', source: 'core' },
        { path: '/api/check', method: 'POST', source: 'core' },
        { path: '/api/report', method: 'POST', source: 'core' },
      ];

      const conflicts = detectEndpointConflicts(endpoints);
      expect(conflicts).toHaveLength(0);
    });

    it('should detect conflicts when same endpoint from different sources', () => {
      const endpoints: EndpointDefinition[] = [
        { path: '/api/subscribe', method: 'POST', source: 'core' },
        { path: '/api/subscribe', method: 'POST', source: 'plugin' },
      ];

      const conflicts = detectEndpointConflicts(endpoints);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].path).toBe('/api/subscribe');
      expect(conflicts[0].method).toBe('POST');
      expect(conflicts[0].sources).toContain('core');
      expect(conflicts[0].sources).toContain('plugin');
    });

    it('should not detect conflicts when same endpoint from same source', () => {
      const endpoints: EndpointDefinition[] = [
        { path: '/api/subscribe', method: 'POST', source: 'core' },
        { path: '/api/subscribe', method: 'POST', source: 'core' },
      ];

      const conflicts = detectEndpointConflicts(endpoints);
      expect(conflicts).toHaveLength(0);
    });

    it('should detect multiple conflicts', () => {
      const endpoints: EndpointDefinition[] = [
        { path: '/api/subscribe', method: 'POST', source: 'core' },
        { path: '/api/subscribe', method: 'POST', source: 'plugin' },
        { path: '/api/check', method: 'POST', source: 'core' },
        { path: '/api/check', method: 'POST', source: 'user' },
      ];

      const conflicts = detectEndpointConflicts(endpoints);
      expect(conflicts).toHaveLength(2);
    });

    it('should not conflict on different methods', () => {
      const endpoints: EndpointDefinition[] = [
        { path: '/api/subscription', method: 'GET', source: 'core' },
        { path: '/api/subscription', method: 'POST', source: 'plugin' },
      ];

      const conflicts = detectEndpointConflicts(endpoints);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('validateEndpointPatterns', () => {
    it('should validate correct endpoint patterns', () => {
      const endpoints: EndpointDefinition[] = [
        { path: '/api/subscribe', method: 'POST', source: 'core' },
        { path: '/api/check', method: 'POST', source: 'core' },
        { path: '/api/users/:id', method: 'GET', source: 'core' },
      ];

      const result = validateEndpointPatterns(endpoints);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect paths not starting with /', () => {
      const endpoints: EndpointDefinition[] = [
        { path: 'api/subscribe', method: 'POST', source: 'core' },
      ];

      const result = validateEndpointPatterns(endpoints);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Endpoint path must start with /: api/subscribe');
    });

    it('should detect duplicate slashes', () => {
      const endpoints: EndpointDefinition[] = [
        { path: '/api//subscribe', method: 'POST', source: 'core' },
      ];

      const result = validateEndpointPatterns(endpoints);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Endpoint path contains duplicate slashes: /api//subscribe');
    });

    it('should detect trailing slashes', () => {
      const endpoints: EndpointDefinition[] = [
        { path: '/api/subscribe/', method: 'POST', source: 'core' },
      ];

      const result = validateEndpointPatterns(endpoints);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Endpoint path should not end with /: /api/subscribe/');
    });

    it('should allow root path with trailing slash', () => {
      const endpoints: EndpointDefinition[] = [
        { path: '/', method: 'GET', source: 'core' },
      ];

      const result = validateEndpointPatterns(endpoints);
      expect(result.valid).toBe(true);
    });

    it('should detect invalid HTTP methods', () => {
      const endpoints: EndpointDefinition[] = [
        { path: '/api/subscribe', method: 'INVALID' as any, source: 'core' },
      ];

      const result = validateEndpointPatterns(endpoints);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid HTTP method: INVALID');
    });

    it('should detect multiple errors', () => {
      const endpoints: EndpointDefinition[] = [
        { path: 'api//subscribe/', method: 'POST', source: 'core' },
      ];

      const result = validateEndpointPatterns(endpoints);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('generateEndpointDocs', () => {
    it('should generate documentation grouped by source', () => {
      const endpoints: EndpointDefinition[] = [
        { path: '/api/subscribe', method: 'POST', source: 'core' },
        { path: '/api/check', method: 'POST', source: 'core' },
        { path: '/api/webhook/midtrans', method: 'POST', source: 'plugin' },
      ];

      const docs = generateEndpointDocs(endpoints);
      
      expect(docs).toContain('# API Endpoints');
      expect(docs).toContain('## Core Endpoints');
      expect(docs).toContain('## Plugin Endpoints');
      expect(docs).toContain('`/api/subscribe`');
      expect(docs).toContain('`/api/webhook/midtrans`');
    });

    it('should sort endpoints by path', () => {
      const endpoints: EndpointDefinition[] = [
        { path: '/api/subscribe', method: 'POST', source: 'core' },
        { path: '/api/check', method: 'POST', source: 'core' },
        { path: '/api/report', method: 'POST', source: 'core' },
      ];

      const docs = generateEndpointDocs(endpoints);
      
      const checkIndex = docs.indexOf('`/api/check`');
      const reportIndex = docs.indexOf('`/api/report`');
      const subscribeIndex = docs.indexOf('`/api/subscribe`');
      
      expect(checkIndex).toBeLessThan(reportIndex);
      expect(reportIndex).toBeLessThan(subscribeIndex);
    });

    it('should include method and source in table', () => {
      const endpoints: EndpointDefinition[] = [
        { path: '/api/subscribe', method: 'POST', source: 'core' },
      ];

      const docs = generateEndpointDocs(endpoints);
      
      expect(docs).toContain('| Method | Path | Source |');
      expect(docs).toContain('| POST | `/api/subscribe` | core |');
    });
  });
});
