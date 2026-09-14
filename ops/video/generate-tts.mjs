import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VO_DIR = join(__dirname, 'vo');
mkdirSync(VO_DIR, { recursive: true });

const segments = [
  {
    id: 'seg01_problem',
    eyebrow: 'PROJECT 2: RING TRACK',
    headline: 'Accessibility for Blind & Low-Vision Viewers',
    text: "Doorstep is an accessibility vision narrator built for the Ring track by Atchayam G. For a blind or low-vision person, a doorbell notification that says 'motion detected' tells you nothing. You cannot tell if someone is delivering a package, standing at the door, or just passing by. Doorstep turns raw Ring alerts into immediate, objective spoken descriptions."
  },
  {
    id: 'seg02_webhook',
    eyebrow: 'STEP 1: WEBHOOK NORMALISATION',
    headline: 'Extracting Ring JSON:API Schema Attributes',
    text: "In Step 1, we simulate an incoming webhook. The Ring Partner API sends no bounding boxes or object labels — only a coarse sub_type in data.attributes. Doorstep normalizes this schema: extracting 'human' from motion alerts and mapping legacy ding signals to button_press."
  },
  {
    id: 'seg03_watermark',
    eyebrow: 'STEP 2: WATERMARK EXCISION',
    headline: 'Eliminating Multimodal Model Contamination',
    text: "Step 2 solves a key friction. Under Ring's June 2026 spec, every frame carries a mandatory watermark: logo top-left, device timestamp top-right. Multimodal models read this text aloud instead of the porch. Doorstep's pure JavaScript cropper excises the top 15% rows — 134 pixels on 896p frames. Our unit tests prove zero percent of watermark pixels reach the model."
  },
  {
    id: 'seg04_novapro',
    eyebrow: 'STEP 3 & 4: NOVA PRO & GUARDRAILS',
    headline: 'Active Measurement: Flagging Identity Inference',
    text: "In Step 3, the cropped frame passes to Bedrock Nova Pro. Asked for no identity speculation, the model still returned: 'A man wearing a blue jacket and jeans stands on the porch holding a cardboard box.' Inferring gender is identity speculation. Doorstep now actively audits compliance instead of asserting it: motive and tense pass green, but identity turns amber, flagging 'man'. In Step 4, Doorstep speaks the caption aloud."
  },
  {
    id: 'seg05_refusal',
    eyebrow: 'FIRST-CLASS LOUD REFUSAL',
    headline: 'Transparent Failure Handling on Pitch-Black Frames',
    text: "Refusal is a first-class citizen in Doorstep. When a camera is obstructed or pitch black, polite fallbacks or unhandled crashes mislead low-vision users. Here, an unlit frame with zero luminance triggers our loud refusal state: displaying a prominent red banner with the exact failure reason and sounding an audible refusal alert."
  },
  {
    id: 'seg06_reality',
    eyebrow: 'PROVENANCE & API REALITY',
    headline: 'Transparent Disclosures & Authenticated Findings',
    text: "Finally, complete transparency on what is real. No frame came from a live Ring camera. Our photographic fixtures are AI-generated test frames with signed Google C2PA credentials, declared in the amber warning strip. While testing against the Ring Playground proved six authenticated endpoints return 200, Ring provides no REST snapshot endpoint. Live frame capture requires WebRTC WHEP, scoped for Phase 2."
  },
  {
    id: 'seg07_closing',
    eyebrow: 'DOORSTEP ACCESSIBILITY',
    headline: 'Verified API Reality • Honest Refusals',
    text: "Doorstep: built on verified API reality, honest refusals, and genuine accessibility."
  }
];

console.log('[TTS] Synthesizing voiceover segments with edge-tts...');

const results = [];
let currentOffset = 1.0; // 1 second opening pause before speech

for (let i = 0; i < segments.length; i++) {
  const seg = segments[i];
  const filename = `${String(i + 1).padStart(2, '0')}_${seg.id}.mp3`;
  const filePath = join(VO_DIR, filename);

  console.log(`[TTS] Generating ${filename}...`);
  const rate = seg.id === 'seg04_novapro' ? '+15%' : '+12%';
  const sanitizedText = seg.text.replace(/"/g, '\\"');
  const cmd = `python -m edge_tts --voice en-IN-PrabhatNeural --rate=${rate} --text "${sanitizedText}" --write-media "${filePath}"`;
  execSync(cmd, { stdio: 'inherit' });

  // Probe duration
  const probeCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
  const durSec = parseFloat(execSync(probeCmd, { encoding: 'utf-8' }).trim());

  results.push({
    ...seg,
    filename,
    filePath,
    durationSec: durSec,
    startSec: Math.round(currentOffset * 1000) / 1000,
    endSec: Math.round((currentOffset + durSec) * 1000) / 1000
  });

  // 0.6s pause between segments (2.0s after the last segment)
  currentOffset += durSec + (i === segments.length - 1 ? 2.0 : 0.6);
}

const manifestPath = join(__dirname, 'vo-manifest.json');
writeFileSync(manifestPath, JSON.stringify(results, null, 2));

console.log('\n[TTS] All voiceover segments synthesized successfully!');
console.log(`[TTS] Total speech + pause duration: ${currentOffset.toFixed(2)}s (${Math.floor(currentOffset / 60)}m ${Math.round(currentOffset % 60)}s)`);
console.table(results.map(r => ({
  Segment: r.id,
  Duration: `${r.durationSec.toFixed(2)}s`,
  Start: `${r.startSec.toFixed(2)}s`,
  End: `${r.endSec.toFixed(2)}s`
})));
