import { createServer } from './server.js';
import { config, getRedactedToken } from './config.js';

const app = createServer();
const port = config.port;

app.listen(port, () => {
  console.log(`[Doorstep] Event-to-description service listening on http://localhost:${port}`);
  console.log(`[Doorstep] Bedrock model: ${config.bedrockModelId} (region: ${config.awsRegion})`);
  console.log(`[Doorstep] Ring API token: ${getRedactedToken()}`);
  console.log(`[Doorstep] Ring API base: ${config.ringApiBaseUrl}`);
});
