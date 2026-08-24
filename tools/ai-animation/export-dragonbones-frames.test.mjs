import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import {
  createExportConfig,
  exportCapturedAssets,
  writeCapturedFrame,
} from './export-dragonbones-frames.mjs';

const temporaryDirs = [];

afterEach(() => {
  for (const directory of temporaryDirs.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('DragonBones frame export files', () => {
  test('writes a PNG data URL to the expected one-based frame path', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dragonbones-export-test-'));
    temporaryDirs.push(root);
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

    const output = writeCapturedFrame(
      root,
      'BD_ola',
      'wait',
      0,
      `data:image/png;base64,${png.toString('base64')}`,
    );

    expect(path.relative(root, output)).toBe('BD_ola/wait/frame-0001.png');
    expect(fs.readFileSync(output)).toEqual(png);
  });

  test('creates config actions from measured metadata and explicit loop actions', () => {
    const config = createExportConfig(
      {
        asset: 'BD_ola',
        fps: 24,
        canvas: { width: 184, height: 215 },
        anchor: { x: -96, y: 30 },
        actions: [
          { name: 'enter', frameCount: 18, duration: 0.75, frameRate: 24 },
          { name: 'wait', frameCount: 152, duration: 152 / 24, frameRate: 24 },
          { name: 'end', frameCount: 1, duration: 1 / 24, frameRate: 24 },
        ],
      },
      { origin: { x: 0, y: 244 }, loopActions: ['enter', 'wait'] },
    );

    expect(config).toEqual({
      asset: 'BD_ola',
      fps: 24,
      canvas: { width: 184, height: 215 },
      anchor: { x: -96, y: 30 },
      actions: [
        { name: 'enter', frameCount: 18, loop: true },
        { name: 'wait', frameCount: 152, loop: true },
        { name: 'end', frameCount: 1, loop: false },
      ],
    });
  });

  test('rejects profiles without an origin', () => {
    expect(() =>
      createExportConfig(
        {
          asset: 'heart',
          fps: 24,
          canvas: { width: 10, height: 10 },
          anchor: { x: 0, y: 0 },
          actions: [{ name: 'start', frameCount: 2, duration: 2 / 24, frameRate: 24 }],
        },
        { loopActions: [] },
      ),
    ).toThrow('heart export profile is missing origin');
  });

  test('exports captured frames and config without exposing partial output', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dragonbones-export-test-'));
    temporaryDirs.push(root);
    const framesRoot = path.join(root, 'frames');
    const configDir = path.join(root, 'configs');
    const pngUrl = `data:image/png;base64,${Buffer.from('png').toString('base64')}`;

    await exportCapturedAssets({
      assets: ['BD_flash.zip'],
      profiles: {
        'BD_flash.zip': { origin: { x: 0, y: 0 }, loopActions: ['start'] },
      },
      framesRoot,
      configDir,
      loadAsset: async () => ({
        meta: {
          asset: 'BD_flash',
          fps: 24,
          canvas: { width: 20, height: 22 },
          anchor: { x: -2, y: -2 },
          actions: [
            { name: 'start', frameCount: 2, duration: 2 / 24, frameRate: 24 },
            { name: 'end', frameCount: 1, duration: 1 / 24, frameRate: 24 },
          ],
        },
        capture: async () => pngUrl,
      }),
    });

    expect(fs.readdirSync(path.join(framesRoot, 'BD_flash', 'start'))).toEqual([
      'frame-0001.png',
      'frame-0002.png',
    ]);
    expect(JSON.parse(fs.readFileSync(path.join(configDir, 'BD_flash.json'), 'utf8'))).toEqual({
      asset: 'BD_flash',
      fps: 24,
      canvas: { width: 20, height: 22 },
      anchor: { x: -2, y: -2 },
      actions: [
        { name: 'start', frameCount: 2, loop: true },
        { name: 'end', frameCount: 1, loop: false },
      ],
    });
  });

  test('removes staged frames when capture fails', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dragonbones-export-test-'));
    temporaryDirs.push(root);
    const framesRoot = path.join(root, 'frames');

    await expect(
      exportCapturedAssets({
        assets: ['heart.zip'],
        profiles: { 'heart.zip': { origin: { x: 512, y: 384 }, loopActions: [] } },
        framesRoot,
        configDir: path.join(root, 'configs'),
        loadAsset: async () => ({
          meta: {
            asset: 'heart',
            fps: 24,
            canvas: { width: 20, height: 20 },
            anchor: { x: 0, y: 0 },
            actions: [{ name: 'start', frameCount: 2, duration: 2 / 24, frameRate: 24 }],
          },
          capture: async (_action, frame) => {
            if (frame === 1) throw new Error('capture failed');
            return `data:image/png;base64,${Buffer.from('png').toString('base64')}`;
          },
        }),
      }),
    ).rejects.toThrow('capture failed');
    expect(fs.existsSync(framesRoot)).toBe(false);
  });
});
