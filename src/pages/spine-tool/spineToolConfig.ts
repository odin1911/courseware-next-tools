export const SPINE_RUNTIME_URL =
  'https://web-assets.alo7.com/assets/scripts/spine-runtime/spine-3.8/spine-webgl.js';
export const CANVAS_WIDTH = 520;
export const CANVAS_HEIGHT = 320;
export const KJT_AP_DRAW_MODE = 'kjt-ap-draw';
export const KJT_AP_DRAW_SLOT_NAMES = ['draw', 'draw2', 'draw3'] as const;
export const COUNT2_FARM_MODE = 'count2-farm';
export const COUNT2_FARM_ASSET_ID = 'count2_farm';

const KJT_AP_DRAW_SAMPLE_IDS = new Set([
  'shape_draw_triangle_billiards',
  'shape_draw_triangle_sign',
  'shape_draw_triangle_set_square',
]);

const assetModules = import.meta.glob('./assets/*.zip', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export interface SpineAsset {
  id: string;
  fileName: string;
  zipUrl: string;
  title: string;
}

function formatAssetTitle(id: string) {
  return id
    .split(/[-_]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export const spineAssets: SpineAsset[] = Object.entries(assetModules)
  .map(([path, zipUrl]) => {
    const fileName = path.split('/').pop() ?? path;
    const id = fileName.replace(/\.zip$/i, '');

    return {
      id,
      fileName,
      zipUrl,
      title: formatAssetTitle(id),
    };
  })
  .sort((left, right) => left.fileName.localeCompare(right.fileName));

export function isKjtApDrawSample(assetId: string) {
  return KJT_AP_DRAW_SAMPLE_IDS.has(assetId);
}

export function getPageState() {
  if (typeof window === 'undefined') {
    return {
      focusedMode: '',
      count2Url: '',
      kjtApDrawUrl: '',
      mainUrl: '',
    };
  }

  const url = new URL(window.location.href);
  const focusedMode = url.searchParams.get('mode') ?? '';

  url.searchParams.set('mode', COUNT2_FARM_MODE);
  const count2Url = `${url.pathname}${url.search}`;

  url.searchParams.set('mode', KJT_AP_DRAW_MODE);
  const kjtApDrawUrl = `${url.pathname}${url.search}`;

  url.searchParams.delete('mode');

  return {
    focusedMode,
    count2Url,
    kjtApDrawUrl,
    mainUrl: `${url.pathname}${url.search}`,
  };
}

export function getVisibleAssets<T extends { id: string }>(
  focusedMode: string,
  assets: readonly T[],
  count2AssetId = COUNT2_FARM_ASSET_ID,
) {
  if (focusedMode === KJT_AP_DRAW_MODE) {
    return assets.filter((asset) => isKjtApDrawSample(asset.id));
  }

  if (focusedMode !== COUNT2_FARM_MODE) {
    return assets.filter((asset) => asset.id !== count2AssetId);
  }

  const count2Asset = assets.find((asset) => asset.id === count2AssetId) ?? null;

  return count2Asset ? [count2Asset] : [];
}

export function shouldShowComparisonPanel(assetId: string) {
  return assetId === COUNT2_FARM_ASSET_ID;
}
