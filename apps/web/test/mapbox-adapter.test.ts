import { describe, expect, it } from 'vite-plus/test';
import {
  createMapboxRenderer,
  readMapboxRenderingConfig,
  type MapboxLoader,
  type MapboxMap,
  type MapboxMapOptions,
} from '../src/infrastructure/mapbox-adapter.js';

describe('Mapbox browser adapter', () => {
  it('reads public rendering configuration from the web environment', () => {
    expect(
      readMapboxRenderingConfig({
        VITE_MAPBOX_ACCESS_TOKEN: 'pk_test_public_mapbox',
        VITE_MAPBOX_STYLE_URL: 'mapbox://styles/mapbox/streets-v12',
      }),
    ).toEqual({
      accessToken: 'pk_test_public_mapbox',
      styleUrl: 'mapbox://styles/mapbox/streets-v12',
    });
  });

  it('keeps map construction and controls behind an app-owned renderer', async () => {
    let sdkToken = '';
    let options: MapboxMapOptions | undefined;
    const calls: string[] = [];
    const map: MapboxMap = {
      remove: () => calls.push('remove'),
      resize: () => calls.push('resize'),
      setCenter: (center) => calls.push(`center:${center.join(',')}`),
      setZoom: (zoom) => calls.push(`zoom:${zoom}`),
    };
    const loadMapbox: MapboxLoader = async () => ({
      get accessToken() {
        return sdkToken;
      },
      Map: class {
        constructor(mapOptions: MapboxMapOptions) {
          options = mapOptions;
        }

        remove = map.remove;
        resize = map.resize;
        setCenter = map.setCenter;
        setZoom = map.setZoom;
      },
      set accessToken(value: string) {
        sdkToken = value;
      },
    });

    const renderer = createMapboxRenderer(
      {
        accessToken: 'pk_test_public_mapbox',
        styleUrl: 'mapbox://styles/mapbox/streets-v12',
      },
      loadMapbox,
    );
    const controller = await renderer.mount({} as HTMLElement, {
      center: [-122.4194, 37.7749],
      zoom: 11,
    });

    expect(sdkToken).toBe('pk_test_public_mapbox');
    expect(options).toEqual({
      center: [-122.4194, 37.7749],
      container: expect.anything(),
      style: 'mapbox://styles/mapbox/streets-v12',
      zoom: 11,
    });

    controller.setCenter([-122.4, 37.8]);
    controller.setZoom(12);
    controller.resize();
    controller.remove();
    expect(calls).toEqual(['center:-122.4,37.8', 'zoom:12', 'resize', 'remove']);
  });
});
