import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SampleScenario {
  id: string;
  name: string;
  eventType: string;
  subType: string;
  descriptionHint: string;
  generateImage: () => Buffer;
  isBlackout?: boolean;
  /**
   * Where the pixels came from. Travels with the scenario so the API, the UI and
   * any screenshot can all say the same true thing about the image on screen.
   *
   * 'ai-generated'  a picture produced by a generative model. Fine as a test
   *                 input, and it must never be labelled a camera feed - two of
   *                 these fixtures carry Google C2PA credentials reading
   *                 "Created by Google Generative AI".
   * 'procedural'    drawn in code by createSyntheticFrame().
   * 'ring-live'     a real frame pulled from the Ring API or its Playground
   *                 simulation. Nothing is allowed to claim this until a frame
   *                 has actually been fetched.
   *
   * Defaults to 'procedural' where omitted, which is the honest default: code
   * drew it.
   */
  frameOrigin?: 'ai-generated' | 'procedural' | 'ring-live';
}

function tryReadFixture(filename: string): Buffer | null {
  const candidates = [
    path.resolve(__dirname, '../fixtures', filename),
    path.resolve(__dirname, '../../fixtures', filename),
    path.resolve(process.cwd(), 'fixtures', filename)
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        return fs.readFileSync(p);
      } catch {
        // ignore
      }
    }
  }
  return null;
}

/**
 * Creates a synthetic PNG buffer with a watermark banner across the top 15%
 * and custom scene drawing in the lower 85%.
 */
export function createSyntheticFrame(options: {
  width?: number;
  height?: number;
  sceneType: 'person_porch' | 'vehicle_driveway' | 'doorbell_press' | 'pitch_black';
  includeWatermark?: boolean;
}): Buffer {
  const width = options.width || 640;
  const height = options.height || 480;
  const png = new PNG({ width, height });

  const watermarkHeight = Math.round(height * 0.15); // Top 15%
  const includeWatermark = options.includeWatermark ?? true;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) * 4;

      // Handle pitch black scene
      if (options.sceneType === 'pitch_black') {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 255;
        continue;
      }

      // 1. Watermark banner in the top 15% (rows 0 to watermarkHeight)
      if (includeWatermark && y < watermarkHeight) {
        let r = 20;
        let g = 20;
        let b = 25;

        // Simulate Ring Logo block on top-left
        if (x >= 20 && x <= 70 && y >= 15 && y <= 45) {
          r = 0;
          g = 164;
          b = 228;
        }

        // Simulate timestamp / Device ID block on top-right
        if (x >= 450 && x <= 620 && y >= 20 && y <= 40) {
          if (x % 6 < 4 && y % 4 < 3) {
            r = 240;
            g = 240;
            b = 240;
          }
        }

        png.data[idx] = r;
        png.data[idx + 1] = g;
        png.data[idx + 2] = b;
        png.data[idx + 3] = 255;
        continue;
      }

      // 2. Scene content in the lower 85%
      const sceneY = y - watermarkHeight;
      const sceneHeight = height - watermarkHeight;

      if (options.sceneType === 'person_porch') {
        if (sceneY < sceneHeight * 0.35) {
          png.data[idx] = 135;
          png.data[idx + 1] = 175;
          png.data[idx + 2] = 220;
        } else if (sceneY < sceneHeight * 0.65) {
          const isDoor = x >= 240 && x <= 380;
          if (isDoor) {
            png.data[idx] = 110;
            png.data[idx + 1] = 65;
            png.data[idx + 2] = 35;
          } else {
            png.data[idx] = 210;
            png.data[idx + 1] = 205;
            png.data[idx + 2] = 190;
          }
        } else {
          png.data[idx] = 150;
          png.data[idx + 1] = 150;
          png.data[idx + 2] = 155;
        }

        // Person silhouette
        if (x >= 280 && x <= 360 && sceneY >= 100 && sceneY <= 380) {
          if (sceneY <= 140 && x >= 305 && x <= 335) {
            png.data[idx] = 40;
            png.data[idx + 1] = 30;
            png.data[idx + 2] = 30;
          } else if (sceneY > 140 && sceneY <= 260) {
            png.data[idx] = 25;
            png.data[idx + 1] = 45;
            png.data[idx + 2] = 85;
          } else if (sceneY > 260 && sceneY <= 360) {
            png.data[idx] = 30;
            png.data[idx + 1] = 30;
            png.data[idx + 2] = 35;
          }
          // Cardboard parcel box
          if (x >= 325 && x <= 375 && sceneY >= 190 && sceneY <= 240) {
            png.data[idx] = 190;
            png.data[idx + 1] = 145;
            png.data[idx + 2] = 95;
          }
        }
        png.data[idx + 3] = 255;
      } else if (options.sceneType === 'vehicle_driveway') {
        if (sceneY < sceneHeight * 0.4) {
          png.data[idx] = 120;
          png.data[idx + 1] = 160;
          png.data[idx + 2] = 200;
        } else {
          png.data[idx] = 70;
          png.data[idx + 1] = 70;
          png.data[idx + 2] = 75;
        }
        if (x >= 180 && x <= 480 && sceneY >= 160 && sceneY <= 320) {
          png.data[idx] = 180;
          png.data[idx + 1] = 185;
          png.data[idx + 2] = 195;
          if (sceneY >= 170 && sceneY <= 220 && x >= 230 && x <= 420) {
            png.data[idx] = 40;
            png.data[idx + 1] = 50;
            png.data[idx + 2] = 60;
          }
        }
        png.data[idx + 3] = 255;
      } else if (options.sceneType === 'doorbell_press') {
        png.data[idx] = 180;
        png.data[idx + 1] = 175;
        png.data[idx + 2] = 160;
        png.data[idx + 3] = 255;
        if (x >= 150 && x <= 490 && sceneY >= 50) {
          png.data[idx] = 50;
          png.data[idx + 1] = 60;
          png.data[idx + 2] = 70;
          png.data[idx + 3] = 255;
        }
      }
    }
  }

  return PNG.sync.write(png);
}

