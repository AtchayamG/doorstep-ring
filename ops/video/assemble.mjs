import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '../..');

const OUT_MP4 = join(ROOT_DIR, 'docs/06-demo-submission/doorstep-demo.mp4');
const BASE_MP4 = join(__dirname, 'base.mp4');

const voManifest = JSON.parse(readFileSync(join(__dirname, 'vo-manifest.json'), 'utf-8'));

async function assemble() {
  console.log('[Assemble] Step 1: Compiling screencast frames into base.mp4 via concat demuxer...');
  const concatPath = join(__dirname, 'concat.txt');
  if (!existsSync(concatPath)) {
    throw new Error(`concat.txt not found at ${concatPath}. Run record.mjs first.`);
  }

  const baseCmd = `ffmpeg -y -f concat -safe 0 -i "${concatPath}" -vf "fps=30,scale=1920:1080:flags=lanczos,format=yuv420p" -c:v libx264 -preset medium -crf 20 -movflags +faststart "${BASE_MP4}"`;
  console.log('[Assemble] Running base video encode...');
  execSync(baseCmd, { stdio: 'inherit' });

  // Probe base.mp4 duration
  const probeCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${BASE_MP4}"`;
  const baseDur = parseFloat(execSync(probeCmd, { encoding: 'utf-8' }).trim());
  console.log(`[Assemble] Base screencast video duration: ${baseDur.toFixed(2)}s`);

  // Target total video duration (strictly under 180s ceiling)
  const totalDuration = Math.min(Math.max(baseDur, 170.0), 175.0);
  console.log(`[Assemble] Target final duration: ${totalDuration.toFixed(2)}s`);

  console.log('[Assemble] Step 2: Compositing title cards, lower thirds, and audio voiceovers...');

  // Inputs:
  // 0: base.mp4
  // 1: card-open.png
  // 2: card-close.png
  // 3-8: lt-01.png to lt-06.png
  // 9-15: 7 audio files
  const inputs = [
    `-i "${BASE_MP4}"`,
    `-loop 1 -framerate 30 -t ${totalDuration} -i "${join(__dirname, 'cards/card-open.png')}"`,
    `-loop 1 -framerate 30 -t ${totalDuration} -i "${join(__dirname, 'cards/card-close.png')}"`
  ];

  for (let i = 1; i <= 6; i++) {
    const ltFile = join(__dirname, `cards/lt-${String(i).padStart(2, '0')}.png`);
    inputs.push(`-loop 1 -framerate 30 -t ${totalDuration} -i "${ltFile}"`);
  }

  for (const cue of voManifest) {
    inputs.push(`-i "${cue.filePath}"`);
  }

  // Filter Complex construction
  const vfFilters = [
    // card-open: 0s to 3.2s, fade out 2.7s-3.2s
    `[1:v]format=rgba,fade=t=out:st=2.7:d=0.5:alpha=1[copen]; [0:v][copen]overlay=0:0:enable='between(t,0,3.2)'[v1]`
  ];

  // Lower thirds: lt-01 to lt-06
  // lt-01: cue 1 (starts at 3.2s, ends at 24.1s)
  vfFilters.push(`[3:v]format=rgba,fade=t=in:st=3.2:d=0.4:alpha=1,fade=t=out:st=${(voManifest[0].endSec - 0.4).toFixed(2)}:d=0.4:alpha=1[lt1]; [v1][lt1]overlay=0:0:enable='between(t,3.2,${voManifest[0].endSec.toFixed(2)})'[v2]`);

  for (let i = 1; i < 6; i++) {
    const cue = voManifest[i];
    const prevV = `v${i + 1}`;
    const nextV = `v${i + 2}`;
    const inputIdx = i + 3;
    const stIn = cue.startSec.toFixed(2);
    const stOut = (cue.endSec - 0.4).toFixed(2);
    const endT = cue.endSec.toFixed(2);

    vfFilters.push(`[${inputIdx}:v]format=rgba,fade=t=in:st=${stIn}:d=0.4:alpha=1,fade=t=out:st=${stOut}:d=0.4:alpha=1[lt${i + 1}]; [${prevV}][lt${i + 1}]overlay=0:0:enable='between(t,${stIn},${endT})'[${nextV}]`);
  }

  // card-close: cue 7 start (~159.2s) through end
  const closeStart = (voManifest[6].startSec - 0.5).toFixed(2);
  vfFilters.push(`[2:v]format=rgba,fade=t=in:st=${closeStart}:d=0.5:alpha=1[cclose]; [v7][cclose]overlay=0:0:enable='gte(t,${closeStart})'[vout]`);

  // Audio Filters
  const afFilters = [];
  const audioMixInputs = [];

  for (let i = 0; i < voManifest.length; i++) {
    const cue = voManifest[i];
    const inputIdx = 9 + i;
    const delayMs = Math.round(cue.startSec * 1000);
    const aLabel = `a${i}`;
    afFilters.push(`[${inputIdx}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${delayMs}:all=1[${aLabel}]`);
    audioMixInputs.push(`[${aLabel}]`);
  }

  afFilters.push(`${audioMixInputs.join('')}amix=inputs=${voManifest.length}:normalize=0:dropout_transition=0[amix]`);
  afFilters.push(`[amix]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,apad[aout]`);

  const filterComplex = `${vfFilters.join('; ')}; ${afFilters.join('; ')}`;

  const finalCmd = `ffmpeg -y ${inputs.join(' ')} -filter_complex "${filterComplex}" -map "[vout]" -map "[aout]" -c:v libx264 -preset medium -crf 20 -c:a aac -b:a 192k -t ${totalDuration.toFixed(2)} -movflags +faststart "${OUT_MP4}"`;

  console.log('[Assemble] Running final composite encode...');
  execSync(finalCmd, { stdio: 'inherit' });

  console.log(`\n[Assemble] SUCCESS! Final submission demo video written to:\n${OUT_MP4}`);
}

assemble().catch(err => {
  console.error('[Assemble ERR]', err);
  process.exit(1);
});
