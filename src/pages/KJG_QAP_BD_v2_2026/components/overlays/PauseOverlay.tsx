import {
  PauseOverlay as SharedPauseOverlay,
  SecondConfirmOverlay,
} from '@/shared/components/pause-chain-overlays';

export interface PauseOverlayProps {
  mode: 'pause' | 'second-confirm';
  soundVolume: number;
  onSoundVolumeChange(nextValue: number): void;
  onHome(): void;
  onReset(): void;
  onResume(): void;
  onConfirmReset(): void;
  onCancelReset(): void;
}

export default function PauseOverlay(props: PauseOverlayProps) {
  if (props.mode === 'pause') {
    return (
      <div
        data-overlay="pause-pop"
        style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
      >
        <SharedPauseOverlay
          soundVolume={props.soundVolume}
          onSoundVolumeChange={props.onSoundVolumeChange}
          onHome={props.onHome}
          onReset={props.onReset}
          onResume={props.onResume}
          overlayTestId="bdv2-pause-overlay"
        />
      </div>
    );
  }

  return (
    <div
      data-overlay="second-pop"
      style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 12 }}
    >
      <SecondConfirmOverlay
        onConfirm={props.onConfirmReset}
        onCancel={props.onCancelReset}
        overlayTestId="bdv2-second-confirm-overlay"
      />
    </div>
  );
}
