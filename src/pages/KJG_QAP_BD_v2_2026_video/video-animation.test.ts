import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import lakiManifest from './assets/raster/BD_laki/manifest.json';
import successManifest from './assets/raster/BD_mission_successed/manifest.json';
import countManifest from './assets/raster/count/manifest.json';

const pageRoot = path.resolve(__dirname);

describe('KJG_QAP_BD_v2_2026 video animation migration', () => {
  test('publishes ten video actions and three still end frames', () => {
    const actions = [
      ...Object.values(lakiManifest.actions),
      ...Object.values(successManifest.actions),
      ...Object.values(countManifest.actions),
    ];

    expect(actions.filter((action) => 'webm' in action && 'mov' in action)).toHaveLength(10);
    expect(actions.filter((action) => 'still' in action)).toHaveLength(3);
  });

  test('every manifest reference exists in the raster asset directory', () => {
    for (const [asset, manifest] of [
      ['BD_laki', lakiManifest],
      ['BD_mission_successed', successManifest],
      ['count', countManifest],
    ] as const) {
      const files = Object.values(manifest.actions).flatMap((action) => [
        ...('webm' in action ? [action.webm] : []),
        ...('mov' in action ? [action.mov] : []),
        ...('still' in action ? [action.still] : []),
        ...('atlases' in action ? action.atlases.map((atlas) => atlas.src) : []),
      ]);

      for (const file of files) {
        expect(fs.existsSync(path.join(pageRoot, 'assets/raster', asset, file)), file).toBe(true);
      }
    }
  });

  test('three business entry points no longer reference their target DragonBones zip', () => {
    const malu = fs.readFileSync(
      path.join(pageRoot, 'components/MainSceneParts/MaluCharacter.tsx'),
      'utf8',
    );
    const result = fs.readFileSync(
      path.join(pageRoot, 'components/overlays/ResultOverlay.tsx'),
      'utf8',
    );
    const flow = fs.readFileSync(
      path.join(pageRoot, 'components/overlays/MainFlowOverlayLayer.tsx'),
      'utf8',
    );

    expect(malu).not.toContain('BD_laki.zip');
    expect(result).not.toContain('BD_mission_successed.zip');
    expect(flow).not.toContain("@/shared/components/countdown-overlay");
    expect(`${malu}\n${result}\n${flow}`).toContain('RasterAnimationPlayer');
  });
});
