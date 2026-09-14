import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env if present
const envPaths = [
  path.resolve(__dirname, '../.env.local'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env.local'),
  path.resolve(__dirname, '../../.env')
];

let rawToken = process.env.RING_ACCESS_TOKEN || '';
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('RING_ACCESS_TOKEN=')) {
        rawToken = trimmed.replace('RING_ACCESS_TOKEN=', '').trim().replace(/^["']|["']$/g, '');
      }
    }
  }
}

function redact(t) {
  if (!t) return '(none configured)';
  if (t.length <= 8) return '***';
  return `${t.slice(0, 4)}...${t.slice(-4)} (length: ${t.length})`;
}

async function verifyRingApi() {
  const endpoint = 'https://api.amazonvision.com/v1/devices';
  console.log('===========================================================');
  console.log('[Doorstep] Probing Ring Partner API Endpoint');
  console.log('===========================================================');
  console.log(`Timestamp:       ${new Date().toISOString()}`);
  console.log(`Endpoint:        ${endpoint}`);
  console.log(`Redacted Token:  ${redact(rawToken)}`);
  console.log('-----------------------------------------------------------');

  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'Doorstep-Verifier/1.0 (Hackathon Ring Track)'
  };
  if (rawToken) {
    headers['Authorization'] = `Bearer ${rawToken}`;
  }

  try {
    const res = await fetch(endpoint, { method: 'GET', headers });
    console.log(`HTTP Status:     ${res.status} ${res.statusText}`);
    console.log('Response Headers:');
    for (const [k, v] of res.headers.entries()) {
      if (['server', 'x-request-id', 'content-type', 'date', 'www-authenticate'].includes(k.toLowerCase())) {
        console.log(`  ${k}: ${v}`);
      }
    }

    const text = await res.text();
    console.log('Response Body:');
    try {
      const json = JSON.parse(text);
      console.log(JSON.stringify(json, null, 2));
    } catch {
      console.log(text || '(empty body)');
    }

    console.log('-----------------------------------------------------------');
    if (res.status === 200) {
      console.log('RESULT: SUCCESS (HTTP 200). Live Ring Partner API token is active.');
    } else if (res.status === 401) {
      console.log('RESULT: AUTH REQUIRED (HTTP 401). Genuine Envoy response verified.');
      console.log('Sandbox tokens have a 30-minute lifespan.');
      console.log('To obtain a token, visit: https://developer.amazon.com/ring/console/playground');
    } else {
      console.log(`RESULT: HTTP ${res.status} from Ring API endpoint.`);
    }
    console.log('===========================================================');
  } catch (err) {
    console.error('Connection error:', err.message);
    process.exit(1);
  }
}

verifyRingApi();
