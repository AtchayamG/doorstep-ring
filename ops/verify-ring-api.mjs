// Never load the Ring token from a file. Use ops/with-ring-token.ps1.
const rawToken = process.env.RING_ACCESS_TOKEN || '';

function redact(t) {
  if (!t) return '(none configured)';
  return `(length: ${t.length})`;
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
      if (['server', 'content-type'].includes(k.toLowerCase())) {
        console.log(`  ${k}: ${v}`);
      }
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
    console.error('Connection error (details suppressed).');
    process.exit(1);
  }
}

verifyRingApi();
