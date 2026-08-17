import { useEffect, useState } from 'react';
import { stagePresets, type FixedStagePresetKey } from './presets';

export function useFixedStageScale(presetKey: FixedStagePresetKey) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const preset = stagePresets[presetKey];

    const updateScale = () => {
      const nextScale = Math.min(
        window.innerWidth / preset.width,
        window.innerHeight / preset.height,
      );

      setScale(nextScale || 1);
    };

    updateScale();
    window.addEventListener('resize', updateScale);

    return () => {
      window.removeEventListener('resize', updateScale);
    };
  }, [presetKey]);

  return scale;
}
