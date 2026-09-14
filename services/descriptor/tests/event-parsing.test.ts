import test from 'node:test';
import assert from 'node:assert';
import { normalizeRingWebhook } from '../src/event-pipeline.js';

test('Event Parsing: Correctly extracts data.attributes.sub_type per real Ring schema', () => {
  const payload = {
    event_id: 'evt_ring_998822',
    event_type: 'motion_detected',
    created_at: '2026-09-14T12:00:00Z',
    data: {
      device_id: 'cam_front_porch',
      attributes: {
        sub_type: 'human',
        confidence: 0.94
      }
    }
  };

  const normalized = normalizeRingWebhook(payload);
  assert.strictEqual(normalized.eventId, 'evt_ring_998822');
  assert.strictEqual(normalized.eventType, 'motion_detected');
  assert.strictEqual(normalized.subType, 'human', 'Must prioritize data.attributes.sub_type');
  assert.strictEqual(normalized.deviceId, 'cam_front_porch');
});

test('Event Parsing: Correctly handles vehicle and other_motion sub_types', () => {
  const payloadVehicle = {
    event_type: 'motion_detected',
    data: {
      device_id: 'cam_driveway',
      attributes: {
        sub_type: 'vehicle'
      }
    }
  };

  const normalizedVehicle = normalizeRingWebhook(payloadVehicle);
  assert.strictEqual(normalizedVehicle.subType, 'vehicle');

  const payloadOther = {
    event_type: 'motion_detected',
    data: {
      device_id: 'cam_yard',
      attributes: {
        sub_type: 'other_motion'
      }
    }
  };

  const normalizedOther = normalizeRingWebhook(payloadOther);
  assert.strictEqual(normalizedOther.subType, 'other_motion');
});

test('Event Parsing: Normalizes ding to button_press', () => {
  const payloadDing = {
    event_type: 'ding',
    data: {
      device_id: 'doorbell_main',
      attributes: {}
    }
  };

  const normalized = normalizeRingWebhook(payloadDing);
  assert.strictEqual(normalized.eventType, 'button_press', 'ding must normalize to button_press');
  assert.strictEqual(normalized.subType, 'doorbell_chime');
  assert.strictEqual(normalized.deviceId, 'doorbell_main');
});

test('Event Parsing: Gracefully handles legacy data.subType as fallback', () => {
  const legacyPayload = {
    event_type: 'motion_detected',
    data: {
      device_id: 'cam_legacy',
      subType: 'human'
    }
  };

  const normalized = normalizeRingWebhook(legacyPayload);
  assert.strictEqual(normalized.subType, 'human', 'Must support data.subType as graceful fallback');
  assert.strictEqual(normalized.deviceId, 'cam_legacy');
});
