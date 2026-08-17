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
  const {
    attachBackgroundTexture,
    fitMovieAnimationToViewport,
    fitMovieDisplayToViewport,
    playMovieAnimation,
    showMovieAnimationFirstFrame,
  } = await import('./DragonBonesPlayer');

  it('共享播放器默认按 premultiplied alpha 创建透明画布', () => {
    expect(dragonBonesPlayerSource).toContain("transparentMode = 'premultiplied'");
  });

  it('共享播放器不再暴露 demo 专用的 onArmatureNamesResolved 回调', () => {
    expect(dragonBonesPlayerSource).not.toContain('onArmatureNamesResolved');
  });

  it('渲染画布不参与命中，触摸由外层交互宿主统一处理', () => {
    expect(dragonBonesPlayerSource).toContain("app.view.style.pointerEvents = 'none';");
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

  it('默认 fitSize 保留原有当前帧铺满行为', () => {
    const setScale = vi.fn();
    const display = {
      x: 0,
      y: 0,
      scale: { set: setScale },
      getLocalBounds: () => ({ x: 0, y: 0, width: 100, height: 50 }),
    };

    fitMovieDisplayToViewport({ display } as never, 200, 100);

    expect(setScale).toHaveBeenCalledWith(2);
    expect(display).toMatchObject({ x: 0, y: 0 });
  });

  it('完整动作适配对小动画只居中不放大', () => {
    const setScale = vi.fn();
    const display = {
      x: 0,
      y: 0,
      scale: { set: setScale },
      getLocalBounds: () => ({ x: 0, y: 0, width: 27, height: 19 }),
    };

    fitMovieAnimationToViewport({ display } as never, 320, 220, 'start');

    expect(setScale).toHaveBeenCalledWith(1);
    expect(display).toMatchObject({ x: 146.5, y: 100.5 });
  });

  it('完整动作适配缩小大动画时保留安全边距并居中', () => {
    const setScale = vi.fn();
    const display = {
      x: 0,
      y: 0,
      scale: { set: setScale },
      getLocalBounds: () => ({ x: 0, y: 0, width: 400, height: 100 }),
    };

    const viewportBounds = fitMovieAnimationToViewport(
      { display } as never,
      320,
      220,
      'start',
    );

    expect(setScale).toHaveBeenCalledWith(0.72);
    expect(display).toMatchObject({ x: 16, y: 74 });
    expect(viewportBounds).toEqual({ x: 16, y: 74, width: 288, height: 72 });
  });

  it('完整动作适配按全帧范围居中，保留帧间位移', () => {
    const setScale = vi.fn();
    const frames = [
      { x: 0, y: 0, width: 100, height: 50 },
      { x: 200, y: 0, width: 100, height: 50 },
    ];
    let frameIndex = 0;
    const display = {
      x: 0,
      y: 0,
      scale: { set: setScale },
      getLocalBounds: () => frames[frameIndex],
    };
    const gotoAndStopByFrame = vi.fn((_name: string, frame: number) => {
      frameIndex = frame;
    });
    const movie = {
      display,
      stop: vi.fn(),
      armatrue: {
        animation: { gotoAndStopByFrame },
        advanceTime: vi.fn(),
        armatureData: {
          frameRate: 24,
          getAnimation: () => ({ frameCount: frames.length, duration: 1 }),
        },
      },
    };

    fitMovieAnimationToViewport(movie as never, 200, 100, 'start');

    expect(gotoAndStopByFrame).toHaveBeenCalledTimes(2);
    expect(setScale).toHaveBeenCalledWith(0.56);
    expect(display.x).toBeCloseTo(16);
    expect(display.y).toBeCloseTo(36);
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

  it('公开按 armature 名称播放内嵌动作的控制接口', () => {
    expect(dragonBonesPlayerSource).toContain('playArmatureAnimation:');
    expect(dragonBonesPlayerSource).toContain('child.name === armatureName');
    expect(dragonBonesPlayerSource).toContain('animation.play(animationName, playTimes)');
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
