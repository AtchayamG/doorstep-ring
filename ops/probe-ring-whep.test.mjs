import assert from 'node:assert/strict';
import { test } from 'node:test';
import { probeRingWhep, probeSnapshot } from './probe-ring-whep.mjs';
import pngjs from '../services/descriptor/node_modules/pngjs/lib/png.js';

const device = { data: [{ id: 'sandbox-device', attributes: { name: 'Playground Device' } }] };
const offer = 'v=0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\na=recvonly\r\n';
const answer = 'v=0\r\na=candidate:1 1 udp 1 127.0.0.1 9 typ host\r\na=candidate:2 1 udp 1 127.0.0.1 9 typ relay\r\n';

test('reports only status, type, answer presence, and candidate types; closes a created session', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (options.method === 'GET') return new Response(JSON.stringify(device), { status: 200 });
    if (options.method === 'POST') return new Response(answer, {
      status: 201,
      headers: { 'content-type': 'application/sdp', location: `${url}/session-1` }
    });
    return new Response(null, { status: 204 });
  };
  const result = await probeRingWhep({ token: 'test-secret', fetchImpl, createOffer: async () => offer });
  assert.deepEqual(result, {
    deviceStatus: 200,
    sessionStatus: 201,
    contentType: 'application/sdp',
    sdpAnswer: true,
    iceCandidateTypes: ['host', 'relay']
  });
  assert.equal(calls[1].options.body, offer);
  assert.equal(calls[1].options.headers['Content-Type'], 'application/sdp');
  assert.equal(calls[2].options.method, 'DELETE');
  assert.ok(!JSON.stringify(result).includes('test-secret'));
  assert.ok(!JSON.stringify(result).includes('sandbox-device'));
});

test('403 session is a status-only feasibility block', async () => {
  const fetchImpl = async (_url, options) => options.method === 'GET'
    ? new Response(JSON.stringify(device), { status: 200 })
    : new Response('private details', { status: 403 });
  const result = await probeRingWhep({ token: 'test-secret', fetchImpl, createOffer: async () => offer });
  assert.deepEqual(result, {
    deviceStatus: 200,
    sessionStatus: 403,
    contentType: 'text/plain;charset=UTF-8',
    sdpAnswer: false,
    iceCandidateTypes: []
  });
});

test('snapshot follows a 303 privately and returns a mocked 200 image', async () => {
  const image = pngjs.PNG.sync.write({ width: 2, height: 3, data: Buffer.alloc(2 * 3 * 4, 255) });
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    if (options.method === 'POST') return new Response(null, {
      status: 303,
      headers: { location: 'https://download.example.test/v1/download?security_token=secret' }
    });
    return new Response(image, { status: 200, headers: { 'content-type': 'image/png' } });
  };
  const result = await probeSnapshot({ token: 'test-secret', deviceId: 'sandbox-device', fetchImpl, now: 1_800_000_000_000 });
  assert.equal(result.requestStatus, 303);
  assert.equal(result.downloadStatus, 200);
  assert.equal(result.downloadContentType, 'image/png');
  assert.equal(result.downloadBytes, image.length);
  assert.equal(result.pixelSize, '2x3');
  assert.deepEqual(result.imageBuffer, image);
  assert.equal(calls[0].options.redirect, 'manual');
  assert.equal(calls[1].options.headers?.Authorization, undefined);
  assert.equal(calls[1].options.redirect, 'manual');
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.type, 'latest_in_range');
  assert.equal(body.end_timestamp - body.start_timestamp, 24 * 60 * 60 * 1000);
});

for (const status of [403, 503]) {
  test(`snapshot ${status} records only status, content-type and byte length`, async () => {
    const fetchImpl = async () => new Response('private error details', {
      status,
      headers: { 'content-type': 'application/json' }
    });
    const result = await probeSnapshot({ token: 'test-secret', deviceId: 'sandbox-device', fetchImpl, now: 1_800_000_000_000 });
    assert.equal(result.requestStatus, status);
    assert.equal(result.requestContentType, 'application/json');
    assert.equal(result.requestBytes, Buffer.byteLength('private error details'));
    assert.equal(result.downloadStatus, null);
    assert.equal(result.imageBuffer, null);
    assert.ok(!JSON.stringify(result).includes('private error details'));
    assert.ok(!JSON.stringify(result).includes('test-secret'));
  });
}
