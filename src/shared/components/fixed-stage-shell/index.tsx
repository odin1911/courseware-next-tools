import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { StageTitle } from '@/shared/components/title-image';
import { stagePresets, type FixedStagePresetKey } from './presets';

export type FixedStageContentFrameFitMode = 'none' | 'contain';

export interface FixedStageContentFrame {
  width: number;
  height: number;
  fitMode?: FixedStageContentFrameFitMode;
}

export interface FixedStageShellProps {
  presetKey: FixedStagePresetKey;
  scale: number;
  children?: ReactNode;
}

export interface FixedStageContentFrameLayerProps {
  presetKey: FixedStagePresetKey;
  contentFrame: FixedStageContentFrame;
  zIndex?: number;
  children?: ReactNode;
}

export interface FixedStageSceneFrameProps {
  presetKey: FixedStagePresetKey;
  children?: ReactNode;
}

export interface FixedStageLayerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  zIndex?: number;
  overflow?: CSSProperties['overflow'];
  pointerEvents?: CSSProperties['pointerEvents'];
  children?: ReactNode;
}

export interface FixedStageTitleLayerProps {
  src?: string;
  title?: string;
}

function getStageStyle(presetKey: FixedStagePresetKey, scale: number): CSSProperties {
  const preset = stagePresets[presetKey];

  return {
    width: preset.width,
    height: preset.height,
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: `translate(-50%, -50%) scale(${scale})`,
    transformOrigin: 'center center',
    overflow: 'hidden',
  };
}

function getContentFrameScale(
  presetKey: FixedStagePresetKey,
  contentFrame: FixedStageContentFrame,
): number {
  if (contentFrame.fitMode !== 'contain') {
    return 1;
  }

  const preset = stagePresets[presetKey];
  return Math.min(preset.width / contentFrame.width, preset.height / contentFrame.height);
}

function getContentFrameStyle(
  presetKey: FixedStagePresetKey,
  contentFrame: FixedStageContentFrame,
  zIndex = 1,
): CSSProperties {
  const frameScale = getContentFrameScale(presetKey, contentFrame);

  return {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: contentFrame.width,
    height: contentFrame.height,
    zIndex,
    transform:
      frameScale === 1 ? 'translate(-50%, -50%)' : `translate(-50%, -50%) scale(${frameScale})`,
    transformOrigin: 'center center',
  };
}

function getSceneFrameStyle(presetKey: FixedStagePresetKey): CSSProperties {
  const preset = stagePresets[presetKey];

  return {
    position: 'absolute',
    left: 0,
    top: 0,
    width: preset.width,
    height: preset.height,
    overflow: 'hidden',
    isolation: 'isolate',
    zIndex: 0,
  };
}

function getStageLayerStyle({
  zIndex,
  overflow = 'hidden',
  pointerEvents = 'none',
  style,
}: Pick<FixedStageLayerProps, 'zIndex' | 'overflow' | 'pointerEvents' | 'style'>): CSSProperties {
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    overflow,
    pointerEvents,
    zIndex,
    ...style,
  };
}

export function FixedStageContentFrameLayer({
  presetKey,
  contentFrame,
  zIndex,
  children,
}: FixedStageContentFrameLayerProps) {
  return (
    <div
      data-fixed-stage-content-frame="true"
      style={getContentFrameStyle(presetKey, contentFrame, zIndex)}
    >
      {children}
    </div>
  );
}

export function FixedStageSceneFrame({ presetKey, children }: FixedStageSceneFrameProps) {
  return (
    <div data-fixed-stage-scene-frame="true" style={getSceneFrameStyle(presetKey)}>
      {children}
    </div>
  );
}

export function FixedStageLayer({
  zIndex,
  overflow,
  pointerEvents,
  style,
  children,
  ...rest
}: FixedStageLayerProps) {
  return (
    <div
      {...rest}
      data-fixed-stage-layer="true"
      style={getStageLayerStyle({ zIndex, overflow, pointerEvents, style })}
    >
      {children}
    </div>
  );
}

export function FixedStageTitleLayer({ src, title }: FixedStageTitleLayerProps) {
  if (!src || !title) {
    return null;
  }

  return (
    <FixedStageLayer zIndex={2}>
      <StageTitle src={src}>{title}</StageTitle>
    </FixedStageLayer>
  );
}

export function FixedStageShell({ presetKey, scale, children }: FixedStageShellProps) {
  return (
    <div data-fixed-stage-shell="true" style={getStageStyle(presetKey, scale)}>
      {children}
    </div>
  );
}

export { stagePresets } from './presets';
export type { FixedStagePresetKey } from './presets';
export { useFixedStageScale } from './useFixedStageScale';
