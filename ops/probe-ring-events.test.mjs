import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarise } from './probe-ring-events.mjs';

test('summarises field names and event-type enums only, never ids or values', () => {
  const json = { data: [
    { id: 'secret-device-event-1', type: 'events', attributes: { event_type: 'motion', sub_type: 'human', created_at: '2026-09-23T16:00:08Z', media_url: 'https://signed.example/secret' } },
    { id: 'secret-device-event-2', type: 'events', attributes: { event_type: 'ding', created_at: '2026-09-23T16:05:00Z' } }
  ], meta: { next: 'cursor-secret' } };
  const s = summarise(json);
  assert.equal(s.count, 2);
  assert.deepEqual(s.topLevelKeys, ['data', 'meta']);
  assert.deepEqual(s.attributeKeys, ['created_at', 'event_type', 'media_url', 'sub_type']);
  assert.deepEqual(s.eventTypes, ['event_type=ding', 'event_type=motion', 'sub_type=human', 'type=events']);
  const printed = JSON.stringify(s);
  for (const leak of ['secret-device-event', 'signed.example', 'cursor-secret', '2026-09-23T16']) assert.ok(!printed.includes(leak), leak);
});

test('handles an empty or non-list body', () => {
  assert.equal(summarise({ data: [] }).count, 0);
  assert.equal(summarise({ message: 'Forbidden' }).count, null);
  assert.equal(summarise(null).count, null);
});
