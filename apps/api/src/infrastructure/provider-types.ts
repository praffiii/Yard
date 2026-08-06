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

export type PlaceSearchInput = {
  readonly countries?: readonly string[];
  readonly limit?: number;
  readonly proximity?: MapCoordinates;
  readonly query: string;
  readonly types?: readonly PlaceSearchType[];
};

export type ReverseGeocodeInput = {
  readonly coordinates: MapCoordinates;
  readonly limit?: number;
};

export type PlaceResult = {
  readonly coordinates: MapCoordinates;
  readonly id: string;
  readonly label: string;
  readonly name: string;
  readonly type: string;
};

export type MapProvider = {
  readonly reverseGeocode: (input: ReverseGeocodeInput) => Promise<readonly PlaceResult[]>;
  readonly searchPlaces: (input: PlaceSearchInput) => Promise<readonly PlaceResult[]>;
};

export type R2UploadInput = {
  readonly contentType: string;
  readonly key: string;
};

export type R2ObjectInput = {
  readonly key: string;
};

export type PresignedUpload = {
  readonly expiresInSeconds: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly method: 'PUT';
  readonly url: string;
};

export type PresignedDownload = {
  readonly expiresInSeconds: number;
  readonly method: 'GET';
  readonly url: string;
};

export type R2ObjectStorage = {
  readonly createDownloadUrl: (input: R2ObjectInput) => Promise<PresignedDownload>;
  readonly createUploadUrl: (input: R2UploadInput) => Promise<PresignedUpload>;
  readonly deleteObject: (input: R2ObjectInput) => Promise<void>;
};

export type ImageFormat = 'jpeg' | 'png' | 'webp';

export type ImageMetadata = {
  readonly format: ImageFormat;
  readonly hasAlpha: boolean;
  readonly height: number;
  readonly sizeBytes: number;
  readonly width: number;
};

export type ImageVariantOptions = {
  readonly format: ImageFormat;
  readonly height?: number;
  readonly quality?: number;
  readonly width: number;
};

export type ProcessedImage = {
  readonly bytes: Uint8Array;
  readonly contentType: `image/${ImageFormat}`;
  readonly format: ImageFormat;
};

export type ImageProcessor = {
  readonly createVariant: (
    input: Uint8Array,
    options: ImageVariantOptions,
  ) => Promise<ProcessedImage>;
  readonly inspect: (input: Uint8Array) => Promise<ImageMetadata>;
};

export type TransactionalEmailInput = {
  readonly html: string;
  readonly subject: string;
  readonly text?: string;
  readonly to: readonly string[];
};

export type EmailDelivery = {
  readonly messageId: string;
};

export type TransactionalEmailSender = {
  readonly send: (input: TransactionalEmailInput) => Promise<EmailDelivery>;
};

export type ProviderAdapters = {
  readonly getImageProcessor: () => ImageProcessor;
  readonly getMapProvider: () => MapProvider;
  readonly getObjectStorage: () => R2ObjectStorage;
  readonly getTransactionalEmail: () => TransactionalEmailSender;
};
