import puppeteer from '../../services/descriptor/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '../..');

const FRAMES_DIR = join(__dirname, 'frames');
if (existsSync(FRAMES_DIR)) rmSync(FRAMES_DIR, { recursive: true, force: true });
mkdirSync(FRAMES_DIR, { recursive: true });

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // wait
    }
    await sleep(200);
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function smoothScroll(page, targetY, durationMs = 700) {
  await page.evaluate(async (target, duration) => {
    const start = window.scrollY;
    const diff = target - start;
    const startTime = performance.now();
    return new Promise((resolve) => {
      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
        window.scrollTo(0, start + diff * ease);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  }, targetY, durationMs);
}

async function recordSession() {
  console.log('[Record] Starting Doorstep descriptor service...');
  const serverProcess = spawn('node', ['dist/index.js'], {
    cwd: join(ROOT_DIR, 'services/descriptor'),
    stdio: 'ignore'
  });

  try {
    await waitForServer('http://localhost:3002/api/status');
    console.log('[Record] Service is ready on http://localhost:3002');

    console.log('[Record] Launching Edge browser (1920x1080)...');
    const browser = await puppeteer.launch({
      executablePath: EDGE_PATH,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1920,1080',
        '--force-device-scale-factor=1',
        '--hide-scrollbars'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle0' });
    await sleep(500);

    const client = await page.target().createCDPSession();
    const frameManifest = [];
    let frameIndex = 0;
    let recording = true;
    let sessionStartTime = 0;

    client.on('Page.screencastFrame', async ({ data, sessionId }) => {
      if (!recording) return;
      const tMs = sessionStartTime > 0 ? Date.now() - sessionStartTime : 0;
      const frameFilename = `frame_${String(frameIndex++).padStart(6, '0')}.jpg`;
      const framePath = join(FRAMES_DIR, frameFilename);
      writeFileSync(framePath, Buffer.from(data, 'base64'));
      frameManifest.push({ file: frameFilename, tMs });
      try {
        await client.send('Page.screencastFrameAck', { sessionId });
      } catch {
        // session might be closing
      }
    });

    console.log('[Record] Starting CDP screencast...');
    await client.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 92,
      everyNthFrame: 1
    });

    sessionStartTime = Date.now();

    async function sleepUntil(targetSec) {
      const targetMs = targetSec * 1000;
      const elapsed = Date.now() - sessionStartTime;
      const remaining = targetMs - elapsed;
      if (remaining > 0) {
        await sleep(remaining);
      }
    }

    // Helper to keep screencast awake by doing subtle micro-changes if needed
    const keepAliveInterval = setInterval(async () => {
      if (!recording) return;
      try {
        await page.evaluate(() => {
          const pill = document.querySelector('.status-pill');
          if (pill) pill.setAttribute('data-tick', String(Date.now()));
        });
      } catch {
        // ignore
      }
    }, 250);

    // --- TIMELINE EXECUTION (Matched to vo-manifest.json: total 171.00s) ---
    console.log('[Record] Beat 1: Problem & Interface Overview (0s - 25.2s)...');
    await sleepUntil(10.0);
    // Smooth micro scroll to center content
    await smoothScroll(page, 80, 800);

    console.log('[Record] Beat 2: Webhook Arrival & Normalisation (25.2s - 47.0s)...');
    await sleepUntil(25.2);
    // Select Courier Scenario
    await page.select('#scenario-select', 'person_porch_package');
    await sleep(400);
    // Click execute
    await page.click('#run-pipeline-btn');
    await sleep(2000);
    // Smooth scroll to Step 1 & Step 2 top
    await smoothScroll(page, 200, 700);

    console.log('[Record] Beat 3: Watermark Excision & Telemetry (47.0s - 78.1s)...');
    await sleepUntil(47.0);
    // Smooth scroll down to Step 2 frame comparison
    await smoothScroll(page, 480, 900);
    await sleepUntil(62.0);
    // Scroll slightly further down to clearly frame telemetry bar
    await smoothScroll(page, 620, 800);

    console.log('[Record] Beat 4: Bedrock Nova Pro Inference & Guardrail Audit (78.1s - 107.9s)...');
    await sleepUntil(78.1);
    // Scroll to Step 3 & Step 4 to frame description box, amber pill, and C2PA strip
    await smoothScroll(page, 820, 900);
    await sleepUntil(98.0);
    // Click Speak Caption
    await page.click('#speak-btn');

    console.log('[Record] Beat 5: First-Class Loud Refusal (107.9s - 131.3s)...');
    await sleepUntil(107.9);
    // Scroll back to top controls
    await smoothScroll(page, 0, 900);
    await sleep(500);
    // Select pitch black refusal scenario
    await page.select('#scenario-select', 'pitch_black_unusable');
    await sleep(400);
    await page.click('#run-pipeline-btn');
    await sleep(1500);
    // Scroll down to Step 3 to show bright red REFUSED banner
    await smoothScroll(page, 720, 900);

    console.log('[Record] Beat 6: Truth in Advertising & Provenance (131.3s - 162.3s)...');
    await sleepUntil(131.3);
    // Scroll back up to overview showing amber provenance strip and controls
    await smoothScroll(page, 280, 1000);
    await sleepUntil(146.0);
    await smoothScroll(page, 480, 800);

    console.log('[Record] Beat 7: Conclusion Outro Hold (162.3s - 171.0s)...');
    await sleepUntil(171.0);

    clearInterval(keepAliveInterval);
    recording = false;
    await client.send('Page.stopScreencast');
    await browser.close();

    console.log(`[Record] Capture complete! Total frames captured: ${frameManifest.length}`);

    // Write manifest JSON
    const manifestPath = join(__dirname, 'screencast-manifest.json');
    writeFileSync(manifestPath, JSON.stringify(frameManifest, null, 2));

    // Build concat.txt for ffmpeg
    const concatPath = join(__dirname, 'concat.txt');
    const concatLines = [];
    for (let i = 0; i < frameManifest.length; i++) {
      const cur = frameManifest[i];
      const next = frameManifest[i + 1];
      // compute duration in seconds
      const durSec = next ? Math.max((next.tMs - cur.tMs) / 1000, 0.033) : 1.0;
      concatLines.push(`file 'frames/${cur.file}'`);
      concatLines.push(`duration ${durSec.toFixed(4)}`);
    }
    // Repeat last frame per ffmpeg concat demuxer convention
    if (frameManifest.length > 0) {
      concatLines.push(`file 'frames/${frameManifest[frameManifest.length - 1].file}'`);
    }
    writeFileSync(concatPath, concatLines.join('\n'));
    console.log(`[Record] ffmpeg concat file written to ${concatPath}`);

  } finally {
    if (serverProcess) {
      try {
        serverProcess.kill('SIGTERM');
      } catch {}
      try {
        if (process.platform === 'win32' && serverProcess.pid) {
          execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { stdio: 'ignore' });
        }
      } catch {}
    }
  }
}

recordSession().catch(err => {
  console.error('[Record ERR]', err);
  process.exit(1);
});
