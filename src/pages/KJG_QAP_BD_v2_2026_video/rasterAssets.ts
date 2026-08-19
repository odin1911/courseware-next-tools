import type { RasterManifest } from './components/raster-animation/rasterPlayback';
import lakiManifestJson from './assets/raster/BD_laki/manifest.json';
import successManifestJson from './assets/raster/BD_mission_successed/manifest.json';
import countManifestJson from './assets/raster/count/manifest.json';

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

export const lakiRasterAsset = {
  manifest: lakiManifestJson as RasterManifest,
  files: filesFor('BD_laki'),
};

export const successRasterAsset = {
  manifest: successManifestJson as RasterManifest,
  files: filesFor('BD_mission_successed'),
};

export const countRasterAsset = {
  manifest: countManifestJson as RasterManifest,
  files: filesFor('count'),
};
