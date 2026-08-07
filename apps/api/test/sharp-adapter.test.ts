import { describe, expect, it } from 'vite-plus/test';
import { createSharpImageProcessor } from '../src/infrastructure/sharp-adapter.js';

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

describe('sharp image adapter', () => {
  it('inspects raster metadata and creates an application-owned image variant', async () => {
    const processor = createSharpImageProcessor();

    await expect(processor.inspect(onePixelPng)).resolves.toEqual({
      format: 'png',
      hasAlpha: true,
      height: 1,
      sizeBytes: onePixelPng.byteLength,
      width: 1,
    });

    const variant = await processor.createVariant(onePixelPng, {
      format: 'webp',
      height: 2,
      width: 2,
    });

    expect(variant.contentType).toBe('image/webp');
    expect(variant.format).toBe('webp');
    expect(variant.bytes).toBeInstanceOf(Uint8Array);
    expect(variant.bytes.byteLength).toBeGreaterThan(0);
    await expect(processor.inspect(variant.bytes)).resolves.toMatchObject({
      format: 'webp',
      height: 2,
      width: 2,
    });
  });

  it('fails before processing malformed image bytes', async () => {
    const processor = createSharpImageProcessor();

    await expect(processor.inspect(new Uint8Array([1, 2, 3]))).rejects.toThrow(
      'Image inspection failed',
    );
  });
});
