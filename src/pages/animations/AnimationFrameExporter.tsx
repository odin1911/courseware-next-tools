import { useEffect, useRef, useState } from 'react';
import DragonBonesPlayer from '@/shared/components/dragonbones-player';
import type { DragonBonesHandle } from '@/shared/components/dragonbones-player';
import type { DragonBonesBounds } from '@/shared/components/dragonbones-player/DragonBonesPlayer';
import { DEFAULT_ARMATURE } from '../dragonbones-tool/armatureSelection';
import type { AnimationAsset } from './animationCatalog';
import { buildExportGeometry } from './frameExporter';

type ExportActionMeta = {
  name: string;
  frameCount: number;
  duration: number;
  frameRate: number;
};

type FrameExporterApi = {
  status: 'loading' | 'ready' | 'error';
  error?: string;
  meta?: {
    asset: string;
    fps: number;
    canvas: { width: number; height: number };
    anchor: { x: number; y: number };
    sourceBounds: DragonBonesBounds;
    actions: ExportActionMeta[];
  };
  capture?: (actionName: string, frame: number) => string;
};

declare global {
  interface Window {
    __dragonBonesFrameExporter?: FrameExporterApi;
  }
}

const EXPORT_PADDING = 2;
const MEASURE_CANVAS_SIZE = 2048;

export default function AnimationFrameExporter({ asset }: { asset: AnimationAsset }) {
  const playerRef = useRef<DragonBonesHandle | null>(null);
  const [status, setStatus] = useState<FrameExporterApi['status']>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    window.__dragonBonesFrameExporter = { status: 'loading' };

    return () => {
      delete window.__dragonBonesFrameExporter;
    };
  }, []);

  const fail = (message: string) => {
    window.__dragonBonesFrameExporter = { status: 'error', error: message };
    setError(message);
    setStatus('error');
  };

  const prepare = () => {
    const player = playerRef.current;
    if (!player) {
      fail('DragonBones player is not ready');
      return;
    }

    try {
      const actions = player.getAnimationList().map((name) => {
        const meta = player.getAnimationMeta(name);
        if (!meta) {
          throw new Error(`missing animation metadata: ${name}`);
        }
        return { name, ...meta };
      });
      const frameBounds: DragonBonesBounds[] = [];

      for (const action of actions) {
        for (let frame = 0; frame < action.frameCount; frame += 1) {
          player.gotoAndStopByFrame(action.name, frame);
          const bounds = player.measureCurrentBounds();
          if (bounds?.width && bounds.height) {
            frameBounds.push(bounds);
          }
        }
      }

      const geometry = buildExportGeometry(frameBounds, EXPORT_PADDING);
      player.resizeCanvas(geometry.canvas.width, geometry.canvas.height);
      player.setDisplayTransform(geometry.transform);
      const fps = actions[0]?.frameRate ?? 24;
      const meta = {
        asset: asset.fileName.replace(/\.zip$/i, ''),
        fps,
        canvas: geometry.canvas,
        anchor: geometry.anchor,
        sourceBounds: geometry.sourceBounds,
        actions,
      };

      window.__dragonBonesFrameExporter = {
        status: 'ready',
        meta,
        capture(actionName, frame) {
          player.gotoAndStopByFrame(actionName, frame);
          const canvas = player.getCanvas();
          if (!canvas) {
            throw new Error('DragonBones canvas is unavailable');
          }
          return canvas.toDataURL('image/png');
        },
      };
      setStatus('ready');
    } catch (reason) {
      fail(reason instanceof Error ? reason.message : String(reason));
    }
  };

  return (
    <main
      data-testid="animation-frame-exporter"
      data-export-status={status}
      style={{ width: MEASURE_CANVAS_SIZE, height: MEASURE_CANVAS_SIZE }}
    >
      <DragonBonesPlayer
        ref={playerRef}
        zipUrl={asset.zipUrl}
        armature={DEFAULT_ARMATURE}
        width={MEASURE_CANVAS_SIZE}
        height={MEASURE_CANVAS_SIZE}
        autoPlay={false}
        forceCanvas
        transparent
        transparentMode="notMultiplied"
        onReady={prepare}
        onError={fail}
      />
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
