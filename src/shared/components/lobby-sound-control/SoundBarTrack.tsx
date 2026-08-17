import AtlasNineSlice from '@/shared/components/atlas-nine-slice';
import AtlasSprite from '@/shared/components/atlas-sprite';
import { getTextureAtlasFrame } from '@/shared/core/atlas';
import commonGameAtlas from '@/shared/assets/common/commonGame.json';

const COMMON_GAME_ATLAS_URL = new URL('../../assets/common/commonGame.png', import.meta.url).href;

const SOUND_BAR_WIDTH = 426;
const SOUND_BAR_HEIGHT = 47;
const SOUND_BAR_TRACK_LEFT = 75;
const SOUND_BAR_TRACK_TOP = 5.5;
const SOUND_BAR_TRACK_WIDTH = 287;
const SOUND_BAR_TRACK_HEIGHT = 30;
const SOUND_BAR_THUMB_TOP = -21.5;
const SOUND_BAR_FILL_SLICE = [1, 1, 1, 1] as const;

export function getLobbySoundTrackHitArea() {
  return {
    left: SOUND_BAR_TRACK_LEFT,
    top: SOUND_BAR_THUMB_TOP,
    width: SOUND_BAR_TRACK_WIDTH,
    height: SOUND_BAR_TRACK_TOP + SOUND_BAR_TRACK_HEIGHT - SOUND_BAR_THUMB_TOP,
  };
}

interface SoundBarTrackProps {
  sliderValue: number;
  trackFillOffset: number;
  thumbLeft: number;
  sliderTestId: string;
  ariaLabel: string;
  onSliderChange: (nextValue: string) => void;
}

export default function SoundBarTrack({
  sliderValue,
  trackFillOffset,
  thumbLeft,
  sliderTestId,
  ariaLabel,
  onSliderChange,
}: SoundBarTrackProps) {
  const trackFillFrame = getTextureAtlasFrame(commonGameAtlas, 'gameCommon_soundbar04');
  const trackHitArea = getLobbySoundTrackHitArea();

  return (
    <div
      style={{
        position: 'relative',
        width: SOUND_BAR_WIDTH,
        height: SOUND_BAR_HEIGHT,
      }}
    >
      <AtlasSprite
        atlasUrl={COMMON_GAME_ATLAS_URL}
        atlasData={commonGameAtlas}
        frameName="gameCommon_soundbarbg"
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
      <div
        style={{
          position: 'absolute',
          top: SOUND_BAR_TRACK_TOP,
          left: SOUND_BAR_TRACK_LEFT,
          width: SOUND_BAR_TRACK_WIDTH,
          height: SOUND_BAR_TRACK_HEIGHT,
          overflow: 'hidden',
          borderRadius: 999,
        }}
      >
        <AtlasSprite
          atlasUrl={COMMON_GAME_ATLAS_URL}
          atlasData={commonGameAtlas}
          frameName="gameCommon_soundbar02"
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: trackFillOffset,
            width: SOUND_BAR_TRACK_WIDTH,
            height: SOUND_BAR_TRACK_HEIGHT,
          }}
        >
          <AtlasNineSlice
            atlasUrl={COMMON_GAME_ATLAS_URL}
            sourceRect={[
              trackFillFrame.x,
              trackFillFrame.y,
              trackFillFrame.width,
              trackFillFrame.height,
            ]}
            slice={[...SOUND_BAR_FILL_SLICE]}
            width={SOUND_BAR_TRACK_WIDTH}
            height={SOUND_BAR_TRACK_HEIGHT}
          />
        </div>
      </div>
      <AtlasSprite
        atlasUrl={COMMON_GAME_ATLAS_URL}
        atlasData={commonGameAtlas}
        frameName="gameCommon_soundbar03"
        style={{
          position: 'absolute',
          top: SOUND_BAR_THUMB_TOP,
          left: SOUND_BAR_TRACK_LEFT + thumbLeft,
          pointerEvents: 'none',
        }}
      />
      <input
        data-testid={sliderTestId}
        aria-label={ariaLabel}
        type="range"
        min="0"
        max="100"
        value={sliderValue}
        onInput={(event) => onSliderChange(event.currentTarget.value)}
        onChange={(event) => onSliderChange(event.currentTarget.value)}
        style={{
          position: 'absolute',
          top: trackHitArea.top,
          left: trackHitArea.left,
          width: trackHitArea.width,
          height: trackHitArea.height,
          margin: 0,
          opacity: 0,
          cursor: 'pointer',
        }}
      />
    </div>
  );
}
