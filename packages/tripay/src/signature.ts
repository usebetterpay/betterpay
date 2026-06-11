import crypto from 'crypto';

/**
 * Generate signature for Tripay transaction creation
 *
 * @param merchantCode - Merchant code from Tripay
 * @param merchantRef - Merchant reference/invoice number
 * @param amount - Transaction amount
 * @param privateKey - Private key from Tripay
 * @returns HMAC-SHA256 signature
 */
export function generateTransactionSignature(
  merchantCode: string,
  merchantRef: string,
  amount: number,
  privateKey: string
): string {
  const stringToSign = `${merchantCode}${merchantRef}${amount}`;
  return crypto
    .createHmac('sha256', privateKey)
    .update(stringToSign)
    .digest('hex');
}

/**
 * Generate signature for Tripay open payment creation
 *
 * @param merchantCode - Merchant code from Tripay
 * @param channel - Payment channel code
 * @param merchantRef - Merchant reference
 * @param privateKey - Private key from Tripay
 * @returns HMAC-SHA256 signature
 */
export function generateOpenPaymentSignature(
  merchantCode: string,
  channel: string,
  merchantRef: string,
  privateKey: string
): string {
  const stringToSign = `${merchantCode}${channel}${merchantRef}`;
  return crypto
    .createHmac('sha256', privateKey)
    .update(stringToSign)
    .digest('hex');
}

/**
 * Generate signature for Tripay callback verification
 *
 * @param payload - Raw JSON payload from callback
 * @param privateKey - Private key from Tripay
 * @returns HMAC-SHA256 signature
 */
export function generateCallbackSignature(
  payload: string,
  privateKey: string
): string {
  return crypto
    .createHmac('sha256', privateKey)
    .update(payload)
    .digest('hex');
}

/**
 * Verify Tripay callback signature
 *
 * @param payload - Raw JSON payload from callback
 * @param receivedSignature - Signature from X-Callback-Signature header
 * @param privateKey - Private key from Tripay
 * @returns True if signature is valid
 */
export function verifyCallbackSignature(
  payload: string,
  receivedSignature: string,
  privateKey: string
): boolean {
  const expectedSignature = generateCallbackSignature(payload, privateKey);
  
  // Use timing-safe comparison to prevent timing attacks
  if (expectedSignature.length !== receivedSignature.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  );
}
