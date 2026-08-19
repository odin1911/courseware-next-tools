import { describe, expect, test } from 'vitest';

async function loadAssetBuilder() {
  return import('./build-animation-assets.mjs').catch(() => null);
}

describe('animation asset build plan', () => {
  test('builds WebM, HEVC alpha MOV and paged PNG atlas commands', async () => {
    const builder = await loadAssetBuilder();
    const entry = {
      frameCount: 38,
      duration: 38 / 24,
      loop: true,
      webm: 'wait.webm',
      mov: 'wait.mov',
      atlases: [
        { src: 'wait-atlas-01.png', columns: 6, rows: 6, startFrame: 0, frameCount: 36 },
        { src: 'wait-atlas-02.png', columns: 6, rows: 6, startFrame: 36, frameCount: 2 },
      ],
    };

    const plan = builder?.createActionBuildPlan({
      actionName: 'wait',
      entry,
      fps: 24,
      framesPattern: '/tmp/frames/frame-%04d.png',
      outputDir: '/tmp/output',
    });

    expect(plan?.map(({ kind }) => kind)).toEqual(['webm', 'mov', 'atlas', 'atlas']);
    expect(plan?.[0].args).toContain('yuva420p');
    expect(plan?.[1].args).toEqual(
      expect.arrayContaining([
        'crop=trunc(iw/2)*2:trunc(ih/2)*2,premultiply=inplace=1,format=bgra',
        'hevc_videotoolbox',
        '-alpha_quality',
        '1',
        'hvc1',
      ]),
    );
    expect(plan?.[2].args.join(' ')).toContain(
      'tile=layout=6x6:nb_frames=36:color=black@0',
    );
    expect(plan?.[3].args).toEqual(expect.arrayContaining(['-start_number', '37']));
  });

  test('copies one PNG without encoding video', async () => {
    const builder = await loadAssetBuilder();
    const plan = builder?.createActionBuildPlan({
      actionName: 'end',
      entry: { frameCount: 1, duration: 1 / 24, loop: false, still: 'end.png' },
      fps: 24,
      framesPattern: '/tmp/frames/frame-%04d.png',
      outputDir: '/tmp/output',
    });

    expect(plan).toEqual([
      {
        kind: 'still',
        source: '/tmp/frames/frame-0001.png',
        output: '/tmp/output/end.png',
      },
    ]);
  });
});
