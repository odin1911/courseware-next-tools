import { ResultOverlay as SharedResultOverlay } from '@/shared/components/result-chain-overlays';
import { BD_DRAGONBONES_ARMATURE } from '../../logic/runtime';
const SUCCESS_ZIP_URL = new URL('../../assets/skeleton/BD_mission_successed.zip', import.meta.url)
  .href;
const FAIL_ZIP_URL = new URL('../../assets/skeleton/BD_mission_failed.zip', import.meta.url).href;
const SUCCESS_AUDIO_URL = new URL(
  '../../../../shared/assets/audios/game_over_success.mp3',
  import.meta.url,
).href;
const FAIL_AUDIO_URL = new URL(
  '../../../../shared/assets/audios/game_over_fail.mp3',
  import.meta.url,
).href;

export interface ResultOverlayProps {
  result: 'success' | 'fail';
  onConfirm(): void;
}

export default function ResultOverlay({ result, onConfirm }: ResultOverlayProps) {
  return (
    <div
      data-overlay="result-pop"
      data-result={result}
      style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 30 }}
    >
      <SharedResultOverlay
        result={result === 'success' ? 'win' : 'lose'}
        successZipUrl={SUCCESS_ZIP_URL}
        failedZipUrl={FAIL_ZIP_URL}
        successSoundUrl={SUCCESS_AUDIO_URL}
        failedSoundUrl={FAIL_AUDIO_URL}
        resultArmature={BD_DRAGONBONES_ARMATURE}
        onConfirm={onConfirm}
        overlayTestId="bdv2-result-overlay"
      />
    </div>
  );
}
