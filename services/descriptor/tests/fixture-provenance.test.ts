import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SAMPLE_SCENARIOS } from '../src/sample-frames.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(here, '../fixtures');
const PROVENANCE = path.resolve(here, '../../../docs/00-research/fixture-media-provenance.md');

/**
 * Two fixtures shipped here as "doorbell and driveway camera test frames".
 * Both carry Google C2PA content credentials reading "Created by Google
 * Generative AI", digitalSourceType trainedAlgorithmicMedia, plus an applied
 * SynthID watermark. The web surface labelled one pane "Raw Feed".
 *
 * Generated test images are fine. Presenting them as camera output is not.
 * These tests make the disclosure structural instead of a thing someone
 * remembers to do.
 */

const imageFiles = fs.existsSync(FIXTURES)
  ? fs.readdirSync(FIXTURES).filter((f) => /\.(jpe?g|png|webp|gif|bmp)$/i.test(f))
  : [];

test('Fixture provenance: the provenance document exists', () => {
  assert.ok(
    fs.existsSync(PROVENANCE),
    `Expected a provenance document at ${PROVENANCE}`
  );
});

test('Fixture provenance: every image in fixtures/ is named in the document', () => {
  const doc = fs.readFileSync(PROVENANCE, 'utf8');
  const undocumented = imageFiles.filter((f) => !doc.includes(f));
  // A new image dropped into fixtures/ fails here until someone writes down
  // where it came from.
  assert.deepStrictEqual(
    undocumented,
    [],
    `Undocumented fixture images: ${undocumented.join(', ')}`
  );
});

test('Fixture provenance: an AI-generated file says so in its own filename', () => {
  // Provenance that lives only in a document gets separated from the file the
  // moment anyone copies it into a slide or a screenshot.
  const doc = fs.readFileSync(PROVENANCE, 'utf8');
  let checked = 0;
  for (const f of imageFiles) {
    const line = doc.split('\n').find((l) => l.includes(f)) ?? '';
    if (/Generative AI|trainedAlgorithmicMedia|AI-generated/i.test(line)) {
      checked += 1;
      assert.ok(
        f.toUpperCase().includes('SYNTHETIC'),
        `${f} is documented as AI-generated but its filename does not say SYNTHETIC`
      );
    }
  }
  assert.ok(checked > 0, 'Expected at least one documented AI-generated fixture');
});

test('Fixture provenance: no scenario claims a live Ring frame off a fixture', () => {
  for (const scenario of SAMPLE_SCENARIOS) {
    if (scenario.frameOrigin !== 'ring-live') continue;
    // 'ring-live' is reserved for frames actually fetched from Ring. Nothing
    // may claim it on the strength of a file sitting in fixtures/.
    const source = scenario.generateImage.toString();
    const drawnFromFixture = imageFiles.some((f) => source.includes(f));
    assert.strictEqual(
      drawnFromFixture,
      false,
      `Scenario ${scenario.id} claims frameOrigin 'ring-live' but reads a fixture file`
    );
  }
});

test('Fixture provenance: the two generated scenarios are flagged for the UI', () => {
  const flagged = SAMPLE_SCENARIOS.filter((s) => s.frameOrigin === 'ai-generated');
  assert.deepStrictEqual(
    flagged.map((s) => s.id).sort(),
    ['person_porch_package', 'vehicle_driveway']
  );
  for (const s of flagged) {
    assert.ok(
      s.name.toUpperCase().includes('SYNTHETIC'),
      `Scenario ${s.id} is AI-generated but its display name does not say SYNTHETIC`
    );
  }
});

test('Fixture provenance: every scenario reading a fixture declares an origin', () => {
  for (const scenario of SAMPLE_SCENARIOS) {
    const source = scenario.generateImage.toString();
    const readsFixture = imageFiles.some((f) => source.includes(f));
    if (!readsFixture) continue;
    assert.ok(
      scenario.frameOrigin,
      `Scenario ${scenario.id} reads a fixture image but declares no frameOrigin`
    );
  }
});
