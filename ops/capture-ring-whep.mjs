import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), '../services/descriptor/package.json'));
const { RTCPeerConnection, defaultPeerConfig, useH264 } = require('werift');
const { MediaRecorder } = require('werift/nonstandard');
const jpeg = require('jpeg-js');
const run = promisify(execFile);
const API = 'https://api.amazonvision.com/v1';
const outputDir = resolve(dirname(fileURLToPath(import.meta.url)), 'captures');
const mediaPath = resolve(outputDir, 'ring-playground-whep.webm');
const imagePath = resolve(outputDir, 'ring-playground-whep.jpg');

const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));

async function capture() {
  const token = process.env.RING_ACCESS_TOKEN;
  if (!token) throw new Error('TOKEN_MISSING');
  const headers = { Authorization: `Bearer ${token}` };
  const list = await fetch(`${API}/devices`, { headers, redirect: 'manual', signal: AbortSignal.timeout(15000) });
  console.log(`Device list HTTP: ${list.status}`);
  if (list.status !== 200) throw new Error('DEVICE_LIST_UNAVAILABLE');
  const devices = await list.json();
  const device = devices?.data?.find((item) => item?.attributes?.name === 'Playground Device');
  if (!device?.id) throw new Error('PLAYGROUND_DEVICE_NOT_FOUND');

  const endpoint = `${API}/devices/${encodeURIComponent(device.id)}/media/streaming/whep/sessions`;
  const peer = new RTCPeerConnection({ codecs: { video: [...defaultPeerConfig.codecs.video, useH264()] } });
  let recorder;
  let sessionUrl;
  let received = false;
  let signalPacket;
  const firstPacket = new Promise((resolvePacket) => { signalPacket = resolvePacket; });
  try {
    peer.addTransceiver('video', { direction: 'recvonly' });
    peer.onTrack.subscribe((track) => {
      if (track.kind !== 'video') return;
      mkdirSync(outputDir, { recursive: true });
      recorder = new MediaRecorder({ tracks: [track], path: mediaPath });
      track.onReceiveRtp.subscribe(() => {
        received = true;
        signalPacket();
      });
    });
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    const sdp = peer.localDescription?.sdp;
    if (!sdp) throw new Error('LOCAL_SDP_UNAVAILABLE');
    const response = await fetch(endpoint, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/sdp' }, body: sdp,
      redirect: 'manual', signal: AbortSignal.timeout(15000)
    });
    console.log(`WHEP session HTTP: ${response.status}`);
    if (response.status !== 201) throw new Error('WHEP_SESSION_UNAVAILABLE');
    const location = response.headers.get('location');
    if (location) {
      const candidate = new URL(location, endpoint);
      if (candidate.origin === new URL(API).origin && candidate.pathname.startsWith(new URL(endpoint).pathname + '/')) {
        sessionUrl = candidate;
      }
    }
    if (!response.headers.get('content-type')?.toLowerCase().startsWith('application/sdp')) throw new Error('SDP_ANSWER_UNAVAILABLE');
    const answer = await response.text();
    if (!answer.startsWith('v=0')) throw new Error('SDP_ANSWER_UNAVAILABLE');
    await peer.setRemoteDescription({ type: 'answer', sdp: answer });
    await Promise.race([firstPacket, delay(20000)]);
    console.log(`Video RTP received: ${received}`);
    if (!received) throw new Error('NO_VIDEO_RTP');
    await delay(5000);
  } finally {
    try { if (recorder) await recorder.stop(); } catch { /* no media to finalize */ }
    try { await peer.close(); } catch { /* best effort */ }
    if (sessionUrl) {
      try { await fetch(sessionUrl, { method: 'DELETE', headers, redirect: 'manual', signal: AbortSignal.timeout(10000) }); }
      catch { /* best effort */ }
    }
  }
  if (!existsSync(mediaPath)) throw new Error('RECORDED_MEDIA_MISSING');
  try {
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-skip_frame', 'nokey', '-i', mediaPath, '-frames:v', '1', imagePath], { timeout: 30000 });
  } catch {
    throw new Error('FRAME_DECODE_FAILED');
  }
  const image = readFileSync(imagePath);
  const pixels = jpeg.decode(image, { useTArray: true });
  console.log(`Captured JPEG: ${imagePath}; pixels: ${pixels.width}x${pixels.height}`);
}

try {
  rmSync(imagePath, { force: true });
  rmSync(mediaPath, { force: true });
  await capture();
} catch (error) {
  // Network exceptions and response bodies may contain account data. Only fixed codes leave this process.
  const safe = new Set([
    'TOKEN_MISSING', 'DEVICE_LIST_UNAVAILABLE', 'PLAYGROUND_DEVICE_NOT_FOUND',
    'LOCAL_SDP_UNAVAILABLE', 'WHEP_SESSION_UNAVAILABLE', 'SDP_ANSWER_UNAVAILABLE',
    'NO_VIDEO_RTP', 'RECORDED_MEDIA_MISSING', 'FRAME_DECODE_FAILED'
  ]);
  console.error(`Capture failed: ${safe.has(error.message) ? error.message : 'LOCAL_OR_NETWORK_ERROR'}`);
  process.exitCode = 2;
}
