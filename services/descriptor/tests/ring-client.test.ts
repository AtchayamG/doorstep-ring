import test from 'node:test';
import assert from 'node:assert';
import { RingPartnerClient } from '../src/ring-client.js';

test('Ring Client: Proves honest 401 and playground URL when no token configured', async () => {
  const client = new RingPartnerClient(''); // Explicit empty token
  assert.strictEqual(client.hasToken, false);
  assert.strictEqual(client.redactedToken, '(none)');

  const status = await client.checkTokenStatus();
  assert.strictEqual(status.valid, false);
  assert.strictEqual(status.httpStatus, 401);
  assert.strictEqual(status.statusText, 'Unauthorized');
  assert.strictEqual(status.playgroundUrl, 'https://developer.amazon.com/ring/console/playground');
  assert.ok(status.message.includes('Developers Playground'));
});

test('Ring Client: Handles custom base URL and token redaction', () => {
  const testToken = 'SANDBOX_TOKEN_SECRET_998877665544332211';
  const client = new RingPartnerClient(testToken, 'https://api.amazonvision.com/v1/');
  assert.strictEqual(client.hasToken, true);
  assert.ok(client.redactedToken.startsWith('SAND...'));
  assert.ok(client.redactedToken.endsWith('2211'));
  assert.ok(!client.redactedToken.includes('SECRET_998877'));
});