export const SAMPLE_SCENARIOS: SampleScenario[] = [
  {
    id: 'person_porch_package',
    name: 'Person on Porch Carrying Box (motion: human) — SYNTHETIC frame',
    eventType: 'motion_detected',
    subType: 'human',
    // Flagged so every consumer - API, UI, screenshot - can say what this is.
    // The file carries Google C2PA credentials reading "Created by Google
    // Generative AI" with digitalSourceType trainedAlgorithmicMedia. It is a
    // perfectly good test input and it is NOT a Ring camera frame; see
    // docs/00-research/fixture-media-provenance.md.
    frameOrigin: 'ai-generated',
    descriptionHint: 'A person wearing a blue jacket and blue jeans stands on the porch holding a cardboard box.',
    generateImage: () => {
      const fixture = tryReadFixture('SYNTHETIC-ai-generated-porch-delivery.jpg');
      if (fixture) return fixture;
      return createSyntheticFrame({ sceneType: 'person_porch', includeWatermark: true });
    }
  },
  {
    id: 'vehicle_driveway',
    name: 'Vehicle Parked in Driveway (motion: vehicle) — SYNTHETIC frame',
    eventType: 'motion_detected',
    subType: 'vehicle',
    frameOrigin: 'ai-generated',
    descriptionHint: 'A silver car is parked in the driveway of a house.',
    generateImage: () => {
      const fixture = tryReadFixture('SYNTHETIC-ai-generated-driveway-vehicle.jpg');
      if (fixture) return fixture;
      return createSyntheticFrame({ sceneType: 'vehicle_driveway', includeWatermark: true });
    }
  },
  {
    id: 'doorbell_chime_press',
    name: 'Doorbell Chime Pressed (button_press / ding)',
    eventType: 'button_press',
    subType: 'doorbell_chime',
    descriptionHint: 'A visitor rings the front doorbell.',
    generateImage: () => createSyntheticFrame({ sceneType: 'doorbell_press', includeWatermark: true })
  },
  {
    id: 'pitch_black_unusable',
    name: 'Pitch Black Frame (Refusal Test)',
    eventType: 'motion_detected',
    subType: 'motion',
    descriptionHint: 'Unusable pitch black frame that triggers a loud, visible refusal banner.',
    isBlackout: true,
    generateImage: () => createSyntheticFrame({ sceneType: 'pitch_black', includeWatermark: false })
  }
];
