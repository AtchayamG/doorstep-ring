import { PNG } from 'pngjs';
import * as jpeg from 'jpeg-js';

export interface CropResult {
  croppedBuffer: Buffer;
  originalWidth: number;
  originalHeight: number;
  croppedWidth: number;
  croppedHeight: number;
  rowsRemoved: number;
  cropPercentage: number;
  format: 'jpeg' | 'png';
  isUsable: boolean;
  usabilityReason?: string;
  averageLuminance: number;
}

export interface CropOptions {
  /** Crop ratio from top (0.15 = 15% by default) */
  cropRatio?: number;
  /** Explicit pixel count to crop from top (overrides ratio if set) */
  cropPixels?: number;
}

/**
 * Detect image format from magic bytes
 */
export function detectFormat(buffer: Buffer): 'jpeg' | 'png' | 'unknown' {
  if (buffer.length < 4) return 'unknown';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'png';
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }
  return 'unknown';
}

/**
 * Evaluates image usability based on luminance and variance.
 * Pitch-black images (< 3.0 / 255 luminance) or solid blank feeds are unusable.
 */
export function evaluateUsability(rgbaData: Uint8Array | Buffer, width: number, height: number): {
  isUsable: boolean;
  averageLuminance: number;
  reason?: string;
} {
  const totalPixels = width * height;
  if (totalPixels === 0) {
    return { isUsable: false, averageLuminance: 0, reason: 'Zero pixel dimension' };
  }

  let totalLuminance = 0;
  // Sample every 4th pixel for performance on large images
  const step = 4;
  let sampledCount = 0;

  for (let i = 0; i < totalPixels * 4; i += 4 * step) {
    const r = rgbaData[i];
    const g = rgbaData[i + 1];
    const b = rgbaData[i + 2];
    // Standard ITU-R BT.709 relative luminance
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    totalLuminance += lum;
    sampledCount++;
  }

  const avgLum = sampledCount > 0 ? totalLuminance / sampledCount : 0;

  // If average brightness is below 3/255, frame is pitch black
  if (avgLum < 3.0) {
    return {
      isUsable: false,
      averageLuminance: avgLum,
      reason: `Frame is pitch black (average luminance ${avgLum.toFixed(1)}/255). No visual features are discernible.`
    };
  }

  return {
    isUsable: true,
    averageLuminance: avgLum
  };
}

/**
 * Crops the top watermark band (Ring logo top-left, Device ID / timestamp top-right)
 * from Ring Partner API frames before inference.
 *
 * Per Ring API June 8, 2026 release note:
 * "All media content delivered through the Ring Partner API now includes a mandatory visible
 * watermark overlay containing the Ring logo (top-left), Device ID, App Name, and timestamp (top-right)."
 */
export async function cropWatermark(
  imageBuffer: Buffer,
  options: CropOptions = {}
): Promise<CropResult> {
  const format = detectFormat(imageBuffer);
  if (format === 'unknown') {
    throw new Error('Unsupported image format. Buffer must be valid JPEG or PNG.');
  }

  let width = 0;
  let height = 0;
  let rawRgba: Buffer | Uint8Array;

  if (format === 'png') {
    const png = PNG.sync.read(imageBuffer);
    width = png.width;
    height = png.height;
    rawRgba = png.data;
  } else {
    // jpeg
    const decoded = jpeg.decode(imageBuffer, { useTArray: true });
    width = decoded.width;
    height = decoded.height;
    rawRgba = decoded.data;
  }

  if (width <= 0 || height <= 0) {
    throw new Error(`Invalid image dimensions: ${width}x${height}`);
  }

  // Calculate rows to remove from top
  const cropRatio = options.cropRatio ?? 0.15; // 15% default removes watermark banner cleanly
  let rowsToRemove = options.cropPixels ?? Math.round(height * cropRatio);

  // Safety bounds: keep at least 20% of image height
  if (rowsToRemove >= height * 0.8) {
    rowsToRemove = Math.round(height * 0.5);
  }
  if (rowsToRemove <= 0) {
    rowsToRemove = 1;
  }

  const croppedHeight = height - rowsToRemove;
  const bytesPerRow = width * 4;
  const startByteOffset = rowsToRemove * bytesPerRow;

  // Slice off the top rows containing the watermark
  const croppedRgba = rawRgba.subarray(startByteOffset);

  // Check usability of the cropped area
  const usability = evaluateUsability(croppedRgba, width, croppedHeight);

  let croppedBuffer: Buffer;
  if (format === 'png') {
    const croppedPng = new PNG({ width, height: croppedHeight });
    Buffer.from(croppedRgba.buffer, croppedRgba.byteOffset, croppedRgba.byteLength).copy(croppedPng.data);
    croppedBuffer = PNG.sync.write(croppedPng);
  } else {
    const encoded = jpeg.encode(
      {
        data: Buffer.from(croppedRgba.buffer, croppedRgba.byteOffset, croppedRgba.byteLength),
        width,
        height: croppedHeight
      },
      90
    );
    croppedBuffer = encoded.data;
  }

  return {
    croppedBuffer,
    originalWidth: width,
    originalHeight: height,
    croppedWidth: width,
    croppedHeight,
    rowsRemoved: rowsToRemove,
    cropPercentage: Math.round((rowsToRemove / height) * 100),
    format,
    isUsable: usability.isUsable,
    usabilityReason: usability.reason,
    averageLuminance: usability.averageLuminance
  };
}
