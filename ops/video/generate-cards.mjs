import puppeteer from '../../services/descriptor/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import { mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CARDS_DIR = join(__dirname, 'cards');
mkdirSync(CARDS_DIR, { recursive: true });

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const voManifest = JSON.parse(readFileSync(join(__dirname, 'vo-manifest.json'), 'utf-8'));

async function renderCards() {
  console.log('[Cards] Launching headless Edge to render title cards and lower-thirds...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080', '--force-device-scale-factor=1']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  // 1. Opening Card (card-open.png)
  console.log('[Cards] Rendering card-open.png...');
  const openHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1920px; height: 1080px;
    background: radial-gradient(circle at 50% 40%, #1e293b 0%, #0f172a 70%, #020617 100%);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #f8fafc;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    position: relative; overflow: hidden;
  }
  .grid-pattern {
    position: absolute; inset: 0;
    background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
  }
  .content { position: relative; z-index: 2; text-align: center; max-width: 1300px; padding: 40px; }
  .badge-row { display: flex; gap: 16px; justify-content: center; margin-bottom: 28px; }
  .badge {
    background: rgba(30, 41, 59, 0.8); border: 1px solid #38bdf8;
    color: #38bdf8; padding: 8px 18px; border-radius: 9999px;
    font-size: 16px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  }
  .badge.track { border-color: #fb923c; color: #fb923c; }
  h1 { font-size: 92px; font-weight: 900; letter-spacing: -0.03em; margin-bottom: 20px; line-height: 1; }
  h1 span { background: linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .tagline { font-size: 34px; font-weight: 400; color: #94a3b8; margin-bottom: 40px; line-height: 1.4; }
  .features-row {
    display: flex; gap: 24px; justify-content: center; margin-top: 10px;
  }
  .feat-card {
    background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px; padding: 18px 24px; font-size: 18px; font-weight: 600; color: #cbd5e1;
  }
  .footer-credit {
    position: absolute; bottom: 45px; font-size: 20px; color: #64748b; font-weight: 500;
  }
</style>
</head>
<body>
  <div class="grid-pattern"></div>
  <div class="content">
    <div class="badge-row">
      <div class="badge">Amazon Developer Hackathon 2026</div>
      <div class="badge track">Project 2 • Ring Track</div>
    </div>
    <h1><span>Doorstep</span></h1>
    <p class="tagline">Objective Spoken Video Descriptions for Blind & Low-Vision Ring Users</p>
    <div class="features-row">
      <div class="feat-card">⚡ Ring Webhook Normalisation</div>
      <div class="feat-card">✂️ 15% Watermark Excision</div>
      <div class="feat-card">🧠 Bedrock Nova Pro Guardrails</div>
      <div class="feat-card">🛑 First-Class Loud Refusal</div>
    </div>
  </div>
  <div class="footer-credit">Built by Atchayam G (solo entrant) • Narration: Edge Neural TTS • Verified Live Demonstrations</div>
</body>
</html>`;

  await page.setContent(openHtml, { waitUntil: 'load' });
  await page.screenshot({ path: join(CARDS_DIR, 'card-open.png'), omitBackground: false });

  // 2. Closing Card (card-close.png)
  console.log('[Cards] Rendering card-close.png...');
  const closeHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1920px; height: 1080px;
    background: radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 70%, #020617 100%);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #f8fafc;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    position: relative; overflow: hidden;
  }
  .grid-pattern {
    position: absolute; inset: 0;
    background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
  }
  .content { position: relative; z-index: 2; text-align: center; max-width: 1300px; padding: 40px; }
  h1 { font-size: 80px; font-weight: 900; letter-spacing: -0.02em; margin-bottom: 20px; }
  h1 span { background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .tagline { font-size: 32px; font-weight: 400; color: #94a3b8; margin-bottom: 36px; line-height: 1.4; }
  .provenance-box {
    background: rgba(15, 23, 42, 0.7); border: 1px solid #eab308;
    border-radius: 16px; padding: 24px 32px; font-size: 20px; color: #fef08a; line-height: 1.5;
    margin-bottom: 40px; text-align: left; max-width: 900px; margin-left: auto; margin-right: auto;
  }
  .provenance-box strong { color: #fde047; }
  .footer-row { display: flex; gap: 32px; justify-content: center; font-size: 22px; color: #94a3b8; font-weight: 600; }
  .footer-row span { color: #38bdf8; }
</style>
</head>
<body>
  <div class="grid-pattern"></div>
  <div class="content">
    <h1><span>Doorstep</span></h1>
    <p class="tagline">Verified API Reality • First-Class Refusals • 100% Disclosure Integrity</p>
    <div class="provenance-box">
      <strong>Media Provenance & API Reality:</strong><br>
      • Ring Developers Playground: six discovery endpoints and event history return HTTP 200.<br>
      • One real frame received over WebRTC WHEP from the Playground sandbox device (not a customer camera) and described by Nova Pro. Stream clip: “Thief stealing our package” by frollard, CC BY 4.0.<br>
      • Photographic presets: AI-generated test frames with signed Google C2PA Content Credentials, labelled on screen.
    </div>
    <div class="footer-row">
      <div>Author: <span>Atchayam G</span></div>
      <div>Track: <span>Ring</span></div>
      <div>Hackathon: <span>Build, Ship, Shape 2026</span></div>
    </div>
    <div class="tts-disclosure" style="margin-top: 24px; font-size: 19px; color: #64748b; font-weight: 500;">
      Narration synthesized with Microsoft Edge Neural TTS (en-IN-PrabhatNeural)
    </div>
  </div>
</body>
</html>`;

  await page.setContent(closeHtml, { waitUntil: 'load' });
  await page.screenshot({ path: join(CARDS_DIR, 'card-close.png'), omitBackground: false });

  // 3. Lower-Third Overlays (lt-01.png through lt-06.png)
  for (let i = 0; i < voManifest.length - 1; i++) {
    const cue = voManifest[i];
    const filename = `lt-${String(i + 1).padStart(2, '0')}.png`;
    console.log(`[Cards] Rendering ${filename} (${cue.id})...`);

    const ltHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1920px; height: 1080px;
    background: transparent;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    position: relative; overflow: hidden;
  }
  .scrim {
    position: absolute; bottom: 0; left: 0; width: 1920px; height: 260px;
    background: linear-gradient(to top, rgba(2, 6, 23, 0.94) 0%, rgba(2, 6, 23, 0.8) 50%, rgba(2, 6, 23, 0) 100%);
    display: flex; align-items: flex-end; padding: 0 70px 45px 70px;
  }
  .lt-card {
    display: flex; align-items: center; gap: 24px;
    background: rgba(15, 23, 42, 0.88); border: 1px solid rgba(255,255,255,0.15);
    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    border-radius: 16px; padding: 18px 30px;
    border-left: 6px solid #38bdf8;
  }
  .lt-card.amber { border-left-color: #f59e0b; }
  .lt-card.red { border-left-color: #ef4444; }
  .lt-card.purple { border-left-color: #a855f7; }
  .text-col { display: flex; flex-direction: column; gap: 4px; }
  .eyebrow {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 15px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
    color: #38bdf8;
  }
  .amber .eyebrow { color: #fbbf24; }
  .red .eyebrow { color: #f87171; }
  .purple .eyebrow { color: #c084fc; }
  .headline {
    font-size: 30px; font-weight: 800; color: #f8fafc; letter-spacing: -0.01em; line-height: 1.2;
  }
</style>
</head>
<body>
  <div class="scrim">
    <div class="lt-card ${i === 2 ? 'amber' : (i === 4 ? 'red' : (i === 5 ? 'amber' : ''))}">
      <div class="text-col">
        <div class="eyebrow">${cue.eyebrow}</div>
        <div class="headline">${cue.headline}</div>
      </div>
    </div>
  </div>
</body>
</html>`;

    await page.setContent(ltHtml, { waitUntil: 'load' });
    await page.screenshot({ path: join(CARDS_DIR, filename), omitBackground: true });
  }

  await browser.close();
  console.log('[Cards] All title cards and lower-third graphics rendered successfully!');
}

renderCards().catch(err => {
  console.error('[Cards ERR]', err);
  process.exit(1);
});
