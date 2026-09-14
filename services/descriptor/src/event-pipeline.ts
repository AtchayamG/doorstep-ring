import { cropWatermark, CropResult } from './watermark-cropper.js';
import { describeCroppedFrame, DescriptionResult } from './bedrock-describer.js';
import { RingPartnerClient } from './ring-client.js';
import { auditDescription, GuardrailAudit } from './guardrail-audit.js';

export interface RingWebhookPayload {
  event_id?: string;
  event_type?: string;
  created_at?: string;
  device_id?: string;
  data?: {
    device_id?: string;
    subType?: string; // Legacy fallback
    attributes?: {
      sub_type?: string; // Real Ring Partner API schema
      [key: string]: any;
    };
    [key: string]: any;
  };
  image_base64?: string; // Optional direct image injection (e.g. for testing or playground simulation)
}

export interface NormalizedEvent {
  eventId: string;
  eventType: 'motion_detected' | 'button_press' | string;
  subType: string;
  deviceId: string;
  createdAt: string;
  rawPayload: any;
}

export interface PipelineExecutionResult {
  eventId: string;
  eventType: string;
  subType: string;
  deviceId: string;
  createdAt: string;
  status: 'DESCRIBED' | 'REFUSED' | 'TOKEN_REQUIRED';
  isRefused: boolean;
  description: string;
  spokenCaption: string;
  refusalReason?: string;
  rawImageBase64?: string;
  croppedImageBase64?: string;
  cropDetails?: {
    originalDimensions: string;
    croppedDimensions: string;
    rowsRemoved: number;
    cropPercentage: number;
    watermarkExcised: boolean;
  };
  modelId: string;
  totalLatencyMs: number;
  guardrails?: GuardrailAudit;
  tokenInfo?: {
    playgroundUrl: string;
    message: string;
  };
}

/**
 * Normalizes incoming Ring webhook payloads to extract standard event metadata.
 * Strictly adheres to `data.attributes.sub_type` per Ring documentation, with legacy fallback.
 */
export function normalizeRingWebhook(payload: RingWebhookPayload): NormalizedEvent {
  const eventId = payload.event_id || `evt_${Date.now()}`;

  // Map event types (e.g. 'ding' -> 'button_press', 'motion' -> 'motion_detected')
  let rawType = payload.event_type || 'motion_detected';
  let eventType: string = rawType;
  if (rawType === 'ding') eventType = 'button_press';
  if (rawType === 'motion') eventType = 'motion_detected';

  // Primary: data.attributes.sub_type. Fallback: data.subType or 'general'
  const subType =
    payload.data?.attributes?.sub_type ||
    payload.data?.subType ||
    (eventType === 'button_press' ? 'doorbell_chime' : 'motion');

  const deviceId =
    payload.data?.device_id ||
    payload.device_id ||
    'ring-doorbell-sandbox';

  const createdAt = payload.created_at || new Date().toISOString();

  return {
    eventId,
    eventType,
    subType,
    deviceId,
    createdAt,
    rawPayload: payload
  };
}

/**
 * Executes the complete Doorstep event-to-description pipeline.
 */
