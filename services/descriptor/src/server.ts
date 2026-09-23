import express, { Request, Response } from 'express';
import { corsForAllowedOrigins, originGuard } from './origin-guard.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config, getRedactedToken } from './config.js';
import { RingPartnerClient } from './ring-client.js';
import { executeDoorstepPipeline, RingWebhookPayload } from './event-pipeline.js';
import { SAMPLE_SCENARIOS } from './sample-frames.js';
import { auditDescription, GuardrailAudit } from './guardrail-audit.js';
import { getPlaygroundFrame } from './playground-frame.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const playgroundFramePath = path.resolve(__dirname, '../../../ops/captures/ring-playground-whep.jpg');

export function createServer() {
  const app = express();
  const ringClient = new RingPartnerClient();

  // Refuse foreign browser origins and rebound Host names before any route runs;
  // /api/describe spends Bedrock on the operator's account. See origin-guard.ts.
  app.use(originGuard());
  app.use(corsForAllowedOrigins());
  app.use(express.json({ limit: '25mb' }));

  // API Status endpoint
  app.get('/api/status', async (_req: Request, res: Response) => {
    const tokenStatus = await ringClient.checkTokenStatus();
    res.json({
      service: 'doorstep-descriptor-service',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      tokenStatus: {
        valid: tokenStatus.valid,
        httpStatus: tokenStatus.httpStatus,
        statusText: tokenStatus.statusText,
        redactedToken: tokenStatus.redactedToken,
        message: tokenStatus.message,
        playgroundUrl: tokenStatus.playgroundUrl,
        endpointChecked: tokenStatus.endpointChecked,
        requestId: tokenStatus.requestId,
        serverHeader: tokenStatus.serverHeader
      },
      bedrock: {
        modelId: config.bedrockModelId,
        region: config.awsRegion,
        ready: true
      }
    });
  });

  // Ring webhook endpoint
  app.post('/api/webhook', async (req: Request, res: Response) => {
    try {
      const payload = req.body as RingWebhookPayload;
      const result = await executeDoorstepPipeline(payload, undefined, ringClient);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({
        error: 'Pipeline execution failed',
        message: err.message
      });
    }
  });

  // Direct describe endpoint (accepts scenarioId, custom base64, or webhook payload)
  app.post('/api/describe', async (req: Request, res: Response) => {
    try {
      const { scenarioId, imageBase64, eventType, subType, deviceId } = req.body;

      let imageBuffer: Buffer | undefined;
      let effectiveEventType = eventType || 'motion_detected';
      // No invented sensor hint: an upload or a Playground capture has no Ring event behind it.
      let effectiveSubType: string | undefined = subType || undefined;
      // Where this frame came from, travelling with the frame itself. The UI
      // labels the image from this and nothing else, so a generated fixture
      // can never be presented to a viewer as camera output.
      let frameOrigin: string = 'procedural';

      if (scenarioId) {
        const scenario = SAMPLE_SCENARIOS.find((s) => s.id === scenarioId);
        if (scenarioId === 'ring_playground_whep') {
          const fixture = SAMPLE_SCENARIOS.find((s) => s.id === 'person_porch_package')!;
          const frame = await getPlaygroundFrame(
            async () => {
              const buffer = await fs.promises.readFile(playgroundFramePath);
              if (buffer[0] !== 0xff || buffer[1] !== 0xd8) throw new Error('Not JPEG');
              return buffer;
            },
            fixture.generateImage
          );
          imageBuffer = frame.buffer;
          frameOrigin = frame.frameOrigin;
          // The Playground token cannot read events (403), so no Ring sub_type exists for this frame.
          effectiveEventType = 'motion_detected';
          effectiveSubType = undefined;
        } else if (scenario) {
          imageBuffer = scenario.generateImage();
          effectiveEventType = scenario.eventType;
          effectiveSubType = scenario.subType;
          frameOrigin = scenario.frameOrigin ?? 'procedural';
        }
      } else if (imageBase64) {
        frameOrigin = 'user-upload';
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        imageBuffer = Buffer.from(cleanBase64, 'base64');
      }

      const payload: RingWebhookPayload = {
        event_type: effectiveEventType,
        data: {
          device_id: deviceId || 'ring-front-doorbell',
          attributes: {
            sub_type: effectiveSubType
          }
        }
      };

      const result = await executeDoorstepPipeline(payload, imageBuffer, ringClient);
      const guardrails = result.guardrails || auditDescription(result.description || '');
      res.json({ ...result, frameOrigin, guardrails });
    } catch (err: any) {
      res.status(500).json({
        error: 'Pipeline description failed',
        message: err.message
      });
    }
  });

  // Available sample scenarios for testing and demonstration
  app.get('/api/samples', (_req: Request, res: Response) => {
    res.json({
      scenarios: [...SAMPLE_SCENARIOS.map((s) => ({
        id: s.id,
        name: s.name,
        eventType: s.eventType,
        subType: s.subType,
        descriptionHint: s.descriptionHint,
        isBlackout: s.isBlackout ?? false,
        frameOrigin: s.frameOrigin ?? 'procedural'
      })), {
        id: 'ring_playground_whep',
        name: 'Ring Playground WHEP sandbox capture (fixture fallback)',
        eventType: 'motion_detected',
        subType: 'motion',
        descriptionHint: 'Captured sandbox frame if present; otherwise declared AI fixture',
        isBlackout: false,
        frameOrigin: fs.existsSync(playgroundFramePath) ? 'ring-playground-whep' : 'ai-generated'
      }]
    });
  });

  // Serve scenario image
  app.get('/api/samples/:id/image', (req: Request, res: Response) => {
    const scenario = SAMPLE_SCENARIOS.find((s) => s.id === req.params.id);
    if (!scenario) {
      res.status(404).json({ error: 'Scenario not found' });
      return;
    }
    const buf = scenario.generateImage();
    res.setHeader('Content-Type', 'image/png');
    res.send(buf);
  });

  // Serve static UI if built in apps/surface/dist
  const candidateDistPaths = [
    path.resolve(__dirname, '../../../apps/surface/dist'),
    path.resolve(process.cwd(), '../../apps/surface/dist'),
    path.resolve(process.cwd(), '../apps/surface/dist'),
    path.resolve(process.cwd(), 'apps/surface/dist')
  ];
  const surfaceDistPath = candidateDistPaths.find((p) => fs.existsSync(p));
  if (surfaceDistPath) {
    app.use(express.static(surfaceDistPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(surfaceDistPath, 'index.html'));
    });
  }

  return app;
}
