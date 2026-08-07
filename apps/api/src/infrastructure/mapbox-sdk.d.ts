// The SDK is JavaScript-only; this narrow shim keeps its types inside the adapter boundary.
declare module '@mapbox/mapbox-sdk' {
  const createMapboxClient: (config: Readonly<{ accessToken: string }>) => unknown;

  export default createMapboxClient;
}

declare module '@mapbox/mapbox-sdk/services/geocoding.js' {
  type MapboxRequest = Readonly<{
    send: () => Promise<Readonly<{ body: unknown }>>;
  }>;

  type MapboxGeocodingService = Readonly<{
    forwardGeocode: (request: unknown) => MapboxRequest;
    reverseGeocode: (request: unknown) => MapboxRequest;
  }>;

  const createGeocodingService: (client: unknown) => MapboxGeocodingService;

  export default createGeocodingService;
}
