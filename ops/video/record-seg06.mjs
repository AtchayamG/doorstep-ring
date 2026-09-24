// Re-cut 2026-09-24: record ONLY segment 6 (the real Ring Playground frame through the pipeline).
// Segments 1-5 and the closing narration are reused from the published cut; see assemble-recut.mjs.
// Needs ops/captures/ring-playground-whep.jpg (from ops/capture-ring-browser.mjs) and built dist folders.
import puppeteer from '../../services/descriptor/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import { spawn, execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '../..');
const FRAMES_DIR = join(__dirname, 'frames', 'seg06');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!existsSync(join(ROOT_DIR, 'ops/captures/ring-playground-whep.jpg'))) throw new Error('No Playground capture: run ops/capture-ring-browser.mjs first');
const seg6 = JSON.parse(readFileSync(join(__dirname, 'vo-manifest.json'), 'utf8')).find((s) => s.id === 'seg06_reality');
const voDur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${seg6.filePath}"`, { encoding: 'utf8' }));
const TOTAL = voDur + 1.3; // 0.5 s lead-in + narration + 0.8 s tail

if (existsSync(FRAMES_DIR)) rmSync(FRAMES_DIR, { recursive: true, force: true });
mkdirSync(FRAMES_DIR, { recursive: true });

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) { try { if ((await fetch(url)).ok) return; } catch {} await sleep(200); }
  throw new Error(`Server at ${url} not ready`);
}
async function smoothScroll(page, y, ms = 800) {
  await page.evaluate((target, duration) => new Promise((resolve) => {
    const start = window.scrollY, diff = target - start, t0 = performance.now();
    const step = (now) => { const p = Math.min((now - t0) / duration, 1); const e = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      window.scrollTo(0, start + diff * e); p < 1 ? requestAnimationFrame(step) : resolve(); };
    requestAnimationFrame(step);
  }), y, ms);
}
async function scrollToEl(page, selector, offset = 120) {
  const y = await page.evaluate((sel, off) => { const el = document.querySelector(sel); return el ? Math.max(0, el.getBoundingClientRect().top + window.scrollY - off) : null; }, selector, offset);
  if (y !== null) await smoothScroll(page, y, 900);
  return y;
}

const server = spawn('node', ['dist/index.js'], { cwd: join(ROOT_DIR, 'services/descriptor'), stdio: 'ignore' });
let browser;
try {
  await waitForServer('http://localhost:3002/api/status');
  browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: true,
    args: ['--no-sandbox', '--window-size=1920,1080', '--force-device-scale-factor=1', '--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto('http://localhost:3002', { waitUntil: 'networkidle0' });
  await sleep(600);

  const client = await page.target().createCDPSession();
  const frames = []; let idx = 0, recording = true, t0 = 0;
  client.on('Page.screencastFrame', async ({ data, sessionId }) => {
    if (!recording) return;
    const file = `frame_${String(idx++).padStart(6, '0')}.jpg`;
    writeFileSync(join(FRAMES_DIR, file), Buffer.from(data, 'base64'));
    frames.push({ file, tMs: t0 ? Date.now() - t0 : 0 });
    try { await client.send('Page.screencastFrameAck', { sessionId }); } catch {}
  });
  await client.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 });
  t0 = Date.now();
  const at = async (sec) => { const r = sec * 1000 - (Date.now() - t0); if (r > 0) await sleep(r); };
  const tick = setInterval(() => page.evaluate(() => document.querySelector('.status-pill')?.setAttribute('data-tick', String(Date.now()))).catch(() => {}), 250);

  await at(0.8);
  await page.select('#scenario-select', 'ring_playground_whep');
  await at(1.8);
  await page.click('#run-pipeline-btn');
  // Wait for the real Bedrock result before moving on (never fake a result on screen).
  await page.waitForFunction(() => /DESCRIBED|REFUSED/.test(document.body.innerText) && !/Processing|Running/i.test(document.querySelector('#run-pipeline-btn')?.textContent || ''), { timeout: 30000 });
  const describedText = await page.evaluate(() => document.body.innerText);
  await at(6.0);
  await smoothScroll(page, 480, 900); // step 2: original vs cropped frame
  await at(15.5);
  await smoothScroll(page, 820, 900); // step 3/4: description, guardrails, provenance label
  await at(TOTAL);

  clearInterval(tick); recording = false;
  await client.send('Page.stopScreencast');
  const lines = [];
  frames.forEach((f, i) => { const n = frames[i + 1]; lines.push(`file 'frames/seg06/${f.file}'`, `duration ${(n ? Math.max((n.tMs - f.tMs) / 1000, 0.033) : 1).toFixed(4)}`); });
  if (frames.length) lines.push(`file 'frames/seg06/${frames[frames.length - 1].file}'`);
  writeFileSync(join(__dirname, 'concat-seg06.txt'), lines.join('\n'));
  const status = /REFUSED/.test(describedText) && !/DESCRIBED/.test(describedText) ? 'REFUSED' : 'DESCRIBED';
  console.log(`[seg06] frames: ${frames.length}; target ${TOTAL.toFixed(2)} s; pipeline status on screen: ${status}`);
} finally {
  if (browser) await browser.close().catch(() => {});
  try { execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' }); } catch {}
}
