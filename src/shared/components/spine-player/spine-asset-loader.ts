import type { SpineZipBundle } from './spine-zip';

export interface SpineDecodedAssets {
  atlasText: string;
  jsonText: string;
  textureUrlMap: Map<string, string>;
  imageMap: Map<string, HTMLImageElement>;
  backgroundImageUrl: string;
  backgroundImageSize: { width: number; height: number } | null;
  blobUrls: string[];
  cleanup: () => void;
}

function getSpineImageMimeType(entryPath: string) {
  const lowerPath = entryPath.toLowerCase();

  if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) {
    return 'image/jpeg';
  }

  if (lowerPath.endsWith('.webp')) {
    return 'image/webp';
  }

  return 'image/png';
}

function loadImage(objectUrl: string, entryPath: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error(`Failed to load image: ${entryPath}`));
    };

    image.src = objectUrl;
  });
}

export async function loadSpineDecodedAssets(bundle: SpineZipBundle): Promise<SpineDecodedAssets> {
  const textureUrlMap = new Map<string, string>();
  const blobUrls: string[] = [];
  let cleanedUp = false;

  const cleanup = () => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;
    blobUrls.forEach((blobUrl) => {
      URL.revokeObjectURL(blobUrl);
    });
  };

  try {
    for (const textureEntry of bundle.textureEntries) {
      const objectUrl = URL.createObjectURL(
        new Blob([textureEntry.bytes.slice()], {
          type: getSpineImageMimeType(textureEntry.entryPath),
        }),
      );

      textureUrlMap.set(textureEntry.entryPath, objectUrl);
      blobUrls.push(objectUrl);
    }

    const imageEntries = await Promise.all(
      bundle.textureEntries.map(async (textureEntry) => {
        const objectUrl = textureUrlMap.get(textureEntry.entryPath) ?? '';
        const image = await loadImage(objectUrl, textureEntry.entryPath);

        return [textureEntry.entryPath, image] as const;
      }),
    );

    const backgroundImage = bundle.backgroundEntry
      ? (imageEntries.find(([entryPath]) => entryPath === bundle.backgroundEntry?.entryPath)?.[1] ??
        null)
      : null;

    return {
      atlasText: bundle.atlasText,
      jsonText: bundle.jsonText,
      textureUrlMap,
      imageMap: new Map<string, HTMLImageElement>(imageEntries),
      backgroundImageUrl: bundle.backgroundEntry
        ? (textureUrlMap.get(bundle.backgroundEntry.entryPath) ?? '')
        : '',
      backgroundImageSize: backgroundImage
        ? {
            width: backgroundImage.naturalWidth,
            height: backgroundImage.naturalHeight,
          }
        : null,
      blobUrls,
      cleanup,
    };
  } catch (error) {
    cleanup();
    throw error;
  }
}
