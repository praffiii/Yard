import { describe, expect, it } from 'vite-plus/test';
import { createR2Adapter, type R2Operations } from '../src/infrastructure/r2-adapter.js';

describe('Cloudflare R2 adapter', () => {
  it('returns short-lived upload and download instructions without storage credentials', async () => {
    const operations: R2Operations = {
      deleteObject: async () => undefined,
      presignDownload: async (input) => {
        expect(input).toEqual({ bucket: 'yard-development', key: 'activity/image.webp' });
        return 'https://storage.example/download-signature';
      },
      presignUpload: async (input) => {
        expect(input).toEqual({
          bucket: 'yard-development',
          contentType: 'image/webp',
          key: 'activity/image.webp',
        });
        return 'https://storage.example/upload-signature';
      },
    };
    const adapter = createR2Adapter(
      {
        accessKeyId: 'access-key-secret',
        bucket: 'yard-development',
        endpoint: 'https://account.r2.cloudflarestorage.com',
        presignedUrlTtlSeconds: 120,
        region: 'auto',
        secretAccessKey: 'secret-access-key',
      },
      operations,
    );

    await expect(
      adapter.createUploadUrl({ contentType: 'image/webp', key: 'activity/image.webp' }),
    ).resolves.toEqual({
      expiresInSeconds: 120,
      headers: { 'content-type': 'image/webp' },
      method: 'PUT',
      url: 'https://storage.example/upload-signature',
    });
    await expect(adapter.createDownloadUrl({ key: 'activity/image.webp' })).resolves.toEqual({
      expiresInSeconds: 120,
      method: 'GET',
      url: 'https://storage.example/download-signature',
    });
    await expect(adapter.deleteObject({ key: 'activity/image.webp' })).resolves.toBeUndefined();
  });

  it('rejects empty object keys before contacting R2', async () => {
    let presignCalls = 0;
    const operations: R2Operations = {
      deleteObject: async () => undefined,
      presignDownload: async () => {
        presignCalls += 1;
        return 'https://storage.example/download-signature';
      },
      presignUpload: async () => {
        presignCalls += 1;
        return 'https://storage.example/upload-signature';
      },
    };
    const adapter = createR2Adapter(
      {
        accessKeyId: 'access-key',
        bucket: 'yard-development',
        endpoint: 'https://account.r2.cloudflarestorage.com',
        presignedUrlTtlSeconds: 120,
        region: 'auto',
        secretAccessKey: 'secret-access-key',
      },
      operations,
    );

    await expect(adapter.createDownloadUrl({ key: '  ' })).rejects.toThrow(
      'R2 object key is required',
    );
    expect(presignCalls).toBe(0);
  });
});
