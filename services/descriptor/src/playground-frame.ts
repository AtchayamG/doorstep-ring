export async function getPlaygroundFrame(
  capture: () => Promise<Buffer>,
  fixture: () => Buffer
): Promise<{ buffer: Buffer; frameOrigin: 'ring-playground-whep' | 'ai-generated' }> {
  try {
    const buffer = await capture();
    if (buffer.length > 0) return { buffer, frameOrigin: 'ring-playground-whep' };
  } catch {
    // A missing or failed sandbox capture must not be presented as Ring media.
  }
  return { buffer: fixture(), frameOrigin: 'ai-generated' };
}
