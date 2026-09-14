import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

// Try loading .env.local first, then .env
const candidates = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env.local'),
  path.resolve(process.cwd(), '../../.env')
];

for (const p of candidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

export interface AppConfig {
  ringAccessToken: string;
  ringApiBaseUrl: string;
  awsRegion: string;
  bedrockModelId: string;
  port: number;
}

export const config: AppConfig = {
  ringAccessToken: process.env.RING_ACCESS_TOKEN || '',
  ringApiBaseUrl: process.env.RING_API_BASE_URL || 'https://api.amazonvision.com/v1',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  bedrockModelId: process.env.BEDROCK_MODEL_ID || 'amazon.nova-pro-v1:0',
  port: parseInt(process.env.PORT || '3002', 10)
};

export function getRedactedToken(token?: string): string {
  const t = token || config.ringAccessToken;
  if (!t) return '(none)';
  if (t.length <= 10) return '***';
  return `${t.substring(0, 4)}...${t.substring(t.length - 4)}`;
}

export function isRingTokenSet(): boolean {
  return Boolean(config.ringAccessToken && config.ringAccessToken.trim().length > 0);
}
