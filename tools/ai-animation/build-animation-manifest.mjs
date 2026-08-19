import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_MAX_TEXTURE_SIZE = 2048;

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
}

export function createActionEntry({
  name,
  frameCount,
  fps,
  loop,
  width,
  height,
  maxTextureSize = DEFAULT_MAX_TEXTURE_SIZE,
}) {
  if (!name) {
    throw new Error('action.name is required');
  }

  assertPositiveInteger(frameCount, `${name}.frameCount`);
  assertPositiveInteger(fps, 'fps');
  assertPositiveInteger(width, 'canvas.width');
  assertPositiveInteger(height, 'canvas.height');

  const base = {
    frameCount,
    duration: frameCount / fps,
    loop: Boolean(loop),
  };

  if (frameCount === 1) {
    return { ...base, still: `${name}.png` };
  }

  const columns = Math.floor(maxTextureSize / width);
  const maxRows = Math.floor(maxTextureSize / height);

  if (columns < 1 || maxRows < 1) {
    throw new Error(`${name} frame exceeds ${maxTextureSize}px atlas limit`);
  }

  const pageCapacity = columns * maxRows;
  const pageCount = Math.ceil(frameCount / pageCapacity);
  const atlases = Array.from({ length: pageCount }, (_, index) => {
    const startFrame = index * pageCapacity;

    const pageFrameCount = Math.min(pageCapacity, frameCount - startFrame);

    return {
      src: `${name}-atlas-${String(index + 1).padStart(2, '0')}.png`,
      columns,
      rows: Math.ceil(pageFrameCount / columns),
      startFrame,
      frameCount: pageFrameCount,
    };
  });

  return {
    ...base,
    webm: `${name}.webm`,
    mov: `${name}.mov`,
    atlases,
  };
}

export function buildManifest({ asset, fps, canvas, anchor, actions }) {
  if (!asset) {
    throw new Error('asset is required');
  }

  assertPositiveInteger(fps, 'fps');
  assertPositiveInteger(canvas?.width, 'canvas.width');
  assertPositiveInteger(canvas?.height, 'canvas.height');

  if (!Number.isFinite(anchor?.x) || !Number.isFinite(anchor?.y)) {
    throw new Error('anchor.x and anchor.y must be finite numbers');
  }

  if (!Array.isArray(actions) || actions.length === 0) {
    throw new Error('actions must not be empty');
  }

  const actionEntries = {};

  for (const action of actions) {
    if (actionEntries[action.name]) {
      throw new Error(`duplicate action: ${action.name}`);
    }

    actionEntries[action.name] = createActionEntry({
      ...action,
      fps,
      width: canvas.width,
      height: canvas.height,
    });
  }

  return {
    version: 1,
    asset,
    fps,
    canvas,
    anchor,
    actions: actionEntries,
  };
}

export function writeManifest(configPath, outputPath) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const manifest = buildManifest(config);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [configPath, outputPath] = process.argv.slice(2);

  if (!configPath || !outputPath) {
    console.error('Usage: node build-animation-manifest.mjs <config.json> <manifest.json>');
    process.exitCode = 1;
  } else {
    writeManifest(configPath, outputPath);
  }
}
