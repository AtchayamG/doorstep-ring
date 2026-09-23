// Owner-run capture of ONE frame from the Ring Developers Playground over WHEP, using headless Chrome as the
// WebRTC peer. Why Chrome and not werift: on 2026-09-23 the Playground accepted the browser's offer (HTTP 201)
// and rejected the werift offer (HTTP 500). The browser offers the full H264 profile set (42001f, 4d001f,
// 64001f, ...) where werift offers only 42e01f and VP8, so this reuses the offer shape that is known to work.
//
// The Ring token stays in this Node process. The browser only creates the offer, applies the answer and draws
// the decoded frame; it never sees the token. Output is status-only: HTTP codes, negotiated codec, ICE state,
// pixel size and whether the frame is blank. No SDP, token, device id or IP address is printed.
//
//   powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\with-ring-token.ps1 capture-ring-browser.mjs
//   node ops/capture-ring-browser.mjs --self-test     (no token, no network: local sender -> same capture path)
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from '../services/descriptor/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const API = 'https://api.amazonvision.com/v1';
const here = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(here, 'captures');
const imagePath = resolve(outputDir, 'ring-playground-whep.jpg');

/** Negotiated video codec from an SDP answer: the first payload type on m=video and its rtpmap. */
export function negotiatedCodec(sdp) {
  const m = /^m=video \d+ \S+ (\d+)/m.exec(sdp || '');
  if (!m) return null;
  const map = new RegExp(`^a=rtpmap:${m[1]} ([^/\\r\\n]+)`, 'm').exec(sdp);
  const fmtp = new RegExp(`^a=fmtp:${m[1]} (.*)$`, 'm').exec(sdp);
  const profile = /profile-level-id=([0-9a-f]{6})/i.exec(fmtp?.[1] || '');
  return map ? `${map[1].toUpperCase()}${profile ? ` ${profile[1].toLowerCase()}` : ''}` : null;
}

function browserPath() {
  return ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
}

// Runs inside the page. Creates the recvonly peer and returns the complete (non-trickle) offer.
const PAGE_OFFER = async () => {
  const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  window.__pc = pc;
  window.__track = new Promise((res) => pc.addEventListener('track', (e) => res(e.track)));
  pc.addTransceiver('video', { direction: 'recvonly' });
  await pc.setLocalDescription(await pc.createOffer());
  await Promise.race([
    new Promise((res) => {
      if (pc.iceGatheringState === 'complete') return res();
      pc.addEventListener('icegatheringstatechange', () => pc.iceGatheringState === 'complete' && res());
    }),
    new Promise((res) => setTimeout(res, 8000))
  ]);
  return pc.localDescription.sdp;
};

// Runs inside the page. Applies the answer, waits for decoded frames, returns a JPEG data URL + safe facts.
const PAGE_CAPTURE = async (answer, waitMs) => {
  const pc = window.__pc;
  await pc.setRemoteDescription({ type: 'answer', sdp: answer });
  const timeout = (ms, code) => new Promise((_, rej) => setTimeout(() => rej(new Error(code)), ms));
  const track = await Promise.race([window.__track, timeout(waitMs, 'NO_VIDEO_TRACK')]);
  const video = document.createElement('video');
  video.muted = true; video.playsInline = true; video.srcObject = new MediaStream([track]);
  document.body.appendChild(video);
  await video.play().catch(() => {});
  let frames = 0;
  await Promise.race([new Promise((res) => {
    const tick = () => { frames++; if (frames >= 15) return res(); video.requestVideoFrameCallback(tick); };
    video.requestVideoFrameCallback(tick);
  }), timeout(waitMs, 'NO_DECODED_FRAME')]);
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let sum = 0, sq = 0, n = 0;
  for (let i = 0; i < px.length; i += 4 * 97) { const y = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; sum += y; sq += y * y; n++; }
  const mean = sum / n;
  const std = Math.sqrt(Math.max(0, sq / n - mean * mean));
  const stats = await pc.getStats();
  let codec = null;
  stats.forEach((s) => { if (s.type === 'inbound-rtp' && s.kind === 'video' && s.codecId) codec = stats.get(s.codecId)?.mimeType ?? null; });
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.92), width: canvas.width, height: canvas.height,
    frames, iceState: pc.iceConnectionState, statsCodec: codec, lumaMean: Math.round(mean), lumaStd: Math.round(std) };
};

// Self-test only: a local sender peer inside the same page answers the offer with a moving canvas, so the
// capture path (answer -> track -> decode -> JPEG) is exercised without Ring, a token or the network.
const PAGE_SELFTEST_ANSWER = async (offer) => {
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
  const ctx = canvas.getContext('2d'); let t = 0;
  setInterval(() => { t++; ctx.fillStyle = '#123'; ctx.fillRect(0, 0, 640, 360); ctx.fillStyle = '#fc0'; ctx.fillRect((t * 7) % 600, 150, 40, 40); }, 33);
  const sender = new RTCPeerConnection();
  window.__sender = sender;
  canvas.captureStream(30).getTracks().forEach((tr) => sender.addTrack(tr));
  await sender.setRemoteDescription({ type: 'offer', sdp: offer });
  const h264 = RTCRtpReceiver.getCapabilities('video').codecs.filter((c) => c.mimeType === 'video/H264');
  if (h264.length) sender.getTransceivers()[0].setCodecPreferences(h264);
  await sender.setLocalDescription(await sender.createAnswer());
  await new Promise((res) => { if (sender.iceGatheringState === 'complete') return res(); sender.addEventListener('icegatheringstatechange', () => sender.iceGatheringState === 'complete' && res()); });
  return sender.localDescription.sdp;
};

