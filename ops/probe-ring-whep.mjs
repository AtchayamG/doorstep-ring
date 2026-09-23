import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from '../services/descriptor/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import jpeg from '../services/descriptor/node_modules/jpeg-js/index.js';
import pngjs from '../services/descriptor/node_modules/pngjs/lib/png.js';

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

// Ring documents a 303 to a short-lived download URL, not a direct GET snapshot.
// The signed URL and response bodies stay in memory and are never printed.
export async function probeSnapshot({ token, deviceId, fetchImpl = fetch, now = Date.now() }) {
  if (!token) throw new Error('TOKEN_MISSING');
  const endpoint = `${API}/devices/${encodeURIComponent(deviceId)}/media/image/download`;
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'latest_in_range',
      start_timestamp: now - 24 * 60 * 60 * 1000,
      end_timestamp: now,
      image_options: { format: 'jpeg' }
    }),
    redirect: 'manual',
    signal: AbortSignal.timeout(15000)
  });
  const requestBody = Buffer.from(await response.arrayBuffer());
  const result = {
    requestStatus: response.status,
    requestContentType: response.headers.get('content-type') || '',
    requestBytes: requestBody.length,
    downloadStatus: null,
    downloadContentType: '',
    downloadBytes: 0,
    imageBuffer: null,
    pixelSize: null
  };
  let imageResponse = response;
  let imageBody = requestBody;
  if (response.status === 303) {
    const location = response.headers.get('location');
    if (!location) return result;
    const signedUrl = new URL(location);
    if (signedUrl.protocol !== 'https:') return result;
    imageResponse = await fetchImpl(signedUrl, {
      method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(15000)
    });
    imageBody = Buffer.from(await imageResponse.arrayBuffer());
    result.downloadStatus = imageResponse.status;
    result.downloadContentType = imageResponse.headers.get('content-type') || '';
    result.downloadBytes = imageBody.length;
  }
  if (imageResponse.status === 200 && /^image\/(jpeg|png)(?:;|$)/i.test(imageResponse.headers.get('content-type') || '')) {
    try {
      const size = result.downloadContentType.startsWith('image/png') || result.requestContentType.startsWith('image/png')
        ? pngjs.PNG.sync.read(imageBody)
        : jpeg.decode(imageBody, { useTArray: true });
      result.imageBuffer = imageBody;
      result.pixelSize = `${size.width}x${size.height}`;
    } catch {
      // A 200 with undecodable data is not a captured frame.
    }
  }
  return result;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const token = process.env.RING_ACCESS_TOKEN;
  try {
    if (!token) throw new Error('TOKEN_MISSING');
    const devices = await fetch(`${API}/devices`, {
      method: 'GET', headers: { Authorization: `Bearer ${token}` },
      redirect: 'manual', signal: AbortSignal.timeout(15000)
    });
    console.log(`Snapshot device list HTTP: ${devices.status}`);
    if (devices.status === 200) {
      const listing = await devices.json();
      const playground = listing?.data?.find((d) => d?.attributes?.name === 'Playground Device');
      if (!playground?.id) throw new Error('PLAYGROUND_DEVICE_NOT_FOUND');
      const snapshot = await probeSnapshot({ token, deviceId: playground.id });
      console.log(`Snapshot request HTTP: ${snapshot.requestStatus}; content-type: ${snapshot.requestContentType || '(none)'}; bytes: ${snapshot.requestBytes}`);
      if (snapshot.downloadStatus !== null) {
        console.log(`Snapshot download HTTP: ${snapshot.downloadStatus}; content-type: ${snapshot.downloadContentType || '(none)'}; bytes: ${snapshot.downloadBytes}`);
      }
      if (snapshot.imageBuffer) {
        const contentType = snapshot.downloadContentType || snapshot.requestContentType;
        const extension = contentType.startsWith('image/png') ? 'png' : 'jpg';
        const output = resolve(dirname(fileURLToPath(import.meta.url)), 'captures', `ring-playground-snapshot.${extension}`);
        mkdirSync(dirname(output), { recursive: true });
        writeFileSync(output, snapshot.imageBuffer);
        console.log(`Snapshot saved: ${output}; pixels: ${snapshot.pixelSize}`);
      }
    }
  } catch (error) {
    console.error(`Snapshot probe failed: ${['TOKEN_MISSING', 'PLAYGROUND_DEVICE_NOT_FOUND'].includes(error.message) ? error.message : 'LOCAL_OR_NETWORK_ERROR'}`);
    process.exitCode = 2;
  }
  try {
    const result = await probeRingWhep({ token });
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
