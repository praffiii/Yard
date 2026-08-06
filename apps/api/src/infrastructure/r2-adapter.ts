import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { readR2Config, type R2Config } from './config.js';
import type { R2ObjectStorage } from './provider-types.js';

export type {
  PresignedDownload,
  PresignedUpload,
  R2ObjectInput,
  R2ObjectStorage,
  R2UploadInput,
} from './provider-types.js';

export type R2ObjectReference = {
  readonly bucket: string;
  readonly key: string;
};

export type R2UploadReference = R2ObjectReference & {
  readonly contentType: string;
};

/** Provider-neutral operations used to keep R2's SDK types inside infrastructure. */
export type R2Operations = {
  readonly deleteObject: (input: R2ObjectReference) => Promise<void>;
  readonly presignDownload: (input: R2ObjectReference, expiresInSeconds: number) => Promise<string>;
  readonly presignUpload: (input: R2UploadReference, expiresInSeconds: number) => Promise<string>;
};

/** Exposes only short-lived object instructions; raw R2 credentials never cross this boundary. */
export function createR2Adapter(
  config: R2Config = readR2Config(),
  operations: R2Operations = createR2Operations(config),
): R2ObjectStorage {
  return {
    async createDownloadUrl(input) {
      const key = requireObjectKey(input.key);
      const url = await runR2Operation(
        () =>
          operations.presignDownload({ bucket: config.bucket, key }, config.presignedUrlTtlSeconds),
        'R2 download URL creation failed',
      );

      return {
        expiresInSeconds: config.presignedUrlTtlSeconds,
        method: 'GET',
        url,
      };
    },
    async createUploadUrl(input) {
      const key = requireObjectKey(input.key);
      const contentType = requireContentType(input.contentType);
      const url = await runR2Operation(
        () =>
          operations.presignUpload(
            { bucket: config.bucket, contentType, key },
            config.presignedUrlTtlSeconds,
          ),
        'R2 upload URL creation failed',
      );

      return {
        expiresInSeconds: config.presignedUrlTtlSeconds,
        headers: { 'content-type': contentType },
        method: 'PUT',
        url,
      };
    },
    async deleteObject(input) {
      const key = requireObjectKey(input.key);
      await runR2Operation(
        () => operations.deleteObject({ bucket: config.bucket, key }),
        'R2 object deletion failed',
      );
    },
  };
}

function createR2Operations(config: R2Config): R2Operations {
  const client = new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: config.endpoint,
    region: config.region,
  });

  return {
    async deleteObject(input) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: input.bucket,
          Key: input.key,
        }),
      );
    },
    presignDownload: (input, expiresInSeconds) =>
      getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: input.bucket,
          Key: input.key,
        }),
        { expiresIn: expiresInSeconds },
      ),
    presignUpload: (input, expiresInSeconds) =>
      getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: input.bucket,
          ContentType: input.contentType,
          Key: input.key,
        }),
        { expiresIn: expiresInSeconds },
      ),
  };
}

async function runR2Operation<T>(operation: () => Promise<T>, message: string): Promise<T> {
  try {
    return await operation();
  } catch {
    throw new Error(message);
  }
}

function requireObjectKey(key: string) {
  if (!key.trim()) {
    throw new Error('R2 object key is required');
  }

  return key;
}

function requireContentType(contentType: string) {
  if (!contentType.trim()) {
    throw new Error('R2 upload content type is required');
  }

  return contentType;
}
