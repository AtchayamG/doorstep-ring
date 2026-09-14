import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '../..');

const VIDEO_PATH = join(ROOT_DIR, 'docs/06-demo-submission/doorstep-demo.mp4');
const SAMPLE_DIR = join(__dirname, 'sample_frames');
mkdirSync(SAMPLE_DIR, { recursive: true });

async function verify() {
  console.log('===========================================================');
  console.log('[Verify Video] Checking doorstep-demo.mp4');
  console.log('===========================================================');

  if (!existsSync(VIDEO_PATH)) {
    throw new Error(`Video file not found at ${VIDEO_PATH}`);
  }

  // 1. ffprobe format & streams
  console.log('\n--- 1. FFPROBE METADATA & STREAM INSPECTION ---');
  const probeStreamsCmd = `ffprobe -v error -show_entries stream=index,codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels -show_entries format=duration,size,bit_rate -of json "${VIDEO_PATH}"`;
  const probeRaw = execSync(probeStreamsCmd, { encoding: 'utf-8' });
  const probeData = JSON.parse(probeRaw);

  const duration = parseFloat(probeData.format.duration);
  const sizeBytes = parseInt(probeData.format.size, 10);
  const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
  const videoStream = probeData.streams.find(s => s.codec_type === 'video');
  const audioStream = probeData.streams.find(s => s.codec_type === 'audio');

  console.log(`Duration:       ${duration.toFixed(3)}s (${Math.floor(duration / 60)}m ${(duration % 60).toFixed(1)}s)`);
  console.log(`File Size:      ${sizeMB} MB (${sizeBytes} bytes)`);
  console.log(`Video Codec:    ${videoStream?.codec_name} (${videoStream?.width}x${videoStream?.height} @ ${videoStream?.r_frame_rate} fps)`);
  console.log(`Audio Codec:    ${audioStream?.codec_name} (${audioStream?.sample_rate} Hz, ${audioStream?.channels} channels)`);

  // Assertions
  if (duration > 180.0) {
    throw new Error(`FAIL: Video duration ${duration}s exceeds 3:00 (180s) maximum!`);
  }
  if (duration < 150.0) {
    throw new Error(`FAIL: Video duration ${duration}s is under 2:30 (150s) target!`);
  }
  if (videoStream?.width !== 1920 || videoStream?.height !== 1080) {
    throw new Error(`FAIL: Resolution is not 1920x1080!`);
  }
  if (!audioStream) {
    throw new Error(`FAIL: No audio stream found in MP4!`);
  }

  // 2. volumedetect
  console.log('\n--- 2. FFMPEG VOLUMEDETECT ANALYSIS ---');
  const volCmd = `ffmpeg -i "${VIDEO_PATH}" -af volumedetect -f null -`;
  let volOutput = '';
  try {
    // ffmpeg writes stats to stderr
    const proc = spawnSync('ffmpeg', ['-i', VIDEO_PATH, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf-8' });
    volOutput = (proc.stdout || '') + '\n' + (proc.stderr || '');
  } catch (err) {
    volOutput = (err.stdout || '') + '\n' + (err.stderr || '');
  }

  const meanMatch = volOutput.match(/mean_volume:\s+([-\d.]+)\s+dB/);
  const maxMatch = volOutput.match(/max_volume:\s+([-\d.]+)\s+dB/);

  console.log(`Mean Volume:    ${meanMatch ? meanMatch[1] + ' dB' : 'N/A'}`);
  console.log(`Max Volume:     ${maxMatch ? maxMatch[1] + ' dB' : 'N/A'}`);

  if (meanMatch && parseFloat(meanMatch[1]) < -40.0) {
    throw new Error(`FAIL: Audio is essentially silent! mean_volume = ${meanMatch[1]} dB`);
  }

  // 3. silencedetect (n=-45dB:d=4)
  console.log('\n--- 3. FFMPEG SILENCEDETECT ANALYSIS (d=4s, -45dB) ---');
  let silenceOutput = '';
  try {
    const proc = spawnSync('ffmpeg', ['-i', VIDEO_PATH, '-af', 'silencedetect=noise=-45dB:d=4', '-f', 'null', '-'], { encoding: 'utf-8' });
    silenceOutput = (proc.stdout || '') + '\n' + (proc.stderr || '');
  } catch (err) {
    silenceOutput = (err.stdout || '') + '\n' + (err.stderr || '');
  }

  const silenceMatches = [...silenceOutput.matchAll(/silence_duration:\s+([-\d.]+)/g)];
  console.log(`Silence gaps >= 4.0s: ${silenceMatches.length}`);
  if (silenceMatches.length > 0) {
    for (const m of silenceMatches) {
      console.log(`  [Alert] Detected silence gap of ${m[1]}s`);
    }
    throw new Error(`FAIL: Audio contains silence gap >= 4.0s!`);
  } else {
    console.log('PASS: Zero silence gaps >= 4.0s detected.');
  }

  // 4. Extract sample frames at key cues
  console.log('\n--- 4. EXTRACTING SAMPLE FRAMES AT MID-CUES ---');
  const checkTimes = [
    { t: 1.5, name: '01_opening_title_card' },
    { t: 12.0, name: '02_initial_surface_401_banner' },
    { t: 36.0, name: '03_step1_webhook_normalized' },
    { t: 65.0, name: '04_step2_watermark_crop_telemetry' },
    { t: 92.0, name: '05_step3_novapro_guardrail_amber_pill' },
    { t: 120.0, name: '06_step3_loud_refusal_pitch_black' },
    { t: 148.0, name: '07_provenance_truth_overview' },
    { t: 166.0, name: '08_closing_title_card' }
  ];

  for (const item of checkTimes) {
    const outImg = join(SAMPLE_DIR, `${item.name}.png`);
    execSync(`ffmpeg -y -ss ${item.t} -i "${VIDEO_PATH}" -vframes 1 "${outImg}"`, { stdio: 'ignore' });
    console.log(`[Frame] Extracted ${item.name}.png at t=${item.t}s`);
  }

  console.log('\n===========================================================');
  console.log('[Verify Video] ALL CHECKS PASSED PERFECTLY!');
  console.log('===========================================================');
}

verify().catch(err => {
  console.error('[Verify ERR]', err);
  process.exit(1);
});
