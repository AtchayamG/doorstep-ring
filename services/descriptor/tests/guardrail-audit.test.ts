import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditDescription } from '../src/guardrail-audit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test('Guardrail Audit: Shipped headline output fails identity-inference on "man" and passes the other two', () => {
  const text = 'A man wearing a blue jacket and jeans stands on the porch holding a cardboard box.';
  const audit = auditDescription(text);

  const identity = audit.find((r) => r.rule === 'identity-inference');
  const motive = audit.find((r) => r.rule === 'motive-inference');
  const tense = audit.find((r) => r.rule === 'single-present-tense-sentence');

  assert.ok(identity, 'identity-inference rule result must exist');
  assert.strictEqual(identity.pass, false, 'identity-inference must fail on "man"');
  assert.strictEqual(identity.token, 'man');
  assert.ok(identity.finding?.includes('man'), `Finding should name "man": got ${identity.finding}`);

  assert.ok(motive, 'motive-inference rule result must exist');
  assert.strictEqual(motive.pass, true, 'motive-inference must pass on factual physical description');
  assert.strictEqual(motive.finding, null);

  assert.ok(tense, 'single-present-tense-sentence rule result must exist');
  assert.strictEqual(tense.pass, true, 'single-present-tense-sentence must pass on single present-tense sentence');
  assert.strictEqual(tense.finding, null);

  assert.strictEqual(audit.pass, false, 'Overall audit must be false when any rule fails');
});

test('Guardrail Audit: Neutral description passing all three rules', () => {
  const text = 'A person wearing a blue jacket and jeans stands on the porch holding a cardboard box.';
  const audit = auditDescription(text);

  const identity = audit.find((r) => r.rule === 'identity-inference');
  const motive = audit.find((r) => r.rule === 'motive-inference');
  const tense = audit.find((r) => r.rule === 'single-present-tense-sentence');

  assert.strictEqual(identity?.pass, true, 'Neutral "person" must pass identity-inference');
  assert.strictEqual(motive?.pass, true, 'No intent language must pass motive-inference');
  assert.strictEqual(tense?.pass, true, 'Single present sentence must pass tense check');
  assert.strictEqual(audit.pass, true, 'Overall audit must pass');
});

test('Guardrail Audit: Substring safety: holding, golden, womanhood, shelder do not trigger false positives', () => {
  const words = ['holding', 'golden', 'womanhood', 'shelder'];
  for (const word of words) {
    const audit = auditDescription(`The visitor sees a ${word} object on the porch.`);
    const identity = audit.find((r) => r.rule === 'identity-inference');
    assert.strictEqual(
      identity?.pass,
      true,
      `Word '${word}' must not trigger substring false positive in identity-inference`
    );
  }

  // Also verify "holding" specifically inside a full realistic sentence
  const holdingSentence = 'A person is holding a package.';
  const holdingAudit = auditDescription(holdingSentence);
  const holdingIdentity = holdingAudit.find((r) => r.rule === 'identity-inference');
  assert.strictEqual(holdingIdentity?.pass, true, '"holding" must not trigger "old" match');
});

test('Guardrail Audit: Intent language fails motive-inference', () => {
  const text = 'A person appears to be delivering a package.';
  const audit = auditDescription(text);

  const motive = audit.find((r) => r.rule === 'motive-inference');
  assert.ok(motive, 'motive-inference rule result must exist');
  assert.strictEqual(motive.pass, false, 'Motive inference must fail on "appears to" / "delivering"');
  assert.ok(
    motive.finding?.includes('appears to') || motive.finding?.includes('delivering'),
    `Finding must name offending intent token: got ${motive.finding}`
  );
});

test('Guardrail Audit: Past-tense verbs fail single-present-tense-sentence', () => {
  const text = 'A person walked to the door.';
  const audit = auditDescription(text);

  const tense = audit.find((r) => r.rule === 'single-present-tense-sentence');
  assert.ok(tense, 'single-present-tense-sentence rule result must exist');
  assert.strictEqual(tense.pass, false, 'single-present-tense-sentence must fail on past tense "walked"');
  assert.ok(tense.finding?.includes('walked'), `Finding must name "walked": got ${tense.finding}`);
});

test('Guard Test: index.html contains no hardcoded "✓ No " pill text', () => {
  const indexPath = resolve(__dirname, '../../../apps/surface/index.html');
  const content = readFileSync(indexPath, 'utf-8');
  const forbidden = '✓ No ';
  assert.strictEqual(
    content.includes(forbidden),
    false,
    `Hardcoded pill text "${forbidden}" found in index.html! Guardrails must be measured dynamically from API responses, never asserted statically.`
  );
});
