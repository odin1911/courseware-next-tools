import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import AtlasSprite from '@/shared/components/atlas-sprite';
import commonGameAtlas from '@/shared/assets/common/commonGame.json';
import SoundBarTrack from './SoundBarTrack';

const COMMON_GAME_ATLAS_URL = new URL('../../assets/common/commonGame.png', import.meta.url).href;

const SOUND_BAR_TRACK_WIDTH = 287;
const SOUND_BAR_THUMB_OFFSET_X = 15;

export const DEFAULT_LOBBY_SOUND_VOLUME = 0.7;

export interface LobbySoundControlLayout {
  wrapper: CSSProperties;
  soundBar: CSSProperties;
  button: CSSProperties;
}

export const SOUND_SETTING_LAYOUT: LobbySoundControlLayout = {
  wrapper: {
    position: 'absolute',
    top: 78,
    left: 474,
    width: 526,
    height: 130,
  },
  soundBar: {
    position: 'absolute',
    top: 81,
    left: 96,
    width: 426,
    height: 47,
  },
  button: {
    position: 'absolute',
    top: 0,
    left: 455,
    width: 74,
    height: 71,
    padding: 0,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
  },
};

export const LOBBY_SOUND_BAR_LAYOUT: LobbySoundControlLayout = {
  wrapper: {
    position: 'absolute',
    top: 80,
    left: 567.64,
    width: 436.36,
    height: 132.11,
  },
  soundBar: {
    position: 'absolute',
    top: 85.11,
    left: 0,
    width: 426,
    height: 47,
  },
  button: {
    position: 'absolute',
    top: 0,
    left: 362.36,
    width: 74,
    height: 71,
    padding: 0,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
  },
};

export function clampLobbySoundVolume(volume: number) {
  if (!Number.isFinite(volume)) {
    return DEFAULT_LOBBY_SOUND_VOLUME;
  }

  return Math.max(0, Math.min(volume, 1));
}

export function getLobbySoundVolumeFromSliderValue(value: number) {
  return clampLobbySoundVolume(value / 100);
}

export function getLobbySoundSliderValue(volume: number) {
  return Math.round(clampLobbySoundVolume(volume) * 100);
}

export function getLobbySoundIconFrameName(volume: number) {
  return clampLobbySoundVolume(volume) > 0 ? 'gameCommon_sound_on' : 'gameCommon_sound_off';
}

export function getLobbySoundTrackFillWidth(volume: number) {
  return Math.round(SOUND_BAR_TRACK_WIDTH * clampLobbySoundVolume(volume));
}

export function getLobbySoundTrackFillOffset(volume: number) {
  return getLobbySoundTrackFillWidth(volume);
}

export function getLobbySoundThumbLeft(volume: number) {
  return getLobbySoundTrackFillWidth(volume) - SOUND_BAR_THUMB_OFFSET_X;
}

interface LobbySoundControlProps {
  volume: number;
  onVolumeChange: (value: number) => void;
  layout?: LobbySoundControlLayout;
  onActivateSound?: () => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (nextOpen: boolean) => void;
  audioPlaying?: boolean;
  containerAriaLabel?: string;
  soundBarTestId?: string;
  sliderTestId?: string;
  buttonTestId?: string;
}

export default function LobbySoundControl({
  volume,
  onVolumeChange,
  layout = SOUND_SETTING_LAYOUT,
  onActivateSound,
  open,
  defaultOpen = false,
  onOpenChange,
  audioPlaying,
  containerAriaLabel = '大厅音量设置',
  soundBarTestId = 'lobby-soundbar',
  sliderTestId = 'lobby-volume-slider',
  buttonTestId = 'lobby-sound-button',
}: LobbySoundControlProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const controlRef = useRef<HTMLDivElement | null>(null);
  const soundBarVisible = open ?? uncontrolledOpen;
  const soundVolume = clampLobbySoundVolume(volume);
  const soundSliderValue = getLobbySoundSliderValue(soundVolume);
  const soundTrackFillOffset = getLobbySoundTrackFillOffset(soundVolume);
  const soundThumbLeft = getLobbySoundThumbLeft(soundVolume);
  const soundIconFrameName = getLobbySoundIconFrameName(soundVolume);

  const setSoundBarVisible = (nextOpen: boolean) => {
    if (open === undefined) {
      setUncontrolledOpen(nextOpen);
    }

    onOpenChange?.(nextOpen);
  };

  useEffect(() => {
    if (!soundBarVisible) {
      return;
    }

    const handleOuterPress = (event: MouseEvent | TouchEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (controlRef.current?.contains(target)) {
        return;
      }

      setSoundBarVisible(false);
    };

    window.addEventListener('mousedown', handleOuterPress);
    window.addEventListener('touchstart', handleOuterPress);

    return () => {
      window.removeEventListener('mousedown', handleOuterPress);
      window.removeEventListener('touchstart', handleOuterPress);
    };
  }, [soundBarVisible]);

  const handleSoundSliderChange = (nextValue: string) => {
    onActivateSound?.();
    onVolumeChange(getLobbySoundVolumeFromSliderValue(Number(nextValue)));
  };

  return (
    <div
      ref={controlRef}
      style={{
        zIndex: 4,
        ...layout.wrapper,
      }}
      aria-label={containerAriaLabel}
      onMouseDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
    >
      <div
        data-testid={soundBarTestId}
        data-visible={soundBarVisible ? 'true' : 'false'}
        style={{
          display: soundBarVisible ? 'block' : 'none',
          zIndex: 1,
          ...layout.soundBar,
        }}
      >
        <SoundBarTrack
          sliderValue={soundSliderValue}
          trackFillOffset={soundTrackFillOffset}
          thumbLeft={soundThumbLeft}
          sliderTestId={sliderTestId}
          ariaLabel="大厅音量"
          onSliderChange={handleSoundSliderChange}
        />
      </div>

      <button
        type="button"
        aria-label="音量开关"
        data-testid={buttonTestId}
        data-muted={soundVolume > 0 ? 'false' : 'true'}
        data-audio-playing={
          audioPlaying === undefined ? undefined : audioPlaying ? 'true' : 'false'
        }
        data-volume={String(soundSliderValue)}
        data-soundbar-open={soundBarVisible ? 'true' : 'false'}
        onClick={() => {
          onActivateSound?.();
          setSoundBarVisible(!soundBarVisible);
        }}
        style={layout.button}
      >
        <AtlasSprite
          atlasUrl={COMMON_GAME_ATLAS_URL}
          atlasData={commonGameAtlas}
          frameName={soundIconFrameName}
        />
      </button>
    </div>
  );
}
