export type FixedStagePresetKey = '1280x720';

export interface FixedStagePreset {
  width: number;
  height: number;
}

export const stagePresets: Record<FixedStagePresetKey, FixedStagePreset> = {
  '1280x720': { width: 1280, height: 720 },
};