async function withBrowser(fn) {
  const exe = browserPath();
  if (!exe) throw new Error('BROWSER_UNAVAILABLE');
  const browser = await puppeteer.launch({ executablePath: exe, headless: true,
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--disable-features=WebRtcHideLocalIpsWithMdns'] });
  try { return await fn(await browser.newPage()); } finally { await browser.close(); }
}

function saveFrame(result) {
  const jpeg = Buffer.from(result.dataUrl.split(',')[1], 'base64');
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) throw new Error('NOT_JPEG');
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(imagePath, jpeg);
  return jpeg.length;
}

function report(result, bytes, saved = true) {
  console.log(`Decoded frames: ${result.frames}; ICE: ${result.iceState}; codec (stats): ${result.statsCodec ?? 'unknown'}`);
  console.log(`Frame: ${result.width}x${result.height}; luma mean ${result.lumaMean}, std ${result.lumaStd}; blank: ${result.lumaStd < 3}`);
  console.log(saved ? `Captured JPEG: ops/captures/ring-playground-whep.jpg (${bytes} bytes)` : `Encoded JPEG in memory (${bytes} bytes); not saved`);
}

async function selfTest() {
  await withBrowser(async (page) => {
    const offer = await page.evaluate(PAGE_OFFER);
    const answer = await page.evaluate(PAGE_SELFTEST_ANSWER, offer);
    console.log(`SELF-TEST answer codec: ${negotiatedCodec(answer)}`);
    const h264 = await page.evaluate(() => RTCRtpReceiver.getCapabilities('video').codecs.filter((c) => c.mimeType === 'video/H264').map((c) => /profile-level-id=([0-9a-f]{6})/.exec(c.sdpFmtpLine || '')?.[1]).filter(Boolean));
    console.log(`SELF-TEST H264 receive profiles in this browser: ${[...new Set(h264)].join(', ') || 'none'}`);
    const result = await page.evaluate(PAGE_CAPTURE, answer, 15000);
    const bytes = Buffer.from(result.dataUrl.split(',')[1], 'base64').length;
    report(result, bytes, false);
    console.log('SELF-TEST: capture path works (no file written)');
  });
}

async function capture() {
  const token = process.env.RING_ACCESS_TOKEN;
  if (!token) throw new Error('TOKEN_MISSING');
  const headers = { Authorization: `Bearer ${token}` };
  const list = await fetch(`${API}/devices`, { headers, redirect: 'manual', signal: AbortSignal.timeout(15000) });
  console.log(`Device list HTTP: ${list.status}`);
  if (list.status !== 200) throw new Error('DEVICE_LIST_UNAVAILABLE');
  const device = (await list.json())?.data?.find((d) => d?.attributes?.name === 'Playground Device');
  if (!device?.id) throw new Error('PLAYGROUND_DEVICE_NOT_FOUND');
  const endpoint = `${API}/devices/${encodeURIComponent(device.id)}/media/streaming/whep/sessions`;

  await withBrowser(async (page) => {
    const offer = await page.evaluate(PAGE_OFFER);
    const res = await fetch(endpoint, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/sdp' },
      body: offer, redirect: 'manual', signal: AbortSignal.timeout(15000) });
    console.log(`WHEP session HTTP: ${res.status}`);
    let sessionUrl = null;
    const location = res.headers.get('location');
    if (location) {
      const u = new URL(location, endpoint);
      if (u.origin === new URL(API).origin && u.pathname.startsWith(new URL(endpoint).pathname + '/')) sessionUrl = u;
    }
    try {
      if (res.status !== 201) throw new Error('WHEP_SESSION_UNAVAILABLE');
      const answer = await res.text();
      if (!answer.startsWith('v=0')) throw new Error('SDP_ANSWER_UNAVAILABLE');
      console.log(`Negotiated codec (answer): ${negotiatedCodec(answer) ?? 'unknown'}`);
      const result = await page.evaluate(PAGE_CAPTURE, answer, 25000);
      report(result, saveFrame(result));
    } finally {
      if (sessionUrl) {
        const del = await fetch(sessionUrl, { method: 'DELETE', headers, redirect: 'manual', signal: AbortSignal.timeout(10000) }).catch(() => null);
        console.log(`WHEP session close HTTP: ${del ? del.status : 'failed'}`);
      }
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const safe = new Set(['TOKEN_MISSING', 'BROWSER_UNAVAILABLE', 'DEVICE_LIST_UNAVAILABLE', 'PLAYGROUND_DEVICE_NOT_FOUND',
    'WHEP_SESSION_UNAVAILABLE', 'SDP_ANSWER_UNAVAILABLE', 'NO_VIDEO_TRACK', 'NO_DECODED_FRAME', 'NOT_JPEG']);
  try {
    if (process.argv.includes('--self-test')) await selfTest(); else await capture();
  } catch (error) {
    // Exceptions can carry response bodies or addresses. Only fixed codes leave this process.
    const msg = String(error?.message || '');
    const code = [...safe].find((c) => msg.includes(c));
    console.error(`Capture failed: ${code ?? 'LOCAL_OR_NETWORK_ERROR'}`);
    process.exitCode = 2;
  }
}
