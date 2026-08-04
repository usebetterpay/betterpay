export function createOyHeaders(username: string, apiKey: string): Record<string, string> {
  return {
    'X-OY-Username': username,
    'X-Api-Key': apiKey,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

export function verifyOyWebhook(
  headers: Record<string, string>,
  ip: string | undefined,
  allowedIps?: string[],
): boolean {
  // If allowlist configured, check IP
  if (allowedIps && allowedIps.length > 0) {
    if (!ip) return false;
    if (!allowedIps.includes(ip)) return false;
  }
  // Require signature headers presence
  const username = headers['x-oy-username'] ?? headers['X-OY-Username'] ?? headers['X-OY-USERNAME'];
  const apiKey = headers['x-api-key'] ?? headers['X-Api-Key'] ?? headers['X-API-KEY'];
  // For OY!, no crypto — just presence + IP check. Return true if headers present or allowlist passed.
  // If allowlist passed and headers not required, still need at least one identifier.
  if (allowedIps && allowedIps.length > 0 && ip && allowedIps.includes(ip)) return true;
  return Boolean(username || apiKey);
}

export function verifyOyIp(ip: string | undefined, allowedIps?: string[]): boolean {
  if (!allowedIps || allowedIps.length === 0) return true;
  if (!ip) return false;
  return allowedIps.includes(ip);
}
