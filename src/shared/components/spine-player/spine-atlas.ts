export interface SpineAtlasRegion {
  name: string;
  imageName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  origWidth: number;
  origHeight: number;
  offsetX: number;
  offsetY: number;
  rotate: boolean;
}

export interface SpineAtlasFile {
  imageName: string;
  regions: Map<string, SpineAtlasRegion>;
}

function parseNumberPair(rawValue: string, regionName: string, fieldName: string) {
  const parts = rawValue.split(',').map((part) => part.trim());

  if (parts.length !== 2 || parts.some((part) => part.length === 0)) {
    throw new Error(
      `Spine atlas region "${regionName}" field "${fieldName}" contains invalid number pair: ${rawValue}`,
    );
  }

  const [first, second] = parts;
  const firstNumber = Number(first);
  const secondNumber = Number(second);

  if (!Number.isFinite(firstNumber) || !Number.isFinite(secondNumber)) {
    throw new Error(
      `Spine atlas region "${regionName}" field "${fieldName}" contains invalid number pair: ${rawValue}`,
    );
  }

  return [firstNumber, secondNumber] as const;
}

function createRegion(name: string, imageName: string): SpineAtlasRegion {
  return {
    name,
    imageName,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    origWidth: 0,
    origHeight: 0,
    offsetX: 0,
    offsetY: 0,
    rotate: false,
  };
}

export function parseSpineAtlas(atlasText: string): SpineAtlasFile {
  const lines = atlasText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const imageName = lines[0] ?? '';
  const regions = new Map<string, SpineAtlasRegion>();
  let currentRegionName = '';
  let currentRegion: SpineAtlasRegion | null = null;

  const commitRegion = () => {
    if (!currentRegionName || !currentRegion) {
      return;
    }

    regions.set(currentRegionName, currentRegion);
  };

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index] ?? '';

    if (!line.includes(':')) {
      if (!currentRegionName) {
        currentRegionName = line;
        currentRegion = createRegion(line, imageName);
        continue;
      }

      commitRegion();
      currentRegionName = line;
      currentRegion = createRegion(line, imageName);
      continue;
    }

    if (!currentRegion) {
      continue;
    }

    const [rawKey, rawValue = ''] = line.split(':');
    const key = rawKey.trim();
    const value = rawValue.trim();

    if (key === 'rotate') {
      currentRegion.rotate = value === 'true' || value === '90';
      continue;
    }

    if (key === 'xy') {
      [currentRegion.x, currentRegion.y] = parseNumberPair(value, currentRegion.name, key);
      continue;
    }

    if (key === 'size') {
      [currentRegion.width, currentRegion.height] = parseNumberPair(value, currentRegion.name, key);
      continue;
    }

    if (key === 'orig') {
      [currentRegion.origWidth, currentRegion.origHeight] = parseNumberPair(
        value,
        currentRegion.name,
        key,
      );
      continue;
    }

    if (key === 'offset') {
      [currentRegion.offsetX, currentRegion.offsetY] = parseNumberPair(
        value,
        currentRegion.name,
        key,
      );
    }
  }

  commitRegion();

  return {
    imageName,
    regions,
  };
}
