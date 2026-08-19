import { FixedStageLayer } from '@/shared/components/fixed-stage-shell';
import type { BDMainCompletionSnapshot } from '../MainScene';
import type { BDMainModalScene, BDWordItem } from '../../sceneTypes';
import PauseOverlay from './PauseOverlay';
import ResultOverlay from './ResultOverlay';
import WordListOverlay from './WordListOverlay';

export interface MainModalOverlayLayerProps {
  mainModalScene: Exclude<BDMainModalScene, null>;
  soundVolume: number;
  resultSnapshot: BDMainCompletionSnapshot | null;
  wordListEntries: BDWordItem[] | null;
  onSoundVolumeChange(value: number): void;
  onHome(): void;
  onResetRequest(): void;
  onResume(): void;
  onConfirmReset(): void;
  onCancelReset(): void;
  onResultConfirm(): void;
  onWordListReset(): void;
}

export default function MainModalOverlayLayer({
  mainModalScene,
  soundVolume,
  resultSnapshot,
  wordListEntries,
  onSoundVolumeChange,
  onHome,
  onResetRequest,
  onResume,
  onConfirmReset,
  onCancelReset,
  onResultConfirm,
  onWordListReset,
}: MainModalOverlayLayerProps) {
  return (
    <FixedStageLayer data-main-modal-overlay-host="true" pointerEvents="auto" zIndex={30}>
      {mainModalScene === 'pause' || mainModalScene === 'second-confirm' ? (
        <PauseOverlay
          mode={mainModalScene}
          soundVolume={soundVolume}
          onSoundVolumeChange={onSoundVolumeChange}
          onHome={onHome}
          onReset={onResetRequest}
          onResume={onResume}
          onConfirmReset={onConfirmReset}
          onCancelReset={onCancelReset}
        />
      ) : null}

      {mainModalScene === 'result' && resultSnapshot ? (
        <ResultOverlay result={resultSnapshot.result} onConfirm={onResultConfirm} />
      ) : null}

      {mainModalScene === 'word-list' && wordListEntries ? (
        <WordListOverlay entries={wordListEntries} onHome={onHome} onReset={onWordListReset} />
      ) : null}
    </FixedStageLayer>
  );
}
