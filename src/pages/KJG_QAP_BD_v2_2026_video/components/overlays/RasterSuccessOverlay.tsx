import { useEffect, useRef } from 'react';
import AtlasSprite from '@/shared/components/atlas-sprite';
import { createAudioManager } from '@/shared/components/audio-manager';
import commonGameAtlas from '@/shared/assets/common/commonGame.json';
import { getTextureAtlasFrame } from '@/shared/core/atlas';
import { getRasterAsset } from '../../rasterAssets';
import RasterAnimationPlayer from '../raster-animation/RasterAnimationPlayer';

const COMMON_GAME_ATLAS_URL = new URL(
  '../../../../shared/assets/common/commonGame.png',
  import.meta.url,
).href;
const BACKGROUND_URL = new URL(
  '../../../../shared/assets/common/commonGamebg_small.png',
  import.meta.url,
).href;
const SUCCESS_AUDIO_URL = new URL(
  '../../../../shared/assets/audios/game_over_success.mp3',
  import.meta.url,
).href;
const FAIL_AUDIO_URL = new URL(
  '../../../../shared/assets/audios/game_over_fail.mp3',
  import.meta.url,
).href;
const RESULT_ASSETS = {
  success: getRasterAsset('BD_mission_successed'),
  fail: getRasterAsset('BD_mission_failed'),
};

export default function RasterSuccessOverlay({
  result = 'success',
  onConfirm,
}: {
  result?: 'success' | 'fail';
  onConfirm(): void;
}) {
  const audioManagerRef = useRef(createAudioManager());
  const isSuccess = result === 'success';
  const rasterAsset = RESULT_ASSETS[result];
  const resultBadgeFrame = getTextureAtlasFrame(commonGameAtlas, 'gameCommon_label_bg');
  const labelFrameName = isSuccess ? 'label0001' : 'label0002';
  const resultLabelFrame = getTextureAtlasFrame(commonGameAtlas, labelFrameName);
  const resultLabelLeft = (resultBadgeFrame.width - resultLabelFrame.width) / 2;

  useEffect(() => {
    const audioManager = audioManagerRef.current;
    audioManager.play({
      src: isSuccess ? SUCCESS_AUDIO_URL : FAIL_AUDIO_URL,
      loop: false,
      volume: 1,
    });

    return () => {
      audioManager.stop();
    };
  }, [isSuccess]);

  useEffect(() => () => audioManagerRef.current.destroy(), []);

  return (
    <div
      data-testid="bdv2-result-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 60, 92, 0.42)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 548,
          height: 418,
          animation: 'ddvkOverlayFadeIn 220ms ease-out',
        }}
      >
        <img
          src={BACKGROUND_URL}
          alt=""
          aria-hidden="true"
          style={{ position: 'absolute', left: 0, top: 0, width: 548, height: 418 }}
        />
        <div style={{ position: 'absolute', left: 78, top: -36, width: 390, height: 79 }}>
          <AtlasSprite
            atlasUrl={COMMON_GAME_ATLAS_URL}
            atlasData={commonGameAtlas}
            frameName="gameCommon_label_bg"
          />
          <AtlasSprite
            atlasUrl={COMMON_GAME_ATLAS_URL}
            atlasData={commonGameAtlas}
            frameName={labelFrameName}
            style={{ position: 'absolute', left: resultLabelLeft, top: isSuccess ? 15.5 : 16.5 }}
          />
        </div>
        <div
          style={{ position: 'absolute', left: 93, top: 80, width: 360, height: 224.5 }}
        >
          <RasterAnimationPlayer
            key={result}
            manifest={rasterAsset.manifest}
            files={rasterAsset.files}
            action="start"
          />
        </div>
        <button
          type="button"
          onClick={onConfirm}
          data-testid="result-confirm-button"
          aria-label="确认结果"
          style={{
            position: 'absolute',
            left: 179.5,
            top: 317.5,
            width: 187,
            height: 64,
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          <AtlasSprite
            atlasUrl={COMMON_GAME_ATLAS_URL}
            atlasData={commonGameAtlas}
            frameName="gameCommon_BtnOK"
          />
        </button>
      </div>
    </div>
  );
}
