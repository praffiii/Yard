export type MapCoordinates = readonly [longitude: number, latitude: number];

/** Mapbox uses `place` and `locality` for city-level search results. */
export type PlaceSearchType =
  | 'address'
  | 'country'
  | 'district'
  | 'locality'
  | 'neighborhood'
  | 'place'
  | 'poi'
  | 'poi.landmark'
  | 'postcode'
  | 'region';

export type PlaceSearchInput = Readonly<{
  countries?: ReadonlyArray<string>;
  limit?: number;
  proximity?: MapCoordinates;
  query: string;
  types?: ReadonlyArray<PlaceSearchType>;
}>;

export type ReverseGeocodeInput = Readonly<{
  coordinates: MapCoordinates;
  limit?: number;
}>;

export type PlaceResult = Readonly<{
  coordinates: MapCoordinates;
  id: string;
  label: string;
  name: string;
  type: string;
}>;

export type MapProvider = Readonly<{
  reverseGeocode: (input: ReverseGeocodeInput) => Promise<ReadonlyArray<PlaceResult>>;
  searchPlaces: (input: PlaceSearchInput) => Promise<ReadonlyArray<PlaceResult>>;
}>;

export type R2UploadInput = Readonly<{
  contentType: string;
  key: string;
}>;

export type R2ObjectInput = Readonly<{
  key: string;
}>;

export type PresignedUpload = Readonly<{
  expiresInSeconds: number;
  headers: Readonly<Record<string, string>>;
  method: 'PUT';
  url: string;
}>;

export type PresignedDownload = Readonly<{
  expiresInSeconds: number;
  method: 'GET';
  url: string;
}>;

export type R2ObjectStorage = Readonly<{
  createDownloadUrl: (input: R2ObjectInput) => Promise<PresignedDownload>;
  createUploadUrl: (input: R2UploadInput) => Promise<PresignedUpload>;
  deleteObject: (input: R2ObjectInput) => Promise<void>;
}>;

export type ImageFormat = 'jpeg' | 'png' | 'webp';

export type ImageMetadata = Readonly<{
  format: ImageFormat;
  hasAlpha: boolean;
  height: number;
  sizeBytes: number;
  width: number;
}>;

export type ImageVariantOptions = Readonly<{
  format: ImageFormat;
  height?: number;
  quality?: number;
  width: number;
}>;

export type ProcessedImage = Readonly<{
  bytes: Uint8Array;
  contentType: `image/${ImageFormat}`;
  format: ImageFormat;
}>;

export type ImageProcessor = Readonly<{
  createVariant: (input: Uint8Array, options: ImageVariantOptions) => Promise<ProcessedImage>;
  inspect: (input: Uint8Array) => Promise<ImageMetadata>;
}>;

export type TransactionalEmailInput = Readonly<{
  html: string;
  subject: string;
  text?: string;
  to: ReadonlyArray<string>;
}>;

export type EmailDelivery = Readonly<{
  messageId: string;
}>;

export type TransactionalEmailSender = Readonly<{
  send: (input: TransactionalEmailInput) => Promise<EmailDelivery>;
}>;

export type ProviderAdapters = Readonly<{
  getImageProcessor: () => ImageProcessor;
  getMapProvider: () => MapProvider;
  getObjectStorage: () => R2ObjectStorage;
  getTransactionalEmail: () => TransactionalEmailSender;
}>;
