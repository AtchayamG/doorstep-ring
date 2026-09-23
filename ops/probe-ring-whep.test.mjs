import assert from 'node:assert/strict';
import { test } from 'node:test';
import { probeRingWhep } from './probe-ring-whep.mjs';

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
