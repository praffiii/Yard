import sharp from 'sharp';
import type { ImageFormat, ImageProcessor, ImageVariantOptions } from './provider-types.js';

export type {
  ImageFormat,
  ImageMetadata,
  ImageProcessor,
  ImageVariantOptions,
  ProcessedImage,
} from './provider-types.js';

type SharpPipeline = ReturnType<typeof sharp>;

/** Keeps sharp's pipeline and metadata types out of the media module boundary. */
export function createSharpImageProcessor(): ImageProcessor {
  return {
    async createVariant(input, options) {
      validateVariantOptions(options);

      try {
        const pipeline = sharp(Buffer.from(input), { failOn: 'error' })
          .rotate()
          .resize({ fit: 'cover', height: options.height, width: options.width });
        const output = await toOutput(pipeline, options);

        return {
          bytes: output,
          contentType: `image/${options.format}`,
          format: options.format,
        };
      } catch {
        throw new Error('Image processing failed');
      }
    },
    async inspect(input) {
      try {
        const metadata = await sharp(Buffer.from(input), { failOn: 'error' }).metadata();
        const format = toImageFormat(metadata.format);

        if (
          !format ||
          !metadata.width ||
          !metadata.height ||
          (metadata.pages !== undefined && metadata.pages > 1)
        ) {
          throw new Error('Unsupported image metadata');
        }

        return {
          format,
          hasAlpha: metadata.hasAlpha ?? false,
          height: metadata.height,
          sizeBytes: input.byteLength,
          width: metadata.width,
        };
      } catch {
        throw new Error('Image inspection failed');
      }
    },
  };
}

async function toOutput(pipeline: SharpPipeline, options: ImageVariantOptions): Promise<Buffer> {
  switch (options.format) {
    case 'jpeg':
      return pipeline.jpeg({ quality: options.quality ?? 80 }).toBuffer();
    case 'png':
      return pipeline.png().toBuffer();
    case 'webp':
      return pipeline.webp({ quality: options.quality ?? 80 }).toBuffer();
  }
}

function toImageFormat(format: string | undefined): ImageFormat | undefined {
  if (format === 'jpeg' || format === 'png' || format === 'webp') {
    return format;
  }

  return undefined;
}

function validateVariantOptions(options: ImageVariantOptions) {
  if (!Number.isInteger(options.width) || options.width < 1) {
    throw new Error('Image variant width must be a positive integer');
  }

  if (options.height !== undefined && (!Number.isInteger(options.height) || options.height < 1)) {
    throw new Error('Image variant height must be a positive integer');
  }

  if (
    options.quality !== undefined &&
    (!Number.isInteger(options.quality) || options.quality < 1 || options.quality > 100)
  ) {
    throw new Error('Image quality must be between 1 and 100');
  }
}
