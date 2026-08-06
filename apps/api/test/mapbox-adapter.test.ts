import { describe, expect, it } from 'vite-plus/test';
import { createMapboxAdapter, type MapboxGeocoder } from '../src/infrastructure/mapbox-adapter.js';

describe('Mapbox adapter', () => {
  it('defers provider client creation so safe test configuration does not require a live account', () => {
    expect(() => createMapboxAdapter({ accessToken: 'pk_test_safe_value' })).not.toThrow();
  });

  it('maps provider place results into Yard-owned search and reverse-geocoding results', async () => {
    const forwardRequests: unknown[] = [];
    const reverseRequests: unknown[] = [];
    const geocoder: MapboxGeocoder = {
      forwardGeocode: async (request) => {
        forwardRequests.push(request);
        return {
          features: [
            {
              center: [-122.4194, 37.7749],
              id: 'place.san-francisco',
              place_name: 'San Francisco, California, United States',
              place_type: ['place'],
              text: 'San Francisco',
            },
          ],
        };
      },
      reverseGeocode: async (request) => {
        reverseRequests.push(request);
        return {
          features: [
            {
              center: [-122.4194, 37.7749],
              id: 'address.market-street',
              place_name: 'Market Street, San Francisco, California',
              place_type: ['address'],
              text: 'Market Street',
            },
          ],
        };
      },
    };

    const adapter = createMapboxAdapter({ accessToken: 'pk_test_safe_value' }, geocoder);

    await expect(
      adapter.searchPlaces({
        countries: ['us'],
        limit: 5,
        proximity: [-122.4, 37.8],
        query: 'San Francisco',
        types: ['place', 'locality'],
      }),
    ).resolves.toEqual([
      {
        coordinates: [-122.4194, 37.7749],
        id: 'place.san-francisco',
        label: 'San Francisco, California, United States',
        name: 'San Francisco',
        type: 'place',
      },
    ]);

    await expect(adapter.reverseGeocode({ coordinates: [-122.4194, 37.7749] })).resolves.toEqual([
      {
        coordinates: [-122.4194, 37.7749],
        id: 'address.market-street',
        label: 'Market Street, San Francisco, California',
        name: 'Market Street',
        type: 'address',
      },
    ]);

    expect(forwardRequests).toEqual([
      {
        countries: ['us'],
        limit: 5,
        proximity: [-122.4, 37.8],
        query: 'San Francisco',
        types: ['place', 'locality'],
      },
    ]);
    expect(reverseRequests).toEqual([
      {
        limit: 1,
        query: [-122.4194, 37.7749],
      },
    ]);
  });

  it('ignores provider features without usable coordinates', async () => {
    const geocoder: MapboxGeocoder = {
      forwardGeocode: async () => ({
        features: [
          {
            id: 'invalid-feature',
            place_name: 'No coordinates',
            place_type: ['place'],
            text: 'No coordinates',
          },
        ],
      }),
      reverseGeocode: async () => ({ features: [] }),
    };

    const adapter = createMapboxAdapter({ accessToken: 'pk_test_safe_value' }, geocoder);

    await expect(adapter.searchPlaces({ query: 'No coordinates' })).resolves.toEqual([]);
  });
});
