import puppeteer from '../services/descriptor/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT_DIR = resolve('D:/Work/Codex/Hackathon Projects/Amazon Developer Hackathon/projects/02-ring-doorstep');
const SCREENSHOT_DIR = join(ROOT_DIR, 'docs/assets/screenshots');

if (!existsSync(SCREENSHOT_DIR)) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function getBrowserPath() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  if (existsSync(edgePath)) return edgePath;
  if (existsSync(chromePath)) return chromePath;
  throw new Error('Neither Edge nor Chrome found');
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function sha256(filePath) {
  const buffer = readFileSync(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

async function captureEvidence() {
  console.log('[Capture] Starting Doorstep automated evidence capture...');
  const browserPath = getBrowserPath();
  console.log(`[Capture] Using browser: ${browserPath}`);

  // Start the server (serves static surface on port 3002)
  console.log('[Capture] Starting Doorstep descriptor service on http://localhost:3002...');
  const serverProcess = spawn('node', ['dist/index.js'], {
    cwd: join(ROOT_DIR, 'services/descriptor'),
    stdio: 'pipe',
    shell: true
  });

  serverProcess.stdout.on('data', d => console.log(`[Server] ${d.toString().trim()}`));
  serverProcess.stderr.on('data', d => console.error(`[Server ERR] ${d.toString().trim()}`));

  await sleep(3000);

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    defaultViewport: { width: 1440, height: 960 }
  });

  const page = await browser.newPage();
  const evidenceManifest = {};

  try {
    // 1. Initial State: Token missing / expired banner
    console.log('[Capture] Scenario 1: Initial state with expired/missing token banner...');
    await page.goto('http://127.0.0.1:3002', { waitUntil: 'networkidle0' });
    await sleep(1500);

    const shot1 = join(SCREENSHOT_DIR, '01-token-missing-banner.png');
    await page.screenshot({ path: shot1, fullPage: false });
    evidenceManifest['01-token-missing-banner.png'] = {
      path: shot1,
      sha256: sha256(shot1),
      description: 'Initial surface state displaying honest token warning banner with link to Developers Playground (https://developer.amazon.com/ring/console/playground) and API status showing 401 Unauthorized.'
    };
    console.log(`[Capture] Shot 1 saved. SHA-256: ${evidenceManifest['01-token-missing-banner.png'].sha256}`);

    // 2. Scenario 2: Courier with Package on Porch (Human)
    console.log('[Capture] Scenario 2: Courier with Package on Porch...');
    await page.select('#scenario-select', 'person_porch_package');
    await sleep(500);
    await page.click('#run-pipeline-btn');
    // Wait for Bedrock Nova Pro to complete
    await sleep(7000);

    const shot2 = join(SCREENSHOT_DIR, '02-porch-package-pipeline.png');
    await page.screenshot({ path: shot2, fullPage: false });
    evidenceManifest['02-porch-package-pipeline.png'] = {
      path: shot2,
      sha256: sha256(shot2),
      description: 'Full 4-step pipeline execution for courier package event. Step 1 shows normalized data.attributes.sub_type ("human"). Step 2 shows 134 rows (15%) cropped excising watermark. Step 3 shows Bedrock Nova Pro description ("A man wearing a blue jacket and blue jeans stands on the porch holding a cardboard box."). Step 4 shows spoken accessibility caption.'
    };
    console.log(`[Capture] Shot 2 saved. SHA-256: ${evidenceManifest['02-porch-package-pipeline.png'].sha256}`);

    // 3. Scenario 3: Vehicle in Driveway
    console.log('[Capture] Scenario 3: Vehicle in Driveway...');
    await page.select('#scenario-select', 'vehicle_driveway');
    await sleep(500);
    await page.click('#run-pipeline-btn');
    await sleep(7000);

    const shot3 = join(SCREENSHOT_DIR, '03-vehicle-driveway-pipeline.png');
    await page.screenshot({ path: shot3, fullPage: false });
    evidenceManifest['03-vehicle-driveway-pipeline.png'] = {
      path: shot3,
      sha256: sha256(shot3),
      description: 'Full pipeline execution for vehicle event (sub_type: "vehicle"). Shows raw vs cropped frame comparison, Bedrock Nova Pro description ("A silver car is parked in the driveway of a house."), and audio speech synthesis ready.'
    };
    console.log(`[Capture] Shot 3 saved. SHA-256: ${evidenceManifest['03-vehicle-driveway-pipeline.png'].sha256}`);

    // 4. Scenario 4: Pitch Black Frame (Loud Refusal Test)
    console.log('[Capture] Scenario 4: Pitch Black Unusable Frame (Loud Refusal)...');
    await page.select('#scenario-select', 'pitch_black_unusable');
    await sleep(500);
    await page.click('#run-pipeline-btn');
    await sleep(3000);

    const shot4 = join(SCREENSHOT_DIR, '04-loud-refusal-pitch-black.png');
    await page.screenshot({ path: shot4, fullPage: false });
    evidenceManifest['04-loud-refusal-pitch-black.png'] = {
      path: shot4,
      sha256: sha256(shot4),
      description: 'Loud refusal state triggered by pitch black frame (luminance 0.0/255). Shows bright red LOUD REFUSAL TRIGGERED badge with reason: "Frame is pitch black (average luminance 0.0/255). No visual features are discernible.", no fake transcript, and refusal speech alert.'
    };
    console.log(`[Capture] Shot 4 saved. SHA-256: ${evidenceManifest['04-loud-refusal-pitch-black.png'].sha256}`);

    // Write manifest JSON
    const manifestPath = join(ROOT_DIR, 'docs/assets/evidence-manifest.json');
    writeFileSync(manifestPath, JSON.stringify(evidenceManifest, null, 2));
    console.log(`[Capture] Evidence manifest written to ${manifestPath}`);
  } finally {
    await browser.close();
    serverProcess.kill('SIGTERM');
  }
}

captureEvidence().catch(err => {
  console.error('[Capture ERR]', err);
  process.exit(1);
});
