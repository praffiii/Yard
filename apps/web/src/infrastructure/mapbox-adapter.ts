export type MapCoordinates = readonly [longitude: number, latitude: number];

export type MapViewport = {
  readonly center: MapCoordinates;
  readonly zoom: number;
};

export type MapboxRenderingConfig = {
  /** Mapbox browser tokens are public and must be restricted by origin and usage. */
  readonly accessToken: string;
  readonly styleUrl: string;
};

type MapboxEnvironment = {
  readonly VITE_MAPBOX_ACCESS_TOKEN?: string;
  readonly VITE_MAPBOX_STYLE_URL?: string;
};

export function readMapboxRenderingConfig(
  environment: MapboxEnvironment = import.meta.env,
): MapboxRenderingConfig {
  const accessToken = environment.VITE_MAPBOX_ACCESS_TOKEN?.trim();
  const styleUrl = environment.VITE_MAPBOX_STYLE_URL?.trim();

  if (!accessToken) {
    throw new Error('VITE_MAPBOX_ACCESS_TOKEN is required for browser map rendering');
  }

  if (!styleUrl) {
    throw new Error('VITE_MAPBOX_STYLE_URL is required for browser map rendering');
  }

  return { accessToken, styleUrl };
}

export type MapController = {
  readonly remove: () => void;
  readonly resize: () => void;
  readonly setCenter: (center: MapCoordinates) => void;
  readonly setZoom: (zoom: number) => void;
};

export type MapRenderer = {
  readonly mount: (container: HTMLElement, viewport: MapViewport) => Promise<MapController>;
};

export type MapboxMapOptions = {
  readonly center: [number, number];
  readonly container: HTMLElement;
  readonly style: string;
  readonly zoom: number;
};

export type MapboxMap = {
  readonly remove: () => void;
  readonly resize: () => void;
  readonly setCenter: (center: [number, number]) => void;
  readonly setZoom: (zoom: number) => void;
};

export type MapboxSdk = {
  accessToken: string;
  readonly Map: new (options: MapboxMapOptions) => MapboxMap;
};

export type MapboxLoader = () => Promise<MapboxSdk>;

/** Keeps Mapbox GL JS behind an app-owned browser rendering interface. */
export function createMapboxRenderer(
  config: MapboxRenderingConfig,
  loadMapbox: MapboxLoader = loadMapboxSdk,
): MapRenderer {
  return {
    async mount(container, viewport) {
      const mapbox = await loadMapbox();
      mapbox.accessToken = config.accessToken;
      const map = new mapbox.Map({
        center: [viewport.center[0], viewport.center[1]],
        container,
        style: config.styleUrl,
        zoom: viewport.zoom,
      });

      return {
        remove: () => map.remove(),
        resize: () => map.resize(),
        setCenter: (center) => map.setCenter([center[0], center[1]]),
        setZoom: (zoom) => map.setZoom(zoom),
      };
    },
  };
}

async function loadMapboxSdk(): Promise<MapboxSdk> {
  const module = await import('mapbox-gl');
  return module.default as unknown as MapboxSdk;
}
