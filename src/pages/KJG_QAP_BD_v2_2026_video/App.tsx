import { useCallback, useEffect, useState } from 'react';
import { useExerciseContentReady } from '@/shared/react/useExerciseContentReady';
import type { AppProps } from '@/shared/core/types/exercise';
import { FixedStageShell, useFixedStageScale } from '@/shared/components/fixed-stage-shell';
import LobbyScene from './components/LobbyScene';
import MainScene, { type BDMainCompletionSnapshot } from './components/MainScene';
import MainModalOverlayLayer from './components/overlays/MainModalOverlayLayer';
import { useExerciseSource } from '@/shared/react/useExerciseSource';
import {
  computeDayThresholds,
  computeEachDayCoustoms,
  computeHearts,
  DAY_WAIT_TIMES,
  normalizeBDExercise,
  normalizeBDWordList,
} from './logic/normalizeExercise';
import type {
  BDGameState,
  BDMainSubstate,
  BDMainModalScene,
  BDPageScene,
  BDWordItem,
} from './sceneTypes';
import { burgerDinerStageLayout } from './stage-layout';

function createInitialGameState(wordBanks: BDWordItem[]): BDGameState {
  const daily = computeEachDayCoustoms(wordBanks.length);
  const maxHearts = computeHearts(wordBanks.length);

  return {
    wordBanks,
    wordIndex: 0,
    hearts: maxHearts,
    maxHearts,
    goldCount: 0,
    dayIndex: 0,
    dayThresholds: computeDayThresholds(daily),
    waitTimes: [...DAY_WAIT_TIMES],
  };
}

export default function App(props: AppProps) {
  const exerciseSource = useExerciseSource(props);
  const stageLayout = burgerDinerStageLayout;
  const scale = useFixedStageScale(stageLayout.presetKey);
  const [wordBanks, setWordBanks] = useState<BDWordItem[] | null>(null);
  const [wordListEntries, setWordListEntries] = useState<BDWordItem[] | null>(null);
  const [pageScene, setPageScene] = useState<BDPageScene>('lobby');
  const [mainModalScene, setMainModalScene] = useState<BDMainModalScene>(null);
  const [mainSubstate, setMainSubstate] = useState<BDMainSubstate>('countdown');
  const [gameState, setGameState] = useState<BDGameState | null>(null);
  const [runInitialGameState, setRunInitialGameState] = useState<BDGameState | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [soundVolume, setSoundVolume] = useState(0.1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [resultSnapshot, setResultSnapshot] = useState<BDMainCompletionSnapshot | null>(null);
  useExerciseContentReady(
    !isLoading &&
      !errorText &&
      wordBanks !== null &&
      runInitialGameState !== null &&
      gameState !== null,
  );

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setErrorText('');

    exerciseSource
      .then(([exercise]) => {
        if (!active) {
          return;
        }

        if (!exercise) {
          throw new Error('未加载到有效的 KJG_QAP_BD_v2 数据。');
        }

        const normalized = normalizeBDExercise(exercise);
        const nextWordListEntries = normalizeBDWordList(exercise);
        const nextGameState = createInitialGameState(normalized);

        setWordBanks(normalized);
        setWordListEntries(nextWordListEntries);
        setRunInitialGameState(nextGameState);
        setGameState(nextGameState);
        setPageScene('lobby');
        setMainModalScene(null);
        setResultSnapshot(null);
        setMainSubstate('countdown');
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setWordBanks(null);
        setWordListEntries(null);
        setRunInitialGameState(null);
        setGameState(null);
        setErrorText(error instanceof Error ? error.message : 'KJG_QAP_BD_v2 数据加载失败。');
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [exerciseSource]);

  const resetToNewRun = useCallback(() => {
    if (!wordBanks) {
      return;
    }

    const nextGameState = createInitialGameState(wordBanks);
    setRunInitialGameState(nextGameState);
    setGameState(nextGameState);
    setMainSubstate('countdown');
    setMainModalScene(null);
    setResultSnapshot(null);
    setPageScene('main');
    setSessionKey((value) => value + 1);
  }, [wordBanks]);

  const returnToLobby = useCallback(() => {
    setMainModalScene(null);
    setResultSnapshot(null);
    setPageScene('lobby');
  }, []);

  const handleStart = useCallback(() => {
    if (!wordBanks) {
      return;
    }

    const nextGameState = createInitialGameState(wordBanks);
    setRunInitialGameState(nextGameState);
    setGameState(nextGameState);
    setResultSnapshot(null);
    setMainModalScene(null);
    setPageScene('main');
    setMainSubstate('countdown');
    setSessionKey((value) => value + 1);
  }, [wordBanks]);

  const showLoading = isLoading || !runInitialGameState || !gameState;

  return (
    <FixedStageShell presetKey={stageLayout.presetKey} scale={scale}>
      <div
        data-page="KJG_QAP_BD_v2"
        style={{ position: 'relative', width: '100%', height: '100%' }}
      >
        {showLoading ? (
          <div
            style={{
              width: 1024,
              height: 768,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            {errorText || 'Loading Burger Diner...'}
          </div>
        ) : null}

        {!showLoading && pageScene === 'lobby' ? (
          <LobbyScene
            presetKey={stageLayout.presetKey}
            legacyContentFrame={stageLayout.legacyContentFrame}
            soundVolume={soundVolume}
            onSoundVolumeChange={setSoundVolume}
            onStart={handleStart}
          />
        ) : null}

        {!showLoading && pageScene === 'main' && runInitialGameState ? (
          <MainScene
            key={`bd-main-${sessionKey}`}
            presetKey={stageLayout.presetKey}
            legacyContentFrame={stageLayout.legacyContentFrame}
            wordBanks={wordBanks ?? []}
            initialGameState={runInitialGameState}
            soundVolume={soundVolume}
            isPaused={mainModalScene === 'pause' || mainModalScene === 'second-confirm'}
            onPauseRequest={() => setMainModalScene('pause')}
            onSubstateChange={setMainSubstate}
            onGameStateChange={setGameState}
            onFinish={(snapshot) => {
              setResultSnapshot(snapshot);
              setMainModalScene('result');
              setMainSubstate('finished');
            }}
          />
        ) : null}

        {!showLoading && pageScene === 'main' && mainModalScene !== null ? (
          <MainModalOverlayLayer
            mainModalScene={mainModalScene}
            soundVolume={soundVolume}
            resultSnapshot={resultSnapshot}
            wordListEntries={wordListEntries}
            onSoundVolumeChange={setSoundVolume}
            onHome={returnToLobby}
            onResetRequest={() => setMainModalScene('second-confirm')}
            onResume={() => setMainModalScene(null)}
            onConfirmReset={resetToNewRun}
            onCancelReset={() => setMainModalScene('pause')}
            onResultConfirm={() => setMainModalScene('word-list')}
            onWordListReset={resetToNewRun}
          />
        ) : null}

        {!showLoading ? (
          <div className="bdv2-hidden" aria-hidden="true" data-main-substate={mainSubstate} />
        ) : null}
      </div>
    </FixedStageShell>
  );
}
