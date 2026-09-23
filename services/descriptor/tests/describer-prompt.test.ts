import { test } from 'node:test';
import assert from 'node:assert';
import { buildUserPrompt } from '../src/bedrock-describer.js';

// Regression for the first real Ring Playground frame (2026-09-23): the pipeline told Nova Pro the event
// was sub_type="human" when no Ring event existed, and the model refused a porch holding a parcel.

test('Describer prompt: with no Ring event there is no sensor hint at all', () => {
  const prompt = buildUserPrompt(undefined);
  assert.ok(!/sub_type/.test(prompt), 'an absent event must not become a sensor claim');
  assert.match(prompt, /Describe what is visually observable/);
});

test('Describer prompt: a real sub_type is framed as a hint that may not match the image', () => {
  const prompt = buildUserPrompt('human');
  assert.match(prompt, /sub_type="human"/);
  assert.match(prompt, /may not match/);
  assert.match(prompt, /even if it does not match the hint/);
});

test('Describer prompt: refusal is reserved for an unusable image, not for a mismatched hint', () => {
  assert.match(buildUserPrompt('human'), /If the image itself is unusable/);
});
