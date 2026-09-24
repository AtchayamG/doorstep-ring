// Re-cut 2026-09-24. Reuses the published cut for segments 1-5 (0-131 s) unchanged, replaces segment 6
// (old narration claimed "no REST snapshot endpoint" and "no frame from Ring", both since disproved) with
// a fresh recording of the real Ring Playground frame, and re-renders the closing card with corrected facts.
//   node ops/video/record-seg06.mjs && node ops/video/assemble-recut.mjs
import puppeteer from '../../services/descriptor/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const D = dirname(fileURLToPath(import.meta.url));
const ROOT = join(D, '../..');
const W = join(D, 'work'); mkdirSync(W, { recursive: true });
const SRC = join(ROOT, 'docs/06-demo-submission/doorstep-demo.mp4');
const OUT = join(ROOT, 'docs/06-demo-submission/doorstep-demo-v2.mp4');
const CUT_A = 131.0; // seg05 audio ends 130.70 s; seg06 began 131.30 s
const CLOSE_DUR = 7.5;
const run = (cmd) => execSync(cmd, { stdio: ['ignore', 'ignore', 'inherit'] });
const dur = (f) => parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`, { encoding: 'utf8' }));
if (!existsSync(SRC)) throw new Error('published cut missing: ' + SRC);
const m = JSON.parse(readFileSync(join(D, 'vo-manifest.json'), 'utf8'));
const seg6 = m.find((s) => s.id === 'seg06_reality');
const seg7 = m.find((s) => s.id === 'seg07_closing');
const T = dur(seg6.filePath) + 1.3;
const LN = 'loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000';
const ENC = '-c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 48000 -ac 2';

// Attribution overlay: the Playground stream is a CC BY 4.0 clip, so the frame is credited while it is on screen.
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.setContent(`<html><body style="margin:0;width:1920px;height:1080px;background:transparent;font-family:Segoe UI,Arial,sans-serif">
  <div style="position:absolute;top:22px;right:28px;background:rgba(2,6,23,.86);border:1px solid rgba(250,204,21,.55);border-radius:10px;padding:10px 16px;color:#fef08a;font-size:19px;line-height:1.35;max-width:760px">
  Frame source: Ring Developers Playground sandbox stream (not a customer camera).<br>
  Clip: “Thief stealing our package” by frollard, CC BY 4.0</div></body></html>`);
await page.screenshot({ path: join(W, 'attr.png'), omitBackground: true });
await browser.close();

// Part A: published segments 1-5, re-encoded so all three parts share one format.
run(`ffmpeg -y -i "${SRC}" -t ${CUT_A} ${ENC} "${join(W, 'partA.mp4')}"`);

// Part B: the new segment 6.
run(`ffmpeg -y -f concat -safe 0 -i "${join(D, 'concat-seg06.txt')}" -loop 1 -framerate 30 -i "${join(D, 'cards/lt-06.png')}" -loop 1 -framerate 30 -i "${join(W, 'attr.png')}" -i "${seg6.filePath}" -filter_complex ` +
  `"[0:v]fps=30,scale=1920:1080:flags=lanczos,format=yuv420p,tpad=stop_mode=clone:stop_duration=5,trim=duration=${T.toFixed(3)},setpts=PTS-STARTPTS[b];` +
  `[1:v]format=rgba,fade=t=in:st=0.5:d=0.4:alpha=1,fade=t=out:st=${(T - 0.9).toFixed(3)}:d=0.4:alpha=1[lt];[b][lt]overlay=0:0:shortest=1[b1];` +
  `[2:v]format=rgba,fade=t=in:st=2.0:d=0.5:alpha=1[at];[b1][at]overlay=0:0:shortest=1[v];` +
  `[3:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=500:all=1,${LN},apad,atrim=duration=${T.toFixed(3)}[a]" ` +
  `-map "[v]" -map "[a]" -t ${T.toFixed(3)} ${ENC} "${join(W, 'partB.mp4')}"`);

// Part C: corrected closing card with the original closing narration.
run(`ffmpeg -y -loop 1 -framerate 30 -t ${CLOSE_DUR} -i "${join(D, 'cards/card-close.png')}" -i "${seg7.filePath}" -filter_complex ` +
  `"[0:v]format=yuv420p,fade=t=in:st=0:d=0.5[v];[1:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=400:all=1,${LN},apad,atrim=duration=${CLOSE_DUR}[a]" ` +
  `-map "[v]" -map "[a]" -t ${CLOSE_DUR} ${ENC} "${join(W, 'partC.mp4')}"`);

run(`ffmpeg -y -i "${join(W, 'partA.mp4')}" -i "${join(W, 'partB.mp4')}" -i "${join(W, 'partC.mp4')}" -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[v][a]" -map "[v]" -map "[a]" ${ENC} -movflags +faststart "${OUT}"`);
console.log(`[recut] ${OUT} duration ${dur(OUT).toFixed(2)} s (A ${CUT_A} + B ${T.toFixed(2)} + C ${CLOSE_DUR})`);
