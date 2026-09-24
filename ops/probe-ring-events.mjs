// Status-only probe of Ring event history on the Developers Playground.
//
// Why: our docs say event history is "blocked by scope" because GET /v1/devices/{id}/events returned 403.
// The official reference documents event history at a DIFFERENT path, GET /v1/history/devices/{id}/events.
// We made the same mistake once already (guessed snapshot GETs -> 404 -> wrong "no snapshot endpoint" claim),
// so this probe tests the documented path, re-tests the old one, and tests a made-up route as a control:
// if the made-up route ALSO returns 403, the old 403 meant "no such route", not "missing scope".
//
//   powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\with-ring-token.ps1 probe-ring-events.mjs
//
// Prints only HTTP status, content-type, item count, top-level field NAMES and the distinct values of
// event-type fields (Ring enums such as motion / ding / human). No ids, URLs, timestamps or media links.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://api.amazonvision.com/v1';
const TYPE_KEYS = ['event_type', 'type', 'sub_type', 'subType', 'kind', 'detection_type', 'category'];

export function summarise(json) {
  const items = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : null;
  const first = items?.[0];
  const attrs = first?.attributes ?? {};
  const types = new Set();
  for (const item of items ?? []) {
    for (const src of [item, item?.attributes ?? {}]) {
      for (const k of TYPE_KEYS) if (typeof src?.[k] === 'string' && src[k].length <= 40) types.add(`${k}=${src[k]}`);
    }
  }
  return {
    count: items ? items.length : null,
    topLevelKeys: json && typeof json === 'object' && !Array.isArray(json) ? Object.keys(json).sort() : [],
    itemKeys: first && typeof first === 'object' ? Object.keys(first).sort() : [],
    attributeKeys: Object.keys(attrs).sort(),
    eventTypes: [...types].sort()
  };
}

async function probe(label, url, headers) {
  const res = await fetch(url, { headers, redirect: 'manual', signal: AbortSignal.timeout(15000) });
  const type = res.headers.get('content-type') || '(none)';
  let summary = null;
  if (type.includes('json')) { try { summary = summarise(await res.json()); } catch { summary = null; } }
  console.log(`${label}: HTTP ${res.status}; content-type ${type}`);
  if (summary && res.status === 200) {
    console.log(`  items: ${summary.count ?? 'n/a'}; top-level keys: ${summary.topLevelKeys.join(', ') || '-'}`);
    console.log(`  item keys: ${summary.itemKeys.join(', ') || '-'}; attribute keys: ${summary.attributeKeys.join(', ') || '-'}`);
    console.log(`  event types: ${summary.eventTypes.join(', ') || '(none found)'}`);
  }
  return res.status;
}

async function main() {
  const token = process.env.RING_ACCESS_TOKEN;
  if (!token) throw new Error('TOKEN_MISSING');
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
  const list = await fetch(`${API}/devices`, { headers, redirect: 'manual', signal: AbortSignal.timeout(15000) });
  console.log(`Device list: HTTP ${list.status}`);
  if (list.status !== 200) throw new Error('DEVICE_LIST_UNAVAILABLE');
  const device = (await list.json())?.data?.find((d) => d?.attributes?.name === 'Playground Device');
  if (!device?.id) throw new Error('PLAYGROUND_DEVICE_NOT_FOUND');
  const id = encodeURIComponent(device.id);
  await probe('Documented  GET /v1/history/devices/{id}/events', `${API}/history/devices/${id}/events`, headers);
  await probe('Old guess   GET /v1/devices/{id}/events', `${API}/devices/${id}/events`, headers);
  await probe('Control     GET /v1/devices/{id}/no-such-route', `${API}/devices/${id}/no-such-route-doorstep-probe`, headers);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const safe = ['TOKEN_MISSING', 'DEVICE_LIST_UNAVAILABLE', 'PLAYGROUND_DEVICE_NOT_FOUND'];
  try { await main(); } catch (error) {
    console.error(`Probe failed: ${safe.includes(error?.message) ? error.message : 'LOCAL_OR_NETWORK_ERROR'}`);
    process.exitCode = 2;
  }
}
