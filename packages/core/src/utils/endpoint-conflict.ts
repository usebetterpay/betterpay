/**
 * Endpoint Conflict Detection
 * 
 * Detects conflicts between plugin endpoints and built-in endpoints.
 * Inspired by Better Auth's endpoint conflict detection.
 */

export interface EndpointDefinition {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  source: string; // 'core' | 'plugin' | 'user'
}

export interface EndpointConflict {
  path: string;
  method: string;
  sources: string[];
  message: string;
}

/**
 * Detect conflicts between endpoints
 */
export function detectEndpointConflicts(endpoints: EndpointDefinition[]): EndpointConflict[] {
  const conflicts: EndpointConflict[] = [];
  const endpointMap = new Map<string, EndpointDefinition[]>();

  // Group endpoints by path+method
  for (const endpoint of endpoints) {
    const key = `${endpoint.method}:${endpoint.path}`;
    if (!endpointMap.has(key)) {
      endpointMap.set(key, []);
    }
    endpointMap.get(key)!.push(endpoint);
  }

  // Find conflicts (multiple sources for same endpoint)
  for (const [key, endpointGroup] of endpointMap) {
    if (endpointGroup.length > 1) {
      const sources = endpointGroup.map(e => e.source);
      const uniqueSources = [...new Set(sources)];
      
      // Only report as conflict if from different sources
      if (uniqueSources.length > 1) {
        const [method, path] = key.split(':');
        conflicts.push({
          path: path!,
          method: method!,
          sources: uniqueSources,
          message: `Endpoint ${method} ${path} is defined by multiple sources: ${uniqueSources.join(', ')}`,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Validate endpoint patterns
 */
export function validateEndpointPatterns(endpoints: EndpointDefinition[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (const endpoint of endpoints) {
    // Check path format
    if (!endpoint.path.startsWith('/')) {
      errors.push(`Endpoint path must start with /: ${endpoint.path}`);
    }

    // Check for duplicate slashes
    if (endpoint.path.includes('//')) {
      errors.push(`Endpoint path contains duplicate slashes: ${endpoint.path}`);
    }

    // Check for trailing slash (except root)
    if (endpoint.path !== '/' && endpoint.path.endsWith('/')) {
      errors.push(`Endpoint path should not end with /: ${endpoint.path}`);
    }

    // Check method
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    if (!validMethods.includes(endpoint.method)) {
      errors.push(`Invalid HTTP method: ${endpoint.method}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate endpoint documentation
 */
export function generateEndpointDocs(endpoints: EndpointDefinition[]): string {
  const grouped = new Map<string, EndpointDefinition[]>();

  // Group by source
  for (const endpoint of endpoints) {
    if (!grouped.has(endpoint.source)) {
      grouped.set(endpoint.source, []);
    }
    grouped.get(endpoint.source)!.push(endpoint);
  }

  let docs = '# API Endpoints\n\n';

  for (const [source, endpointGroup] of grouped) {
    docs += `## ${source.charAt(0).toUpperCase() + source.slice(1)} Endpoints\n\n`;
    docs += '| Method | Path | Source |\n';
    docs += '|--------|------|--------|\n';

    for (const endpoint of endpointGroup.sort((a, b) => a.path.localeCompare(b.path))) {
      docs += `| ${endpoint.method} | \`${endpoint.path}\` | ${endpoint.source} |\n`;
    }

    docs += '\n';
  }

  return docs;
}
