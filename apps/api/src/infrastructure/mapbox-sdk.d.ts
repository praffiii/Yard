// The SDK is JavaScript-only; this narrow shim keeps its types inside the adapter boundary.
declare module '@mapbox/mapbox-sdk' {
  const createMapboxClient: (config: { readonly accessToken: string }) => unknown;

  export default createMapboxClient;
}

declare module '@mapbox/mapbox-sdk/services/geocoding.js' {
  type MapboxRequest = {
    readonly send: () => Promise<{ readonly body: unknown }>;
  };

  type MapboxGeocodingService = {
    readonly forwardGeocode: (request: unknown) => MapboxRequest;
    readonly reverseGeocode: (request: unknown) => MapboxRequest;
  };

  const createGeocodingService: (client: unknown) => MapboxGeocodingService;

  export default createGeocodingService;
}
