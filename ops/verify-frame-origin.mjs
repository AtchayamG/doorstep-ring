/**
 * Proves the running descriptor service declares a frame origin everywhere the
 * surface could imply one. Two of the preset frames are AI-generated images;
 * the UI writes its image label from this field alone, so if the field is
 * missing the label silently falls back to "undeclared" rather than to a claim
 * about a camera.
 *
 * Usage: node ops/verify-frame-origin.mjs   (service must be on :3002)
 */
const BASE = process.env.DOORSTEP_BASE || 'http://localhost:3002';

const EXPECTED = {
  person_porch_package: 'ai-generated',
  vehicle_driveway: 'ai-generated',
  doorbell_chime_press: 'procedural',
  pitch_black_unusable: 'procedural'
};

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.log(`  [FAIL] ${msg}`);
};

console.log(`=== GET ${BASE}/api/samples ===`);
const samples = await (await fetch(`${BASE}/api/samples`)).json();
const playground = samples.scenarios.find((s) => s.id === 'ring_playground_whep');
if (!playground || !['ring-playground-whep', 'ai-generated'].includes(playground.frameOrigin)) {
  fail('Playground scenario must declare a sandbox capture or fixture fallback');
} else {
  EXPECTED.ring_playground_whep = playground.frameOrigin;
}
for (const s of samples.scenarios) {
  console.log(`  ${String(s.frameOrigin).padEnd(14)} ${s.id.padEnd(24)} ${s.name}`);
  if (EXPECTED[s.id] && s.frameOrigin !== EXPECTED[s.id]) {
    fail(`${s.id}: /api/samples says '${s.frameOrigin}', expected '${EXPECTED[s.id]}'`);
  }
}

console.log(`\n=== POST ${BASE}/api/describe (one call per scenario) ===`);
for (const [id, expected] of Object.entries(EXPECTED)) {
  const res = await fetch(`${BASE}/api/describe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId: id })
  });
  const d = await res.json();
  const text = (d.description || d.refusalReason || '').slice(0, 78);
  console.log(`  ${String(d.frameOrigin).padEnd(14)} ${String(d.status).padEnd(15)} ${text}`);
  if (d.frameOrigin !== expected) {
    fail(`${id}: /api/describe says '${d.frameOrigin}', expected '${expected}'`);
  }
}

console.log(`\n=== POST ${BASE}/api/describe (uploaded frame) ===`);
// A 1x1 PNG. Stands in for a file a judge drags in themselves: the app must
// say it makes no claim about the origin, not that a camera produced it.
const onePx =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AH+2Q0AAAAASUVORK5CYII=';
const up = await (
  await fetch(`${BASE}/api/describe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: `data:image/png;base64,${onePx}` })
  })
).json();
console.log(`  ${String(up.frameOrigin).padEnd(14)} ${String(up.status).padEnd(15)}`);
if (up.frameOrigin !== 'user-upload') {
  fail(`upload: /api/describe says '${up.frameOrigin}', expected 'user-upload'`);
}

console.log(
  failures === 0
    ? '\nAll frame origins declared and correct.'
    : `\n${failures} frame-origin problem(s).`
);
process.exit(failures === 0 ? 0 : 1);