export async function executeDoorstepPipeline(
  payload: RingWebhookPayload,
  imageBufferOverride?: Buffer,
  ringClient?: RingPartnerClient
): Promise<PipelineExecutionResult> {
  const overallStart = Date.now();
  const event = normalizeRingWebhook(payload);
  const client = ringClient || new RingPartnerClient();

  let rawBuffer: Buffer | null = null;

  // 1. Obtain frame
  if (imageBufferOverride) {
    rawBuffer = imageBufferOverride;
  } else if (payload.image_base64) {
    rawBuffer = Buffer.from(payload.image_base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  } else {
    // Attempt to pull snapshot from Ring Partner API using live bearer token
    try {
      rawBuffer = await client.fetchSnapshot(event.deviceId);
    } catch (err: any) {
      // If unauthorized or token missing, return honest TOKEN_REQUIRED state
      return {
        eventId: event.eventId,
        eventType: event.eventType,
        subType: event.subType,
        deviceId: event.deviceId,
        createdAt: event.createdAt,
        status: 'TOKEN_REQUIRED',
        isRefused: true,
        description: '',
        spokenCaption: 'No valid Ring Playground token. Please obtain a 30-minute token from the Developers Playground.',
        refusalReason: `Ring API unauthorized (${err.message}). A valid 30-minute sandbox token is required.`,
        modelId: 'amazon.nova-pro-v1:0',
        totalLatencyMs: Date.now() - overallStart,
        tokenInfo: {
          playgroundUrl: 'https://developer.amazon.com/ring/console/playground',
          message: 'No valid Ring Playground token. Get a 30-minute token at https://developer.amazon.com/ring/console/playground'
        }
      };
    }
  }

  if (!rawBuffer || rawBuffer.length === 0) {
    return {
      eventId: event.eventId,
      eventType: event.eventType,
      subType: event.subType,
      deviceId: event.deviceId,
      createdAt: event.createdAt,
      status: 'REFUSED',
      isRefused: true,
      description: '',
      spokenCaption: 'Refusal alert: No image data was received from the camera feed.',
      refusalReason: 'Zero-byte or null image payload received.',
      modelId: 'amazon.nova-pro-v1:0',
      totalLatencyMs: Date.now() - overallStart
    };
  }

  // 2. Crop the watermark bands (Ring logo top-left, device ID & timestamp top-right)
  let cropResult: CropResult;
  try {
    cropResult = await cropWatermark(rawBuffer);
  } catch (err: any) {
    return {
      eventId: event.eventId,
      eventType: event.eventType,
      subType: event.subType,
      deviceId: event.deviceId,
      createdAt: event.createdAt,
      status: 'REFUSED',
      isRefused: true,
      description: '',
      spokenCaption: 'Refusal alert: Corrupted image stream cannot be decoded.',
      refusalReason: `Image decoding failed: ${err.message}`,
      rawImageBase64: `data:image/jpeg;base64,${rawBuffer.toString('base64')}`,
      modelId: 'amazon.nova-pro-v1:0',
      totalLatencyMs: Date.now() - overallStart
    };
  }

  const rawBase64 = `data:image/${cropResult.format};base64,${rawBuffer.toString('base64')}`;
  const croppedBase64 = `data:image/${cropResult.format};base64,${cropResult.croppedBuffer.toString('base64')}`;

  const cropDetails = {
    originalDimensions: `${cropResult.originalWidth}x${cropResult.originalHeight}`,
    croppedDimensions: `${cropResult.croppedWidth}x${cropResult.croppedHeight}`,
    rowsRemoved: cropResult.rowsRemoved,
    cropPercentage: cropResult.cropPercentage,
    watermarkExcised: true
  };

  // 3. Pre-inference usability check (e.g. pitch black unlit night frame)
  if (!cropResult.isUsable) {
    const reason = cropResult.usabilityReason || 'Frame is pitch black with no discernible visual content.';
    return {
      eventId: event.eventId,
      eventType: event.eventType,
      subType: event.subType,
      deviceId: event.deviceId,
      createdAt: event.createdAt,
      status: 'REFUSED',
      isRefused: true,
      description: '',
      spokenCaption: `Refusal alert: ${reason}`,
      refusalReason: reason,
      rawImageBase64: rawBase64,
      croppedImageBase64: croppedBase64,
      cropDetails,
      modelId: 'amazon.nova-pro-v1:0',
      totalLatencyMs: Date.now() - overallStart
    };
  }

  // 4. Send the cropped frame to Bedrock Nova Pro
  const inferenceResult: DescriptionResult = await describeCroppedFrame(
    cropResult.croppedBuffer,
    cropResult.format,
    {
      eventType: event.eventType,
      subType: event.subType
    }
  );

  const guardrails = inferenceResult.description ? auditDescription(inferenceResult.description) : undefined;

  return {
    eventId: event.eventId,
    eventType: event.eventType,
    subType: event.subType,
    deviceId: event.deviceId,
    createdAt: event.createdAt,
    status: inferenceResult.status,
    isRefused: inferenceResult.isRefused,
    description: inferenceResult.description,
    spokenCaption: inferenceResult.spokenCaption,
    refusalReason: inferenceResult.refusalReason,
    rawImageBase64: rawBase64,
    croppedImageBase64: croppedBase64,
    cropDetails,
    modelId: inferenceResult.modelId,
    totalLatencyMs: Date.now() - overallStart,
    guardrails
  };
}
