import { createServer } from './server.js';
import { config, getRedactedToken } from './config.js';

const app = createServer();
const port = config.port;
// Loopback only. A bare app.listen(port) binds every interface (0.0.0.0), which
// put a Bedrock-spending endpoint on the local network. Set HOST to expose it.
const HOST = process.env.HOST || '127.0.0.1';

app.listen(port, HOST, () => {
  console.log(`[Doorstep] Event-to-description service listening on http://${HOST}:${port}`);
  console.log(`[Doorstep] Bedrock model: ${config.bedrockModelId} (region: ${config.awsRegion})`);
  console.log(`[Doorstep] Ring API token: ${getRedactedToken()}`);
  console.log(`[Doorstep] Ring API base: ${config.ringApiBaseUrl}`);
});
