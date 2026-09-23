import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../src/server.js';

/**
 * /api/describe runs Amazon Bedrock on the operator's AWS account. With
 * `Access-Control-Allow-Origin: *` any web page could drive it. A foreign
 * origin must be refused BEFORE the route runs - so no inference, no cost.
 */
const EVIL = 'https://evil.example';
let server: http.Server;
let port = 0;

function request(method: string, p: string, o: { origin?: string; host?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }>((resolve, reject) => {
    const payload = o.body === undefined ? undefined : JSON.stringify(o.body);
    const headers: Record<string, string> = { ...(o.headers || {}) };
    if (o.origin) headers.Origin = o.origin;
    if (o.host) headers.Host = o.host;
    if (payload !== undefined) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload).toString();
    }
    const req = http.request({ host: '127.0.0.1', port, method, path: p, headers }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, body: d }));
    });
    req.on('error', reject);
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

describe('Cross-origin guard (Bedrock-spending routes)', () => {
  before(async () => {
    server = http.createServer(createServer());
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    port = (server.address() as { port: number }).port;
  });
  after(async () => {
    await new Promise<void>((r) => server.close(() => r()));
  });

  it('refuses a foreign-origin describe call before any inference runs', async () => {
    const t0 = Date.now();
    const res = await request('POST', '/api/describe', { origin: EVIL, body: { scenarioId: 'pitch_black_unusable' } });
    assert.equal(res.status, 403, `got ${res.status}`);
    assert.equal(JSON.parse(res.body).code, 'ORIGIN_NOT_ALLOWED');
    assert.ok(Date.now() - t0 < 1000, 'a refused request must not have waited on a model call');
  });

  it('refuses a foreign-origin webhook injection', async () => {
    const res = await request('POST', '/api/webhook', { origin: EVIL, body: {} });
    assert.equal(res.status, 403);
  });

  it('grants no CORS header to a foreign origin on preflight', async () => {
    const res = await request('OPTIONS', '/api/describe', { origin: EVIL, headers: { 'Access-Control-Request-Method': 'POST' } });
    assert.ok(!res.headers['access-control-allow-origin']);
  });

  it('refuses a DNS-rebinding Host header', async () => {
    const res = await request('GET', '/api/samples', { host: 'evil.example:3002' });
    assert.equal(res.status, 403);
  });

  it('serves the dev surface origin, the same origin, and non-browser callers', async () => {
    const dev = await request('GET', '/api/samples', { origin: 'http://127.0.0.1:5174' });
    assert.equal(dev.status, 200);
    assert.equal(dev.headers['access-control-allow-origin'], 'http://127.0.0.1:5174');

    const same = await request('GET', '/api/samples', { origin: `http://127.0.0.1:${port}` });
    assert.equal(same.status, 200, 'the built surface is served by this process and must reach its own API');

    const curl = await request('GET', '/api/samples');
    assert.equal(curl.status, 200);
  });
});

describe('Service entrypoint binding', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const entry = fs.readFileSync(path.join(here, '..', 'src', 'index.ts'), 'utf8');
  it('binds loopback by default, never every interface', () => {
    assert.match(entry, /\.listen\(\s*port\s*,\s*HOST\s*,/);
    assert.match(entry, /const HOST = process\.env\.HOST \|\| '127\.0\.0\.1'/);
    assert.doesNotMatch(entry, /\.listen\(\s*port\s*,\s*\(\)/);
  });
});
