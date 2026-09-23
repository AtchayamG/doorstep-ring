import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from '../services/descriptor/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const API = 'https://api.amazonvision.com/v1';

export async function browserOffer() {
  const browserPath = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ].find(existsSync);
  if (!browserPath) throw new Error('BROWSER_UNAVAILABLE');
  const browser = await puppeteer.launch({ executablePath: browserPath, headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    // The browser only creates a WebRTC offer. It never receives the Ring token.
    return await page.evaluate(async () => {
      const peer = new RTCPeerConnection();
      try {
        peer.addTransceiver('video', { direction: 'recvonly' });
        await peer.setLocalDescription(await peer.createOffer());
        await Promise.race([
          new Promise((resolve) => {
            if (peer.iceGatheringState === 'complete') return resolve();
            peer.addEventListener('icegatheringstatechange', () => {
              if (peer.iceGatheringState === 'complete') resolve();
            });
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('ICE_TIMEOUT')), 10000))
        ]);
        return peer.localDescription.sdp;
      } finally {
        peer.close();
      }
    });
  } finally {
    await browser.close();
  }
}

export async function probeRingWhep({ token, fetchImpl = fetch, createOffer = browserOffer }) {
  if (!token) throw new Error('TOKEN_MISSING');
  const headers = { Authorization: `Bearer ${token}` };
  const devices = await fetchImpl(`${API}/devices`, {
    method: 'GET', headers, redirect: 'manual', signal: AbortSignal.timeout(15000)
  });
  const result = {
    deviceStatus: devices.status,
    sessionStatus: null,
    contentType: '',
    sdpAnswer: false,
    iceCandidateTypes: []
  };
  if (devices.status !== 200) return result;
  const listing = await devices.json();
  const playground = listing?.data?.find((d) => d?.attributes?.name === 'Playground Device');
  if (!playground?.id) throw new Error('PLAYGROUND_DEVICE_NOT_FOUND');

  const endpoint = `${API}/devices/${encodeURIComponent(playground.id)}/media/streaming/whep/sessions`;
  const offer = await createOffer();
  const session = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/sdp' },
    body: offer,
    redirect: 'manual',
    signal: AbortSignal.timeout(15000)
  });
  result.sessionStatus = session.status;
  result.contentType = session.headers.get('content-type') || '';
  if (session.status === 201) {
    const answer = await session.text();
    result.sdpAnswer = result.contentType.toLowerCase().startsWith('application/sdp') && answer.startsWith('v=0');
    if (result.sdpAnswer) {
      result.iceCandidateTypes = [...new Set(
        [...answer.matchAll(/^a=candidate:.*\btyp (host|srflx|prflx|relay)\b/gm)].map((m) => m[1])
      )].sort();
    }
    const location = session.headers.get('location');
    if (location) {
      const closeUrl = new URL(location, endpoint);
      if (closeUrl.origin === new URL(API).origin && closeUrl.pathname.startsWith(new URL(endpoint).pathname + '/')) {
        try {
          await fetchImpl(closeUrl, {
            method: 'DELETE', headers, redirect: 'manual', signal: AbortSignal.timeout(15000)
          });
        } catch {
          // Preserve the feasibility result even when best-effort session cleanup fails.
        }
      }
    }
  }
  return result;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const result = await probeRingWhep({ token: process.env.RING_ACCESS_TOKEN });
    console.log(`Device list HTTP: ${result.deviceStatus}`);
    console.log(`WHEP session HTTP: ${result.sessionStatus ?? 'not attempted'}`);
    console.log(`Content-Type: ${result.contentType || '(none)'}`);
    console.log(`SDP answer: ${result.sdpAnswer}`);
    console.log(`ICE candidate types: ${result.iceCandidateTypes.join(', ') || '(none)'}`);
    if (result.deviceStatus !== 200 || result.sessionStatus !== 201 || !result.sdpAnswer) process.exitCode = 2;
  } catch (error) {
    // Never print exception messages: network responses can contain account data.
    console.error(`Probe failed: ${['TOKEN_MISSING', 'BROWSER_UNAVAILABLE', 'PLAYGROUND_DEVICE_NOT_FOUND'].includes(error.message) ? error.message : 'LOCAL_OR_NETWORK_ERROR'}`);
    process.exitCode = 2;
  }
}
