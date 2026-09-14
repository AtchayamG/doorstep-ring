import test from 'node:test';
import assert from 'node:assert';
import { PNG } from 'pngjs';
import { cropWatermark, detectFormat } from '../src/watermark-cropper.js';
import { createSyntheticFrame } from '../src/sample-frames.js';

test('Watermark Cropper: Excludes top watermark band from inference payload', async () => {
  const width = 400;
  const height = 300;

  // Create an image with known watermark markers in the top 15% (rows 0 to 44)
  // Per Ring release note: "watermark overlay containing the Ring logo (top-left), Device ID, App Name, and timestamp (top-right)"
  const testPng = new PNG({ width, height });

  // Fill top 15% with a distinct signature color: R=77, G=88, B=99
  const watermarkRows = Math.round(height * 0.15); // 45 rows
  for (let y = 0; y < watermarkRows; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) * 4;
      testPng.data[idx] = 77;
      testPng.data[idx + 1] = 88;
      testPng.data[idx + 2] = 99;
      testPng.data[idx + 3] = 255;
    }
  }

  // Fill lower 85% (the actual camera scene) with a distinct scene color: R=200, G=210, B=220
  for (let y = watermarkRows; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) * 4;
      testPng.data[idx] = 200;
      testPng.data[idx + 1] = 210;
      testPng.data[idx + 2] = 220;
      testPng.data[idx + 3] = 255;
    }
  }

  const rawBuffer = PNG.sync.write(testPng);
  assert.strictEqual(detectFormat(rawBuffer), 'png', 'Format should be detected as PNG');

  // Perform watermark crop
  const cropResult = await cropWatermark(rawBuffer, { cropRatio: 0.15 });

  // 1. Dimensions check: top 15% rows removed
  assert.strictEqual(cropResult.originalHeight, 300, 'Original height must be 300');
  assert.strictEqual(cropResult.originalWidth, 400, 'Original width must be 400');
  assert.strictEqual(cropResult.rowsRemoved, 45, 'Exactly 45 rows (15%) must be removed');
  assert.strictEqual(cropResult.croppedHeight, 255, 'Cropped height must be 255 (300 - 45)');
  assert.strictEqual(cropResult.croppedWidth, 400, 'Cropped width must remain 400');

  // 2. Decode cropped image and assert ZERO watermark signature pixels exist
  const decodedCropped = PNG.sync.read(cropResult.croppedBuffer);
  assert.strictEqual(decodedCropped.height, 255, 'Decoded cropped image must have height 255');
  assert.strictEqual(decodedCropped.width, 400, 'Decoded cropped image must have width 400');

  let watermarkPixelsFound = 0;
  let validScenePixelsFound = 0;

  for (let i = 0; i < decodedCropped.data.length; i += 4) {
    const r = decodedCropped.data[i];
    const g = decodedCropped.data[i + 1];
    const b = decodedCropped.data[i + 2];

    // Check if watermark signature (77, 88, 99) exists in the cropped image
    if (r === 77 && g === 88 && b === 99) {
      watermarkPixelsFound++;
    }
    // Check if scene pixel (200, 210, 220) exists
    if (r === 200 && g === 210 && b === 220) {
      validScenePixelsFound++;
    }
  }

  assert.strictEqual(
    watermarkPixelsFound,
    0,
    'CRITICAL: Cropped image must contain ZERO watermark pixels. Watermark must be 100% excised from inference payload.'
  );
  assert.strictEqual(
    validScenePixelsFound,
    400 * 255,
    'All pixels in the cropped image must come exclusively from the camera scene.'
  );
});

test('Watermark Cropper: Works with synthetic realistic scene and custom crop ratios', async () => {
  const realisticFrame = createSyntheticFrame({
    sceneType: 'person_porch',
    includeWatermark: true
  });

  const result = await cropWatermark(realisticFrame, { cropRatio: 0.15 });
  assert.ok(result.croppedBuffer.length > 0, 'Cropped buffer must not be empty');
  assert.strictEqual(result.cropPercentage, 15, 'Crop percentage should report 15%');
  assert.ok(result.isUsable, 'Realistic daylight porch frame must be evaluated as usable');
  assert.ok(result.averageLuminance > 10, 'Average luminance must be well above darkness threshold');
});
