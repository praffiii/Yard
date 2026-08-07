import {
  readMapboxConfig,
  readR2Config,
  readResendConfig,
  type MapboxConfig,
  type R2Config,
  type ResendConfig,
} from './config.js';
import { createMapboxAdapter } from './mapbox-adapter.js';
import { createR2Adapter } from './r2-adapter.js';
import { createResendAdapter } from './resend-adapter.js';
import { createSharpImageProcessor } from './sharp-adapter.js';
import type {
  ImageProcessor,
  MapProvider,
  ProviderAdapters,
  R2ObjectStorage,
  TransactionalEmailSender,
} from './provider-types.js';

export type { ProviderAdapters } from './provider-types.js';

export type ProviderEnvironment = Readonly<{
  mapbox?: MapboxConfig;
  r2?: R2Config;
  resend?: ResendConfig;
}>;

/** Lazily composes provider adapters so API startup does not require live accounts. */
export function createProviderAdapters(
  environment: NodeJS.ProcessEnv = process.env,
  configured: ProviderEnvironment = {},
): ProviderAdapters {
  let imageProcessor: ImageProcessor | undefined;
  let mapProvider: MapProvider | undefined;
  let objectStorage: R2ObjectStorage | undefined;
  let transactionalEmail: TransactionalEmailSender | undefined;

  return {
    getImageProcessor: () => {
      imageProcessor ??= createSharpImageProcessor();
      return imageProcessor;
    },
    getMapProvider: () => {
      mapProvider ??= createMapboxAdapter(configured.mapbox ?? readMapboxConfig(environment));
      return mapProvider;
    },
    getObjectStorage: () => {
      objectStorage ??= createR2Adapter(configured.r2 ?? readR2Config(environment));
      return objectStorage;
    },
    getTransactionalEmail: () => {
      transactionalEmail ??= createResendAdapter(
        configured.resend ?? readResendConfig(environment),
      );
      return transactionalEmail;
    },
  };
}
