import { strFromU8, unzipSync } from 'fflate';

export interface SpineZipEntry {
  entryPath: string;
  fileName: string;
  bytes: Uint8Array;
}

export interface SpineZipTextureFile extends SpineZipEntry {}

export interface SpineZipBundle {
  entries: SpineZipEntry[];
  ignoredEntries: string[];
  atlasEntry: SpineZipEntry;
  atlasFileName: string;
  atlasText: string;
  jsonEntry: SpineZipEntry;
  jsonFileName: string;
  jsonText: string;
  textureEntries: SpineZipTextureFile[];
  textureFiles: SpineZipTextureFile[];
  backgroundEntry: SpineZipTextureFile | null;
}

function normalizeZipEntryPath(entryPath: string) {
  return entryPath.replace(/\\/g, '/').replace(/^\.\//, '');
}

function getZipEntryFileName(entryPath: string) {
  const normalizedPath = normalizeZipEntryPath(entryPath);
  return normalizedPath.split('/').pop() ?? normalizedPath;
}

function isIgnoredZipEntry(entryPath: string) {
  const normalizedPath = normalizeZipEntryPath(entryPath);
  const fileName = getZipEntryFileName(normalizedPath);

  return (
    normalizedPath.endsWith('/') ||
    normalizedPath.startsWith('__MACOSX/') ||
    normalizedPath.includes('/__MACOSX/') ||
    fileName === '.DS_Store' ||
    fileName.startsWith('._')
  );
}

function toSpineZipEntry(entryPath: string, bytes: Uint8Array): SpineZipEntry {
  const normalizedEntryPath = normalizeZipEntryPath(entryPath);

  return {
    entryPath: normalizedEntryPath,
    fileName: getZipEntryFileName(normalizedEntryPath),
    bytes,
  };
}

export function resolveSpineTextureEntryPath(
  requestPath: string,
  entryPaths: readonly string[],
): string {
  const normalizedRequestPath = normalizeZipEntryPath(requestPath);
  const exactMatch = entryPaths.find(
    (entryPath) => normalizeZipEntryPath(entryPath) === normalizedRequestPath,
  );

  if (exactMatch) {
    return exactMatch;
  }

  const requestFileName = getZipEntryFileName(normalizedRequestPath);
  const basenameMatches = entryPaths.filter(
    (entryPath) => getZipEntryFileName(entryPath) === requestFileName,
  );

  if (basenameMatches.length === 1) {
    return basenameMatches[0] ?? '';
  }

  return '';
}

export function parseSpineZipBytes(bytes: Uint8Array): SpineZipBundle {
  const ignoredEntries: string[] = [];
  const entries: SpineZipEntry[] = [];

  for (const [entryPath, entryBytes] of Object.entries(unzipSync(bytes))) {
    const normalizedEntryPath = normalizeZipEntryPath(entryPath);

    if (isIgnoredZipEntry(normalizedEntryPath)) {
      ignoredEntries.push(normalizedEntryPath);
      continue;
    }

    entries.push(toSpineZipEntry(normalizedEntryPath, entryBytes));
  }

  const atlasEntries = entries.filter(({ fileName }) => fileName.endsWith('.atlas'));
  const jsonEntries = entries.filter(({ fileName }) => fileName.endsWith('.json'));
  const textureEntries = entries.filter(({ fileName }) => /\.(png|jpg|jpeg|webp)$/i.test(fileName));
  const backgroundEntry = textureEntries.find(
    ({ fileName }) => fileName.toLowerCase() === 'bg.png',
  );

  if (atlasEntries.length === 0) {
    throw new Error('Spine zip missing .atlas file');
  }

  if (atlasEntries.length > 1) {
    throw new Error('Spine zip must contain exactly one .atlas file');
  }

  if (jsonEntries.length === 0) {
    throw new Error('Spine zip missing .json file');
  }

  if (jsonEntries.length > 1) {
    throw new Error('Spine zip must contain exactly one .json file');
  }

  if (textureEntries.length === 0) {
    throw new Error('Spine zip missing texture image file');
  }

  const atlasEntry = atlasEntries[0];
  const jsonEntry = jsonEntries[0];

  return {
    entries,
    ignoredEntries,
    atlasEntry,
    atlasFileName: atlasEntry.fileName,
    atlasText: strFromU8(atlasEntry.bytes),
    jsonEntry,
    jsonFileName: jsonEntry.fileName,
    jsonText: strFromU8(jsonEntry.bytes),
    textureEntries,
    textureFiles: textureEntries,
    backgroundEntry: backgroundEntry ?? null,
  };
}
