import { parseSpineAtlas, type SpineAtlasFile, type SpineAtlasRegion } from './spine-atlas';
import {
  parseSpineZipBytes,
  resolveSpineTextureEntryPath,
  type SpineZipBundle,
  type SpineZipTextureFile,
} from './spine-zip';

interface SpineJsonSlot {
  readonly name?: string;
  readonly attachment?: string;
}

interface SpineJsonAttachment {
  readonly type?: string;
  readonly path?: string;
}

type SpineJsonAttachmentsByName = Readonly<Record<string, SpineJsonAttachment>>;
type SpineJsonAttachmentsBySlot = Readonly<Record<string, SpineJsonAttachmentsByName>>;

interface SpineJsonSkin {
  readonly name?: string;
  readonly attachments?: SpineJsonAttachmentsBySlot;
}

export interface SpineJsonFile {
  readonly slots?: readonly SpineJsonSlot[];
  readonly skins?: readonly SpineJsonSkin[];
  readonly animations?: Readonly<Record<string, unknown>>;
}

export interface SpineSlotAttachmentInfo {
  slotName: string;
  attachmentName: string;
  attachmentType: string;
  attachmentPath: string;
}

export interface SpineSlotRegionDescriptor extends SpineSlotAttachmentInfo, SpineAtlasRegion {
  regionName: string;
}

