import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FixedStageContentFrameLayer,
  FixedStageLayer,
  FixedStageSceneFrame,
  type FixedStageContentFrame,
  type FixedStagePresetKey,
} from '@/shared/components/fixed-stage-shell';
import LobbyStartButton, {
  type LobbyStartButtonPhase,
} from '@/shared/components/lobby-start-button';
import LobbySoundControl, {
  type LobbySoundControlLayout,
} from '@/shared/components/lobby-sound-control';
import LobbyTitlePlayer from '@/shared/components/lobby-title-player';
import { createAudioManager } from '@/shared/components/audio-manager/AudioManager';
import atlasData from '../assets/textures/KJG_QAP_BD_v2.json';
import { BD_DRAGONBONES_ARMATURE } from '../logic/runtime';
import { BurgerDinerStageBackgroundImage } from '../stage-backgrounds';

const ATLAS_URL = new URL('../assets/textures/KJG_QAP_BD_v2.png', import.meta.url).href;
const TITLE_ZIP_URL = new URL('../assets/skeleton/BD_title.zip', import.meta.url).href;
const LOBBY_BGM_URL = new URL('@/shared/assets/audios/game_lobby_bgm.mp3', import.meta.url).href;
const STAGE_WIDTH = 1024;
const STAGE_HEIGHT = 768;
const START_BUTTON_LEFT = 392;
const START_BUTTON_TOP = 363.15;
const START_BUTTON_WIDTH = 240;
const START_BUTTON_HEIGHT = 212;
const START_BUTTON_TRANSFORM_ORIGIN = '120px 106px';
const TITLE_FLOAT_ANIMATION = 'bdv2LobbyFloat 6000ms ease-in-out infinite';
const START_BUTTON_ENTER_ANIMATION =
  'bdv2LobbyStartEnter 800ms cubic-bezier(0.23, 1.5, 0.32, 1) forwards';
const START_BUTTON_ENTER_ANIMATION_NAME = 'bdv2LobbyStartEnter';
const START_BUTTON_IDLE_ANIMATION = 'bdv2Pulse 2300ms ease-in-out infinite';
const BD_LOBBY_SOUND_BAR_LAYOUT: LobbySoundControlLayout = {
  wrapper: {
    position: 'absolute',
    top: 80,
    left: 576.91,
    width: 429.09,
    height: 130.9,
  },
  soundBar: {
    position: 'absolute',
    top: 82.11,
    left: 0,
    width: 429.09,
    height: 48.79,
  },
  button: {
    position: 'absolute',
    top: 0,
    left: 353.09,
    width: 74,
    height: 71,
    padding: 0,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
  },
};

export interface LobbySceneProps {
  presetKey: FixedStagePresetKey;
  legacyContentFrame: FixedStageContentFrame;
  soundVolume: number;
  onSoundVolumeChange(nextValue: number): void;
  onStart(): void;
}

export default function LobbyScene({
  presetKey,
  legacyContentFrame,
  soundVolume,
  onSoundVolumeChange,
  onStart,
}: LobbySceneProps) {
  const [startPhase, setStartPhase] = useState<LobbyStartButtonPhase>('hidden');
  const lobbyBgmRef = useRef(createAudioManager());
  const [lobbyBgmPlaying, setLobbyBgmPlaying] = useState(false);

  const ensureLobbyBgm = useCallback(() => {
    const manager = lobbyBgmRef.current;
    const currentSound = manager.getCurrentSound();
    const currentSrc = manager.getState().src[0];

    if (!currentSound || currentSrc !== LOBBY_BGM_URL) {
      manager.play({
        src: LOBBY_BGM_URL,
        loop: true,
        volume: soundVolume,
        html5: true,
      });
      return;
    }

    manager.setLoop(true);
    manager.setVolume(soundVolume);

    if (manager.getState().status === 'paused') {
      manager.resume();
      return;
    }

    if (!manager.isPlaying()) {
      currentSound.play();
    }
  }, [soundVolume]);

  const ensureLobbyBgmRef = useRef(ensureLobbyBgm);
  ensureLobbyBgmRef.current = ensureLobbyBgm;

  useEffect(() => {
    setStartPhase('hidden');
    ensureLobbyBgmRef.current();

    return () => {
      lobbyBgmRef.current.stop();
    };
  }, []);

  useEffect(() => {
    const handleUserActivateAudio = () => {
      ensureLobbyBgm();
    };

    window.addEventListener('pointerdown', handleUserActivateAudio);
    window.addEventListener('keydown', handleUserActivateAudio);

    return () => {
      window.removeEventListener('pointerdown', handleUserActivateAudio);
      window.removeEventListener('keydown', handleUserActivateAudio);
    };
  }, [ensureLobbyBgm]);

  useEffect(() => {
    lobbyBgmRef.current.setVolume(soundVolume);
  }, [soundVolume]);

  useEffect(() => {
    return () => {
      lobbyBgmRef.current.destroy();
    };
  }, []);

  useEffect(() => {
    return lobbyBgmRef.current.subscribe((state) => {
      setLobbyBgmPlaying(state.playing);
    });
  }, []);

  return (
    <FixedStageSceneFrame presetKey={presetKey}>
      <FixedStageLayer data-stage-background-host="true" zIndex={0}>
        <BurgerDinerStageBackgroundImage presetKey={presetKey} backgroundKey="lobby" />
      </FixedStageLayer>

      <FixedStageContentFrameLayer
        presetKey={presetKey}
        contentFrame={legacyContentFrame}
        zIndex={1}
      >
        <div
          data-scene="lobby"
          data-page-scene-host="lobby"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 1024,
            height: 768,
            overflow: 'hidden',
          }}
        >
          <LobbyTitlePlayer
            zipUrl={TITLE_ZIP_URL}
            armature={BD_DRAGONBONES_ARMATURE}
            width={STAGE_WIDTH}
            height={STAGE_HEIGHT}
            floatAnimation={TITLE_FLOAT_ANIMATION}
            onStartPhaseChange={setStartPhase}
          />
          <LobbyStartButton
            phase={startPhase}
            onClick={() => {
              lobbyBgmRef.current.stop();
              onStart();
            }}
            atlasUrl={ATLAS_URL}
            atlasData={atlasData}
            frameName="KJG_QAP_BD_v2_start_btn"
            left={START_BUTTON_LEFT}
            top={START_BUTTON_TOP}
            width={START_BUTTON_WIDTH}
            height={START_BUTTON_HEIGHT}
            enterAnimation={START_BUTTON_ENTER_ANIMATION}
            enterAnimationName={START_BUTTON_ENTER_ANIMATION_NAME}
            idleAnimation={START_BUTTON_IDLE_ANIMATION}
            transformOrigin={START_BUTTON_TRANSFORM_ORIGIN}
            testId="bdv2-lobby-start-button"
            onEnterComplete={() => {
              setStartPhase('idle');
            }}
          />
          <LobbySoundControl
            volume={soundVolume}
            onVolumeChange={onSoundVolumeChange}
            layout={BD_LOBBY_SOUND_BAR_LAYOUT}
            onActivateSound={ensureLobbyBgm}
            audioPlaying={lobbyBgmPlaying}
            containerAriaLabel="大厅音量设置"
            buttonTestId="bdv2-lobby-sound-button"
            soundBarTestId="bdv2-lobby-soundbar"
            sliderTestId="bdv2-lobby-volume-slider"
          />
        </div>
      </FixedStageContentFrameLayer>
    </FixedStageSceneFrame>
  );
}
