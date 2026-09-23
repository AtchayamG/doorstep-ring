import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getPlaygroundFrame } from '../src/playground-frame.js';

test('a received Playground frame keeps its sandbox origin', async () => {
  const frame = Buffer.from('received-frame');
  const result = await getPlaygroundFrame(async () => frame, () => Buffer.from('fixture'));
  assert.strictEqual(result.buffer, frame);
  assert.strictEqual(result.frameOrigin, 'ring-playground-whep');
});

for (const capture of [async () => { throw new Error('session failed'); }, async () => Buffer.alloc(0)]) {
  test('failed or closed WHEP capture falls back to a declared fixture', async () => {
    const fixture = Buffer.from('fixture');
    const result = await getPlaygroundFrame(capture, () => fixture);
    assert.strictEqual(result.buffer, fixture);
    assert.strictEqual(result.frameOrigin, 'ai-generated');
  });
}

test('UI labels Playground WHEP as sandbox footage, not a customer camera', () => {
  const source = fs.readFileSync(path.resolve('..', '..', 'apps', 'surface', 'src', 'main.ts'), 'utf8');
  assert.match(source, /ring-playground-whep/);
  assert.match(source, /Ring Playground WHEP sandbox/);
  assert.match(source, /Not a customer camera/);
});
