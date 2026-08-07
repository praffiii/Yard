import createMapboxClient from '@mapbox/mapbox-sdk';
import createGeocodingService from '@mapbox/mapbox-sdk/services/geocoding.js';
import { readMapboxConfig, type MapboxConfig } from './config.js';
import type {
  MapCoordinates,
  MapProvider,
  PlaceResult,
  PlaceSearchType,
} from './provider-types.js';

export type {
  MapCoordinates,
  MapProvider,
  PlaceResult,
  PlaceSearchInput,
  PlaceSearchType,
  ReverseGeocodeInput,
} from './provider-types.js';
export type MapboxFeature = Readonly<{
  center?: MapCoordinates;
  id: string;
  place_name?: string;
  place_type?: ReadonlyArray<string>;
  text?: string;
}>;

export type MapboxGeocodeResponse = Readonly<{
  features: ReadonlyArray<MapboxFeature>;
}>;

export type MapboxGeocoder = Readonly<{
  forwardGeocode: (request: MapboxForwardGeocodeRequest) => Promise<MapboxGeocodeResponse>;
  reverseGeocode: (request: MapboxReverseGeocodeRequest) => Promise<MapboxGeocodeResponse>;
}>;

type MapboxForwardGeocodeRequest = Readonly<{
  countries?: ReadonlyArray<string>;
  limit?: number;
  proximity?: MapCoordinates;
  query: string;
  types?: ReadonlyArray<PlaceSearchType>;
}>;

type MapboxReverseGeocodeRequest = Readonly<{
  limit?: number;
  query: MapCoordinates;
}>;

/** Keeps Mapbox geocoding responses and provider-specific request details in infrastructure. */
export function createMapboxAdapter(
  config: MapboxConfig = readMapboxConfig(),
  geocoder?: MapboxGeocoder,
): MapProvider {
  let configuredGeocoder = geocoder;

  const getGeocoder = () => {
    configuredGeocoder ??= createSdkMapboxGeocoder(config);
    return configuredGeocoder;
  };

  return {
    async reverseGeocode(input) {
      const response = await runMapboxRequest(
        () =>
          getGeocoder().reverseGeocode({
            limit: input.limit ?? 1,
            query: [input.coordinates[0], input.coordinates[1]],
          }),
        'Mapbox reverse geocoding failed',
      );

      return mapPlaces(response);
    },
    async searchPlaces(input) {
      const response = await runMapboxRequest(
        () =>
          getGeocoder().forwardGeocode({
            ...(input.countries ? { countries: [...input.countries] } : {}),
            ...(input.limit === undefined ? {} : { limit: input.limit }),
            ...(input.proximity ? { proximity: [input.proximity[0], input.proximity[1]] } : {}),
            ...(input.types ? { types: [...input.types] } : {}),
            query: input.query,
          }),
        'Mapbox place search failed',
      );

      return mapPlaces(response);
    },
  };
}

function createSdkMapboxGeocoder(config: MapboxConfig): MapboxGeocoder {
  const client = createMapboxClient({ accessToken: config.accessToken });
  const geocoding = createGeocodingService(client);

  return {
    async forwardGeocode(request) {
      const response = await geocoding.forwardGeocode(request).send();
      return parseMapboxGeocodeResponse(response.body);
    },
    async reverseGeocode(request) {
      const response = await geocoding.reverseGeocode(request).send();
      return parseMapboxGeocodeResponse(response.body);
    },
  };
}

async function runMapboxRequest<T>(request: () => Promise<T>, message: string): Promise<T> {
  try {
    return await request();
  } catch {
    throw new Error(message);
  }
}

function mapPlaces(response: MapboxGeocodeResponse): readonly PlaceResult[] {
  return response.features.flatMap((feature) => {
    const coordinates = feature.center;

    if (!coordinates || !hasValidCoordinates(coordinates)) {
      return [];
    }

    const name = feature.text?.trim() || feature.place_name?.split(',')[0]?.trim();
    const label = feature.place_name?.trim() || name;

    if (!name || !label) {
      return [];
    }

    return [
      {
        coordinates: [coordinates[0], coordinates[1]],
        id: feature.id,
        label,
        name,
        type: feature.place_type?.[0] ?? 'unknown',
      },
    ];
  });
}

function parseMapboxGeocodeResponse(value: unknown): MapboxGeocodeResponse {
  if (!isRecord(value) || !Array.isArray(value.features)) {
    throw new Error('Mapbox returned an invalid geocoding response');
  }

  return {
    features: value.features.flatMap((feature) => parseMapboxFeature(feature)),
  };
}

function parseMapboxFeature(value: unknown): MapboxFeature[] {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return [];
  }

  const center = readCoordinates(value.center);
  const placeName = typeof value.place_name === 'string' ? value.place_name : undefined;
  const placeType = Array.isArray(value.place_type)
    ? value.place_type.filter((type): type is string => typeof type === 'string')
    : undefined;
  const text = typeof value.text === 'string' ? value.text : undefined;

  return [{ center, id: value.id, place_name: placeName, place_type: placeType, text }];
}

function readCoordinates(value: unknown): MapCoordinates | undefined {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    typeof value[0] !== 'number' ||
    typeof value[1] !== 'number' ||
    !Number.isFinite(value[0]) ||
    !Number.isFinite(value[1])
  ) {
    return undefined;
  }

  return [value[0], value[1]];
}

function hasValidCoordinates(coordinates: MapCoordinates) {
  return (
    coordinates.length === 2 && Number.isFinite(coordinates[0]) && Number.isFinite(coordinates[1])
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
