import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { config } from './config.js';

export interface DescribeOptions {
  modelId?: string;
  region?: string;
  subType?: string;
  eventType?: string;
}

export interface DescriptionResult {
  status: 'DESCRIBED' | 'REFUSED';
  isRefused: boolean;
  description: string;
  spokenCaption: string;
  refusalReason?: string;
  modelId: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
}

const SYSTEM_PROMPT = `You are Doorstep, an accessibility vision narrator designed for blind and low-vision users.
You are analyzing a security camera frame from a front door or driveway.

Your task: Provide a single factual, present-tense description sentence of the scene.

STRICT ACCESSIBILITY RULES:
1. Exactly ONE sentence in the present tense.
2. Be plain, clear, and objective. Focus on verifiable physical actions, objects, and people (e.g., "A person wearing a dark jacket walks toward the door carrying a cardboard box.").
3. FORBIDDEN: NEVER guess identity (do not say "looks like John", "the homeowner", "a friend", etc.).
4. FORBIDDEN: NEVER speculate on intent or motives (do not say "intending to deliver", "stopping by to visit", "suspiciously looking around").
5. FORBIDDEN: NEVER use flowery, poetic, or dramatic language.
6. FORBIDDEN: NEVER describe camera angles, digital artifacts, timestamps, or image resolution.
7. REFUSAL RULE: If the image is unusable (pitch black, severely obscured, corrupted, or genuinely empty of anything describable), you MUST refuse. A scene with no person in it is NOT unusable: objects such as a package, a vehicle, an open door or an animal are subjects and must be described. Weather and light (snow, rain, fog, glare, dusk) are part of the scene, not an obstruction, as long as any object is still visible. Respond strictly with:
REFUSAL: <brief factual reason why the image cannot be described>
`;

/**
 * Creates or retrieves the Bedrock Runtime client
 */
export function getBedrockClient(region: string = config.awsRegion): BedrockRuntimeClient {
  return new BedrockRuntimeClient({ region });
}

/**
 * Cleans the model output sentence for text-to-speech output
 */
function cleanDescription(rawText: string): string {
  let cleaned = rawText.trim();
  // Remove markdown quotes or wrapping
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  // Ensure it ends with a period
  if (!cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
    cleaned += '.';
  }
  return cleaned;
}

/**
 * The per-frame instruction. A Ring sub_type is a sensor HINT, not a fact about the frame: a
 * "human" hint over a porch that holds only a package must still produce a description of the package,
 * not a refusal. (Found on the first real Ring Playground frame, 2026-09-23: told sub_type="human",
 * Nova Pro refused a frame showing a parcel on the steps.)
 */
export function buildUserPrompt(subType?: string): string {
  const hint = subType
    ? `Sensor hint (may not match the image): Ring reported detection sub_type="${subType}". Describe what is actually visible, even if it does not match the hint.`
    : 'Describe what is visually observable.';
  return `${hint} Provide exactly one factual, present-tense sentence for an accessibility audio announcement. If the image itself is unusable, begin with REFUSAL:`;
}

/**
 * Sends a cropped image frame to Bedrock Nova Pro and enforces strict accessibility formatting.
 */
export async function describeCroppedFrame(
  imageBuffer: Buffer,
  format: 'jpeg' | 'png',
  options: DescribeOptions = {},
  client?: BedrockRuntimeClient
): Promise<DescriptionResult> {
  const startTime = Date.now();
  const modelId = options.modelId || config.bedrockModelId;
  const bedrock = client || getBedrockClient(options.region);

  const prompt = buildUserPrompt(options.subType);

  try {
    const command = new ConverseCommand({
      modelId,
      system: [{ text: SYSTEM_PROMPT }],
      messages: [
        {
          role: 'user',
          content: [
            {
              image: {
                format,
                source: {
                  bytes: new Uint8Array(imageBuffer)
                }
              }
            },
            {
              text: prompt
            }
          ]
        }
      ],
      inferenceConfig: {
        maxTokens: 100,
        temperature: 0.1,
        topP: 0.9
      }
    });

    const response = await bedrock.send(command);
    const latencyMs = Date.now() - startTime;
    const rawText = response.output?.message?.content?.[0]?.text?.trim() || '';

    // Check for explicit refusal prefix from model
    if (rawText.toUpperCase().startsWith('REFUSAL:') || rawText.toUpperCase().includes('UNUSABLE')) {
      const reason = rawText.replace(/^REFUSAL:\s*/i, '').trim() || 'Visual content is not discernible.';
      return {
        status: 'REFUSED',
        isRefused: true,
        description: '',
        spokenCaption: `Refusal alert: ${reason}`,
        refusalReason: reason,
        modelId,
        latencyMs,
        inputTokens: response.usage?.inputTokens,
        outputTokens: response.usage?.outputTokens
      };
    }

    // Check if the response is empty or unreasonably short
    if (!rawText || rawText.length < 5) {
      return {
        status: 'REFUSED',
        isRefused: true,
        description: '',
        spokenCaption: 'Refusal alert: Model produced empty or indeterminate output.',
        refusalReason: 'Model produced empty or indeterminate description.',
        modelId,
        latencyMs,
        inputTokens: response.usage?.inputTokens,
        outputTokens: response.usage?.outputTokens
      };
    }

    const cleanedText = cleanDescription(rawText);

    return {
      status: 'DESCRIBED',
      isRefused: false,
      description: cleanedText,
      spokenCaption: cleanedText,
      modelId,
      latencyMs,
      inputTokens: response.usage?.inputTokens,
      outputTokens: response.usage?.outputTokens
    };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error?.message || String(error);

    return {
      status: 'REFUSED',
      isRefused: true,
      description: '',
      spokenCaption: `Refusal alert: Bedrock inference failed. ${errorMessage}`,
      refusalReason: `Bedrock inference error: ${errorMessage}`,
      modelId,
      latencyMs
    };
  }
}
