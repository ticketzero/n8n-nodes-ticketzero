import { createHmac, timingSafeEqual } from 'crypto';

export interface VerifyInput {
  /** The secret returned when the subscription was created. */
  secret: string;
  /** Header `X-SG-Signature`, form `sha256=<hex>`. */
  signatureHeader: string;
  /** Header `X-SG-Timestamp` (Unix seconds as a string). */
  timestamp: string;
  /** RAW request body (exactly the bytes sent by the server, as a string). */
  rawBody: string;
  /** Current time in Unix seconds (injected for testability). */
  nowSeconds: number;
  /** Replay tolerance in seconds (default 300 = ±5 min). */
  toleranceSec?: number;
}

export type VerifyResult = { ok: true } | { ok: false; reason: string };

/**
 * Verifies a TicketZero webhook signature.
 *
 * Must match the server signing EXACTLY
 * (apps/api/src/runtime/scheduler/webhook-delivery.service.ts):
 *   signature = "sha256=" + HMAC_SHA256(secret, `${timestamp}.${rawBody}`).hex
 * plus replay protection via the timestamp (±toleranceSec).
 *
 * Pure (no n8n context) -> unit-testable.
 */
export function verifyTicketZeroSignature(input: VerifyInput): VerifyResult {
  const tolerance = input.toleranceSec ?? 300;
  const ts = Number(input.timestamp);
  const now = input.nowSeconds;
  if (!Number.isFinite(ts) || Math.abs(now - ts) > tolerance) {
    return { ok: false, reason: 'stale_or_missing_timestamp' };
  }

  const expected = `sha256=${createHmac('sha256', input.secret)
    .update(`${input.timestamp}.${input.rawBody}`)
    .digest('hex')}`;
  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(input.signatureHeader, 'utf8');
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return { ok: false, reason: 'invalid_signature' };
  }
  return { ok: true };
}
