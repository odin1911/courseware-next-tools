import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const dragonBonesPlayerSource = readFileSync(
  new URL('./DragonBonesPlayer.tsx', import.meta.url),
  'utf8',
);

const spriteFactory = vi.fn();
const Sprite = vi.fn(function SpriteMock(texture: unknown) {
  return spriteFactory(texture);
});
const Texture = vi.fn(function TextureMock(baseTexture: unknown) {
  return { baseTexture };
});

vi.mock('@alo7/dragonbones-pixi', () => ({
  PixiSkItem: class {},
}));

vi.mock('pixi.js', () => ({
  Sprite,
  Texture,
}));

describe('DragonBonesPlayer', async () => {
  const { attachBackgroundTexture, playMovieAnimation, showMovieAnimationFirstFrame } =
    await import('./DragonBonesPlayer');

  it('共享播放器默认按 premultiplied alpha 创建透明画布', () => {
    expect(dragonBonesPlayerSource).toContain("transparentMode = 'premultiplied'");
  });

  it('共享播放器不再暴露 demo 专用的 onArmatureNamesResolved 回调', () => {
    expect(dragonBonesPlayerSource).not.toContain('onArmatureNamesResolved');
  });

  it('autoPlay=false 时可先渲染指定动作首帧，避免暴露骨架默认姿态', () => {
    expect(dragonBonesPlayerSource).toContain('initialAnimation?: string');
    expect(dragonBonesPlayerSource).toContain('initialAnimation && movie.movementList.includes');
    expect(dragonBonesPlayerSource).toContain(
      'gotoMovieFrame(movie as MovieWithChildArmatures, initialAnimationName, 0);',
    );
  });

  it('恢复 bg.png 处理时仍不保留子骨架控制接口', () => {
    expect(dragonBonesPlayerSource).not.toContain('playChild(');
    expect(dragonBonesPlayerSource).not.toContain('stopChild(');
    expect(dragonBonesPlayerSource).not.toContain('stopAllChild(');
    expect(dragonBonesPlayerSource).not.toContain('isChildPlaying(');
    expect(dragonBonesPlayerSource).not.toContain('activeChildPlaybackRef');
  });

  it('完成回调始终读取最新 props，避免多段动画卡在旧闭包', () => {
    expect(dragonBonesPlayerSource).toContain('const onCompleteRef = useRef(onComplete);');
    expect(dragonBonesPlayerSource).toContain('onCompleteRef.current = onComplete;');
    expect(dragonBonesPlayerSource).toContain('onCompleteRef.current?.(movie.curtMovement);');
  });

  it('在 zip 含 bgTexture 时把背景 sprite 插到骨骼 display 底层', () => {
    const addChild = vi.fn();
    const bgTexture = { label: 'bg-texture' };
    const bgSprite = { label: 'bg-sprite' };

    spriteFactory.mockReturnValue(bgSprite);

    attachBackgroundTexture(
      {
        bgTexture,
      } as never,
      {
        addChild,
      } as never,
    );

    expect(Texture).toHaveBeenCalledWith(bgTexture);
    expect(spriteFactory).toHaveBeenCalledWith({ baseTexture: bgTexture });
    expect(addChild).toHaveBeenCalledWith(bgSprite);
  });

  it('重复播放同名动作时会无回卷地重新开始', () => {
    const stop = vi.fn();
    const play = vi.fn();

    playMovieAnimation(
      {
        curtMovement: 'start',
        stop,
        play,
      } as never,
      'start',
      false,
    );

    expect(stop).toHaveBeenCalledWith(false);
    expect(play).toHaveBeenCalledWith(1);
  });

  it('重复播放同名主动作时仍会重启使用 fallback 动画名的子骨架', () => {
    const childPlay = vi.fn();

    playMovieAnimation(
      {
        curtMovement: 'start',
        stop: vi.fn(),
        play: vi.fn(),
        _childArmatureList: [
          {
            animation: {
              animationNames: ['1'],
              lastAnimationName: '1',
              play: childPlay,
            },
          },
        ],
      } as never,
      'start',
      false,
    );

    expect(childPlay).toHaveBeenCalledWith('1', 1);
  });

  it('可切到指定动作首帧且不启动播放', () => {
    const stop = vi.fn();
    const play = vi.fn();

    showMovieAnimationFirstFrame(
      {
        curtMovement: 'idle',
        movementList: ['idle', 'start'],
        stop,
        play,
      } as never,
      'start',
    );

    expect(stop).toHaveBeenCalledWith(true);
    expect(play).not.toHaveBeenCalled();
  });
});
