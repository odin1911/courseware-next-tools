import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const pageRoot = path.resolve(__dirname);
const rasterRoot = path.join(pageRoot, 'assets/raster');

type ManifestAction = {
  webm?: string;
  mov?: string;
  still?: string;
  atlases?: Array<{ src: string }>;
};

type Manifest = {
  canvas: { width: number; height: number };
  actions: Record<string, ManifestAction>;
};

function loadRasterManifests() {
  return fs
    .readdirSync(rasterRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => [
      entry.name,
      JSON.parse(fs.readFileSync(path.join(rasterRoot, entry.name, 'manifest.json'), 'utf8')) as Manifest,
    ] as const);
}

describe('KJG_QAP_BD_v2_2026 video animation migration', () => {
  test('publishes all fourteen resources and sixty-three actions', () => {
    const manifests = loadRasterManifests();
    const actions = manifests.flatMap(([, manifest]) => Object.values(manifest.actions));

    expect(manifests).toHaveLength(14);
    expect(actions).toHaveLength(63);
    expect(actions.filter((action) => action.webm && action.mov)).toHaveLength(49);
    expect(actions.filter((action) => action.still)).toHaveLength(14);
    for (const [, manifest] of manifests) {
      expect(manifest.canvas.width % 2).toBe(0);
      expect(manifest.canvas.height % 2).toBe(0);
    }
  });

  test('every manifest reference exists in the raster asset directory', () => {
    for (const [asset, manifest] of loadRasterManifests()) {
      const files = Object.values(manifest.actions).flatMap((action) => [
        ...(action.webm ? [action.webm] : []),
        ...(action.mov ? [action.mov] : []),
        ...(action.still ? [action.still] : []),
        ...(action.atlases?.map((atlas) => atlas.src) ?? []),
      ]);

      for (const file of files) {
        expect(fs.existsSync(path.join(pageRoot, 'assets/raster', asset, file)), file).toBe(true);
      }
    }
  });

  test('the video template has no local DragonBones resource path', () => {
    const sourceFiles = fs
      .readdirSync(path.join(pageRoot, 'components'), { recursive: true, encoding: 'utf8' })
      .filter(
        (name) =>
          typeof name === 'string' &&
          (name.endsWith('.ts') || name.endsWith('.tsx')) &&
          !name.includes('.test.'),
      );
    const source = sourceFiles
      .map((name) => fs.readFileSync(path.join(pageRoot, 'components', name), 'utf8'))
      .join('\n');
    const skeletonDir = path.join(pageRoot, 'assets/skeleton');

    expect(source).not.toContain('@/shared/components/dragonbones-player');
    expect(source).not.toContain('assets/skeleton/');
    expect(source).not.toContain('data-render-mode="dragonbones"');
    expect(fs.existsSync(skeletonDir) ? fs.readdirSync(skeletonDir) : []).toEqual([]);
  });
});
