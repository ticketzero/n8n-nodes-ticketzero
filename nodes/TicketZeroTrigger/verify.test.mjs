// Interop-Test: beweist, dass die Signatur, die der TicketZero-Server erzeugt,
// von der Node-Verifikation akzeptiert wird — und Manipulationen abgelehnt.
//
// „Server-Signieren" spiegelt exakt
// apps/api/src/runtime/scheduler/webhook-delivery.service.ts:
//   signature = "sha256=" + HMAC_SHA256(secret, `${timestamp}.${body}`).hex
//
// Lauf: npm test  (baut vorher via pretest -> importiert dist/…/verify.js)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

import { verifyTicketZeroSignature } from '../../dist/nodes/TicketZeroTrigger/verify.js';

const SECRET = 'sg_whsec_' + 'a'.repeat(64);
const NOW = 1_800_000_000; // fixe „jetzt"-Zeit (Unix-Sek.), deterministisch

/** Spiegelt das Server-Signieren (webhook-delivery.service.ts). */
function serverSign(secret, timestamp, body) {
  return `sha256=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;
}

const body = JSON.stringify({
  id: '11111111-1111-1111-1111-111111111111',
  type: 'message.received',
  occurred_at: '2026-07-23T10:00:00.000Z',
  data: { conversation_id: 'c1', body: 'Hallo €½ mit Umlaut äöü' },
});

test('gültige Server-Signatur wird akzeptiert', () => {
  const timestamp = String(NOW);
  const res = verifyTicketZeroSignature({
    secret: SECRET,
    signatureHeader: serverSign(SECRET, timestamp, body),
    timestamp,
    rawBody: body,
    nowSeconds: NOW,
  });
  assert.deepEqual(res, { ok: true });
});

test('verändertes Body wird abgelehnt (invalid_signature)', () => {
  const timestamp = String(NOW);
  const res = verifyTicketZeroSignature({
    secret: SECRET,
    signatureHeader: serverSign(SECRET, timestamp, body),
    timestamp,
    rawBody: body + ' ', // 1 Byte anders
    nowSeconds: NOW,
  });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'invalid_signature');
});

test('falsches Secret wird abgelehnt', () => {
  const timestamp = String(NOW);
  const res = verifyTicketZeroSignature({
    secret: SECRET,
    signatureHeader: serverSign('sg_whsec_' + 'b'.repeat(64), timestamp, body),
    timestamp,
    rawBody: body,
    nowSeconds: NOW,
  });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'invalid_signature');
});

test('zu alter Timestamp (>5min) wird abgelehnt (Replay-Schutz)', () => {
  const oldTs = NOW - 400; // 400s alt > 300s Toleranz
  const timestamp = String(oldTs);
  const res = verifyTicketZeroSignature({
    secret: SECRET,
    signatureHeader: serverSign(SECRET, timestamp, body),
    timestamp,
    rawBody: body,
    nowSeconds: NOW,
  });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'stale_or_missing_timestamp');
});

test('Timestamp knapp innerhalb der Toleranz wird akzeptiert', () => {
  const ts = NOW - 299;
  const timestamp = String(ts);
  const res = verifyTicketZeroSignature({
    secret: SECRET,
    signatureHeader: serverSign(SECRET, timestamp, body),
    timestamp,
    rawBody: body,
    nowSeconds: NOW,
  });
  assert.deepEqual(res, { ok: true });
});

test('nicht-numerischer / fehlender Timestamp wird abgelehnt', () => {
  const res = verifyTicketZeroSignature({
    secret: SECRET,
    signatureHeader: 'sha256=deadbeef',
    timestamp: '',
    rawBody: body,
    nowSeconds: NOW,
  });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'stale_or_missing_timestamp');
});

test('leerer Signatur-Header wird abgelehnt', () => {
  const timestamp = String(NOW);
  const res = verifyTicketZeroSignature({
    secret: SECRET,
    signatureHeader: '',
    timestamp,
    rawBody: body,
    nowSeconds: NOW,
  });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'invalid_signature');
});
