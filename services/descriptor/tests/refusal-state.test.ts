import test from 'node:test';
import assert from 'node:assert';
import { createSyntheticFrame } from '../src/sample-frames.js';
import { executeDoorstepPipeline } from '../src/event-pipeline.js';
import { cropWatermark } from '../src/watermark-cropper.js';

test('Refusal State: Unusable pitch-black frame produces loud and visible refusal', async () => {
  // Generate pitch-black frame
  const blackFrame = createSyntheticFrame({
    sceneType: 'pitch_black',
    includeWatermark: false
  });

  // Verify usability evaluator flags it
  const crop = await cropWatermark(blackFrame);
  assert.strictEqual(crop.isUsable, false, 'Pitch-black frame must be flagged as unusable');
  assert.ok(crop.averageLuminance < 3.0, 'Average luminance must be under 3.0/255');
  assert.ok(crop.usabilityReason?.includes('pitch black'), 'Reason must explicitly state pitch black');

  // Run through end-to-end pipeline
  const result = await executeDoorstepPipeline(
    {
      event_type: 'motion_detected',
      data: {
        device_id: 'front-door-cam',
        attributes: { sub_type: 'motion' }
      }
    },
    blackFrame
  );

  // Assert loud and visible refusal
  assert.strictEqual(result.status, 'REFUSED', 'Status must be REFUSED');
  assert.strictEqual(result.isRefused, true, 'isRefused boolean must be true');
  assert.ok(result.refusalReason, 'Refusal reason must be present');
  assert.ok(result.refusalReason.includes('pitch black'), 'Refusal reason must explain the frame is pitch black');
  assert.ok(
    result.spokenCaption.startsWith('Refusal alert:'),
    'Spoken caption must alert listener to refusal'
  );
  assert.strictEqual(
    result.description,
    '',
    'Description must NOT contain a polite fallback like "nothing to see"'
  );
});

test('Refusal State: Corrupted or non-image buffer produces loud refusal', async () => {
  const corruptedBuffer = Buffer.from('NOT_A_REAL_IMAGE_DATA_CORRUPT_BYTES');

  const result = await executeDoorstepPipeline(
    {
      event_type: 'motion_detected',
      data: {
        device_id: 'front-door-cam',
        attributes: { sub_type: 'motion' }
      }
    },
    corruptedBuffer
  );

  assert.strictEqual(result.status, 'REFUSED', 'Status must be REFUSED for corrupted bytes');
  assert.strictEqual(result.isRefused, true, 'isRefused must be true');
  assert.ok(result.refusalReason?.includes('Unsupported image format'), 'Reason must describe decoding failure');
  assert.ok(result.spokenCaption.startsWith('Refusal alert:'), 'Spoken caption must alert listener');
});

test('Refusal State: Missing or expired token produces honest TOKEN_REQUIRED state', async () => {
  // Test pipeline without image buffer and with an unauthenticated client
  const result = await executeDoorstepPipeline(
    {
      event_type: 'button_press',
      data: {
        device_id: 'unauth-cam',
        attributes: { sub_type: 'doorbell_chime' }
      }
    }
  );

  // If token is absent or invalid, it must NOT pretend everything is fine
  if (!process.env.RING_ACCESS_TOKEN) {
    assert.strictEqual(result.status, 'TOKEN_REQUIRED', 'Status must be TOKEN_REQUIRED when token is missing');
    assert.strictEqual(result.isRefused, true, 'isRefused must be true');
    assert.ok(
      result.tokenInfo?.playgroundUrl === 'https://developer.amazon.com/ring/console/playground',
      'Must provide exact link to Ring Developers Playground'
    );
    assert.strictEqual(result.description, '', 'No fake transcript should be shown');
  }
});