export interface SpineRegionBitmapExport {
  descriptor: SpineSlotRegionDescriptor;
  raster: HTMLCanvasElement;
  dataUrl: string;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

function findDefaultSkin(spineJson: SpineJsonFile) {
  return spineJson.skins?.find((skin) => skin.name === 'default') ?? null;
}

export function parseSpineJson(jsonText: string): SpineJsonFile {
  return JSON.parse(jsonText) as SpineJsonFile;
}

export function resolveSlotAttachment(
  spineJson: SpineJsonFile,
  slotName: string,
): SpineSlotAttachmentInfo {
  const defaultSkin = findDefaultSkin(spineJson);

  if (!defaultSkin) {
    throw new Error('Spine default skin not found');
  }

  const attachmentsBySlot = defaultSkin?.attachments?.[slotName];

  if (!attachmentsBySlot) {
    throw new Error(`Spine slot "${slotName}" not found in default skin attachments`);
  }

  const slotEntry = spineJson.slots?.find((slot) => slot.name === slotName);

  if (!slotEntry) {
    throw new Error(`Spine slot "${slotName}" not found in skeleton slots`);
  }

  if (!slotEntry.attachment) {
    throw new Error(`Spine slot "${slotName}" has no default attachment`);
  }

  const attachmentName = slotEntry.attachment;

  if (!attachmentsBySlot[attachmentName]) {
    throw new Error(
      `Spine slot "${slotName}" default attachment "${attachmentName}" not found in default skin`,
    );
  }

  const attachment = attachmentsBySlot[attachmentName] ?? {};

  return {
    slotName,
    attachmentName,
    attachmentType: attachment.type || 'region',
    attachmentPath: attachment.path || attachmentName,
  };
}

export function resolveSlotRegionDescriptor(
  spineJson: SpineJsonFile,
  atlas: SpineAtlasFile,
  slotName: string,
): SpineSlotRegionDescriptor {
  const attachment = resolveSlotAttachment(spineJson, slotName);

  if (attachment.attachmentType !== 'region') {
    throw new Error(
      `Spine slot "${slotName}" attachment "${attachment.attachmentName}" type "${attachment.attachmentType}" is unsupported`,
    );
  }

  const region = atlas.regions.get(attachment.attachmentPath);

  if (!region) {
    throw new Error(
      `Spine slot "${slotName}" region "${attachment.attachmentPath}" not found in atlas`,
    );
  }

  return {
    ...attachment,
    ...region,
    regionName: region.name,
  };
}

export function parseSpineZipPreviewBundle(bytes: Uint8Array) {
  const zipBundle = parseSpineZipBytes(bytes);
  const spineJson = parseSpineJson(zipBundle.jsonText);
  const atlas = parseSpineAtlas(zipBundle.atlasText);

  return {
    zipBundle,
    spineJson,
    atlas,
    animationNames: Object.keys(spineJson.animations ?? {}),
  };
}

function inferTextureMimeType(fileName: string) {
  if (/\.jpe?g$/i.test(fileName)) {
    return 'image/jpeg';
  }

  if (/\.webp$/i.test(fileName)) {
    return 'image/webp';
  }

  return 'image/png';
}

function findTextureFile(zipBundle: SpineZipBundle, imageName: string) {
  const entryPath = resolveSpineTextureEntryPath(
    imageName,
    zipBundle.textureFiles.map((file) => file.entryPath),
  );

  if (entryPath) {
    const textureFile = zipBundle.textureFiles.find((file) => file.entryPath === entryPath);

    if (textureFile) {
      return textureFile;
    }
  }

  throw new Error(`Spine atlas image "${imageName}" not found in zip textures`);
}

function loadTextureImage(textureFile: SpineZipTextureFile) {
  const bytes = new Uint8Array(textureFile.bytes.byteLength);
  bytes.set(textureFile.bytes);
  const blob = new Blob([bytes], { type: inferTextureMimeType(textureFile.fileName) });
  const objectUrl = URL.createObjectURL(blob);

  return new Promise<{ image: HTMLImageElement; revoke: () => void }>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({
        image,
        revoke: () => {
          URL.revokeObjectURL(objectUrl);
        },
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Spine texture image "${textureFile.fileName}" failed to load`));
    };

    image.src = objectUrl;
  });
}

function findTextureImageInMap(imageMap: ReadonlyMap<string, HTMLImageElement>, imageName: string) {
  const entryPath = resolveSpineTextureEntryPath(imageName, Array.from(imageMap.keys()));

  return entryPath ? (imageMap.get(entryPath) ?? null) : null;
}

function drawRegionToCanvas(image: HTMLImageElement, region: SpineAtlasRegion) {
  const width = region.origWidth || region.width;
  const height = region.origHeight || region.height;

  if (width <= 0 || height <= 0) {
    throw new Error(`Spine atlas region "${region.name}" has invalid preview size`);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Failed to create canvas context for spine preview');
  }

  context.clearRect(0, 0, width, height);

  if (!region.rotate) {
    context.drawImage(
      image,
      region.x,
      region.y,
      region.width,
      region.height,
      region.offsetX,
      height - region.height - region.offsetY,
      region.width,
      region.height,
    );

    return canvas;
  }

  const rotatedCanvas = document.createElement('canvas');
  rotatedCanvas.width = region.height;
  rotatedCanvas.height = region.width;

  const rotatedContext = rotatedCanvas.getContext('2d');

  if (!rotatedContext) {
    throw new Error('Failed to create rotated canvas context for spine preview');
  }

  rotatedContext.save();
  rotatedContext.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
  rotatedContext.rotate(-Math.PI / 2);
  rotatedContext.drawImage(
    image,
    region.x,
    region.y,
    region.width,
    region.height,
    -region.width / 2,
    -region.height / 2,
    region.width,
    region.height,
  );
  rotatedContext.restore();

  context.drawImage(
    rotatedCanvas,
    region.offsetX,
    height - rotatedCanvas.height - region.offsetY,
    rotatedCanvas.width,
    rotatedCanvas.height,
  );

  return canvas;
}

function buildRegionBitmapExport(
  image: HTMLImageElement,
  descriptor: SpineSlotRegionDescriptor,
): SpineRegionBitmapExport {
  const raster = drawRegionToCanvas(image, descriptor);

  return {
    descriptor,
    raster,
    dataUrl: raster.toDataURL('image/png'),
    width: raster.width,
    height: raster.height,
    offsetX: descriptor.offsetX,
    offsetY: descriptor.offsetY,
  };
}

export function exportRegionBitmapFromImageMap(
  imageMap: ReadonlyMap<string, HTMLImageElement>,
  descriptor: SpineSlotRegionDescriptor,
) {
  const image = findTextureImageInMap(imageMap, descriptor.imageName);

  if (!image) {
    throw new Error(`Spine atlas image "${descriptor.imageName}" not found in decoded image map`);
  }

  return buildRegionBitmapExport(image, descriptor);
}

export async function exportRegionBitmapFromZipBundle(
  zipBundle: SpineZipBundle,
  descriptor: SpineSlotRegionDescriptor,
) {
  const textureFile = findTextureFile(zipBundle, descriptor.imageName);
  const { image, revoke } = await loadTextureImage(textureFile);

  try {
    return buildRegionBitmapExport(image, descriptor);
  } finally {
    revoke();
  }
}

export async function renderRegionPreviewDataUrl(
  zipBundle: SpineZipBundle,
  descriptor: SpineSlotRegionDescriptor,
) {
  const bitmapExport = await exportRegionBitmapFromZipBundle(zipBundle, descriptor);

  return bitmapExport.dataUrl;
}

export { parseSpineAtlas, parseSpineZipBytes };
