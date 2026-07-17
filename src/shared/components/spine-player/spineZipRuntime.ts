import { loadSpineDecodedAssets, type SpineDecodedAssets } from './spine-asset-loader';
import type { SpineAsyncRun } from './spineAsyncRun';
import { parseSpineZipBytes, resolveSpineTextureEntryPath } from './spine-zip';

function normalizeZipEntryPath(entryPath: string) {
  return entryPath.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/');
}

function getZipEntryBaseName(entryPath: string) {
  return normalizeZipEntryPath(entryPath).split('/').pop() ?? '';
}

export function findSpineBackgroundEntryPath(entryPaths: Iterable<string>) {
  for (const entryPath of entryPaths) {
    const fileName = getZipEntryBaseName(entryPath).toLowerCase();

    if (fileName === 'bg.png') {
      return entryPath;
    }
  }

  return '';
}

interface ExtractedSpineAssets {
  atlasText: string;
  jsonText: string;
  imageMap: Map<string, string>;
  blobUrls: string[];
  backgroundImageUrl: string;
}

interface StartSpineZipRunOptions {
  zipUrl: string;
  createRun: () => SpineAsyncRun;
  loadDecodedAssets?: (zipUrl: string) => Promise<SpineDecodedAssets>;
  initSpineFromZip: (
    atlasText: string,
    jsonText: string,
    imageElements: Map<string, HTMLImageElement>,
    runToken: SpineAsyncRun,
  ) => void;
  setBackgroundImageUrl: (url: string) => void;
  setBackgroundImageSize?: (size: { width: number; height: number } | null) => void;
  setBlobUrls?: (blobUrls: string[]) => void;
}

export interface SpineZipRunHandle {
  abort: () => void;
  done: Promise<void>;
}

export function resolveZipAtlasImageEntryPath(requestPath: string, entryPaths: Iterable<string>) {
  return resolveSpineTextureEntryPath(requestPath, [...entryPaths]);
}

export async function extractSpineZip(zipUrl: string): Promise<ExtractedSpineAssets> {
  const decodedAssets = await loadDecodedAssetsFromZipUrl(zipUrl);

  return {
    atlasText: decodedAssets.atlasText,
    jsonText: decodedAssets.jsonText,
    imageMap: decodedAssets.textureUrlMap,
    blobUrls: decodedAssets.blobUrls,
    backgroundImageUrl: decodedAssets.backgroundImageUrl,
  };
}

async function fetchSpineZipBytes(zipUrl: string) {
  const response = await fetch(zipUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch zip: ${response.status} ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

export async function loadDecodedAssetsFromZipUrl(zipUrl: string): Promise<SpineDecodedAssets> {
  const zipBytes = await fetchSpineZipBytes(zipUrl);
  return loadSpineDecodedAssets(parseSpineZipBytes(zipBytes));
}

export function startSpineZipRun({
  zipUrl,
  createRun,
  loadDecodedAssets: loadDecodedAssetsImpl = loadDecodedAssetsFromZipUrl,
  initSpineFromZip,
  setBackgroundImageUrl,
  setBackgroundImageSize,
  setBlobUrls,
}: StartSpineZipRunOptions): SpineZipRunHandle {
  const runToken = createRun();
  const done = (async () => {
    try {
      const decodedAssets = await loadDecodedAssetsImpl(zipUrl);
      runToken.trackBlobUrls(decodedAssets.blobUrls);

      if (!runToken.checkpoint()) {
        return;
      }

      runToken.commit(() => {
        setBlobUrls?.(runToken.releaseBlobUrls());
        setBackgroundImageUrl(decodedAssets.backgroundImageUrl);
        setBackgroundImageSize?.(decodedAssets.backgroundImageSize);
        initSpineFromZip(
          decodedAssets.atlasText,
          decodedAssets.jsonText,
          decodedAssets.imageMap,
          runToken,
        );
      });
    } catch (error) {
      runToken.fail(error);
    }
  })();

  return {
    abort() {
      setBackgroundImageUrl('');
      setBackgroundImageSize?.(null);
      runToken.abort();
    },
    done,
  };
}

export const spineZipRunRuntime = {
  startSpineZipRun,
  loadDecodedAssetsFromZipUrl,
};
