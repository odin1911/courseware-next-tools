import type { RasterManifest } from './components/raster-animation/rasterPlayback';

const manifestModules = import.meta.glob('./assets/raster/*/manifest.json', {
  eager: true,
  import: 'default',
}) as Record<string, RasterManifest>;

const mediaModules = import.meta.glob('./assets/raster/**/*.{webm,mov,png}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function filesFor(asset: string) {
  const prefix = `./assets/raster/${asset}/`;

  return Object.fromEntries(
    Object.entries(mediaModules)
      .filter(([file]) => file.startsWith(prefix))
      .map(([file, url]) => [file.slice(prefix.length), url]),
  );
}

export function getRasterAsset(asset: string) {
  const manifest = manifestModules[`./assets/raster/${asset}/manifest.json`];
  if (!manifest) throw new Error(`unknown raster asset: ${asset}`);
  if (manifest.version !== 2) {
    throw new Error(`unsupported raster manifest version: ${manifest.version}`);
  }

  return { manifest, files: filesFor(asset) };
}

export function getRasterAssetNames() {
  return Object.values(manifestModules)
    .map((manifest) => manifest.asset)
    .sort();
}

export const lakiRasterAsset = getRasterAsset('BD_laki');

export const successRasterAsset = getRasterAsset('BD_mission_successed');

export const countRasterAsset = getRasterAsset('count');
