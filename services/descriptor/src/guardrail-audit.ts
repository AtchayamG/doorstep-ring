/**
 * Guardrail Audit Module for Doorstep Descriptions
 *
 * Implements active measurement of accessibility guardrails against model output text.
 * Never asserts compliance; inspects text with word-boundary tokens and reports pass/fail with findings.
 */

export interface GuardrailRuleResult {
  rule: 'identity-inference' | 'motive-inference' | 'single-present-tense-sentence';
  pass: boolean;
  finding: string | null;
  token?: string | null;
}

export interface GuardrailAudit extends Array<GuardrailRuleResult> {
  pass: boolean;
  rules: GuardrailRuleResult[];
}

export const RULE_DISPLAY_NAMES: Record<string, string> = {
  'identity-inference': 'No Identity Speculation',
  'motive-inference': 'No Motive Guessing',
  'single-present-tense-sentence': 'Single Present-Tense Sentence'
};

// --- RULE A: Identity Inference ---
// Flags appearance-derived identity claims: gendered nouns/pronouns, age claims,
// occupation claims, and named-individual claims.
// "person", "someone", "visitor", "individual" pass.
const IDENTITY_MULTIWORD_PATTERNS = [
  'delivery driver',
  'delivery drivers',
  'the homeowner',
  'looks like'
];

const IDENTITY_WORD_TOKENS = [
  // Gendered nouns & pronouns
  'man', 'men', 'woman', 'women', 'boy', 'boys', 'girl', 'girls',
  'lady', 'ladies', 'gentleman', 'gentlemen', 'guy', 'guys',
  'male', 'males', 'female', 'females',
  'he', 'she', 'his', 'her', 'hers', 'him',
  // Age claims
  'elderly', 'teenager', 'teenagers', 'child', 'children', 'kid', 'kids', 'young', 'old',
  // Occupation claims
  'courier', 'couriers', 'mailman', 'mailmen', 'postman', 'postmen',
  'salesman', 'salesmen', 'officer', 'officers',
  // Named individual
  'homeowner'
];

// --- RULE B: Motive Inference ---
// Flags intent language
const MOTIVE_MULTIWORD_PATTERNS = [
  'trying to',
  'about to',
  'appears to',
  'seems to',
  'in order to',
  'waiting for',
  'looking for',
  'checking whether',
  'attempting to',
  'intending to'
];

const MOTIVE_WORD_TOKENS = [
  'delivering',
  'stealing',
  'intending',
  'suspiciously'
];

// --- RULE C: Single Present-Tense Sentence ---
// Flags more than one sentence, and flags past-tense auxiliaries (was, were, had, has been) and "will".
const TENSE_MULTIWORD_PATTERNS = [
  'has been',
  'had been',
  'have been'
];

const TENSE_AUX_AND_IRREGULAR = [
  'was',
  'were',
  'had',
  'will',
  'would',
  'could',
  'did',
  'went',
  'came',
  'saw',
  'ran',
  'stood',
  'drove',
  'took',
  'brought',
  'sat',
  'walked',
  'stepped',
  'approached',
  'knocked',
  'opened',
  'closed',
  'dropped',
  'picked',
  'arrived',
  'left',
  'carried',
  'delivered',
  'turned',
  'waited'
];

// Non-verb words ending in 'ed' that should NOT trigger past-tense detection
const EXCLUDED_ED_WORDS = new Set([
  'red', 'bed', 'sled', 'shed', 'shred', 'speed', 'bleed', 'feed',
  'need', 'reed', 'seed', 'weed', 'creed', 'breed', 'greed'
]);

/**
 * Checks a text against multi-word phrases and single word tokens using strict word boundaries.
 */
function findOffendingToken(
  text: string,
  multiword: string[],
  words: string[]
): string | null {
  // Check multiword phrases first
  for (const phrase of multiword) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    const match = text.match(regex);
    if (match) {
      return match[0];
    }
  }

  // Check single word tokens with exact word boundaries
  for (const word of words) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    const match = text.match(regex);
    if (match) {
      return match[0];
    }
  }

  return null;
}

/**
 * Audits a description string against the three Doorstep accessibility rules.
 */
export function auditDescription(text: string): GuardrailAudit {
  const clean = (text || '').trim();

  // Rule A: identity-inference
  const identityToken = findOffendingToken(clean, IDENTITY_MULTIWORD_PATTERNS, IDENTITY_WORD_TOKENS);
  const ruleA: GuardrailRuleResult = {
    rule: 'identity-inference',
    pass: identityToken === null,
    finding: identityToken ? `Identity inference: '${identityToken}'` : null,
    token: identityToken
  };

  // Rule B: motive-inference
  const motiveToken = findOffendingToken(clean, MOTIVE_MULTIWORD_PATTERNS, MOTIVE_WORD_TOKENS);
  const ruleB: GuardrailRuleResult = {
    rule: 'motive-inference',
    pass: motiveToken === null,
    finding: motiveToken ? `Motive inference: '${motiveToken}'` : null,
    token: motiveToken
  };

  // Rule C: single-present-tense-sentence
  // 1. Check sentence count
  // Split on [.!?] followed by whitespace or end of string, filtering empty segments
  const sentences = clean
    .split(/[.!?]+(?:\s+|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let ruleC: GuardrailRuleResult;

  if (sentences.length > 1) {
    ruleC = {
      rule: 'single-present-tense-sentence',
      pass: false,
      finding: `Single present-tense sentence: multiple sentences (${sentences.length})`,
      token: 'multiple sentences'
    };
  } else {
    // 2. Check for past-tense multiword patterns and past-tense tokens (auxiliaries, modals, verbs)
    const tenseToken = findOffendingToken(clean, TENSE_MULTIWORD_PATTERNS, TENSE_AUX_AND_IRREGULAR);
    if (tenseToken) {
      ruleC = {
        rule: 'single-present-tense-sentence',
        pass: false,
        finding: `Single present-tense sentence: '${tenseToken}'`,
        token: tenseToken
      };
    } else {
      ruleC = {
        rule: 'single-present-tense-sentence',
        pass: true,
        finding: null,
        token: null
      };
    }
  }

  const results: GuardrailRuleResult[] = [ruleA, ruleB, ruleC];
  const audit = Object.assign(results, {
    pass: results.every((r) => r.pass),
    rules: results
  }) as GuardrailAudit;

  return audit;
}
