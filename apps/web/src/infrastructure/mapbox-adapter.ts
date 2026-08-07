export type MapCoordinates = Readonly<[longitude: number, latitude: number]>;

export type MapViewport = Readonly<{
  center: MapCoordinates;
  zoom: number;
}>;

export type MapboxRenderingConfig = Readonly<{
  /** Mapbox browser tokens are public and must be restricted by origin and usage. */
  accessToken: string;
  styleUrl: string;
}>;

type MapboxEnvironment = Readonly<{
  VITE_MAPBOX_ACCESS_TOKEN?: string;
  VITE_MAPBOX_STYLE_URL?: string;
}>;

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

export type MapController = Readonly<{
  remove: () => void;
  resize: () => void;
  setCenter: (center: MapCoordinates) => void;
  setZoom: (zoom: number) => void;
}>;

export type MapRenderer = Readonly<{
  mount: (container: HTMLElement, viewport: MapViewport) => Promise<MapController>;
}>;

export type MapboxMapOptions = Readonly<{
  center: [number, number];
  container: HTMLElement;
  style: string;
  zoom: number;
}>;

export type MapboxMap = Readonly<{
  remove: () => void;
  resize: () => void;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
}>;

export type MapboxSdk = {
  accessToken: string;
} & Readonly<{
  Map: new (options: MapboxMapOptions) => MapboxMap;
}>;

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
