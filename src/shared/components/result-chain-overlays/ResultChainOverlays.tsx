import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import AtlasSprite from '@/shared/components/atlas-sprite';
import AtlasNineSlice from '@/shared/components/atlas-nine-slice';
import GameQuestionVisual from '@/shared/components/game-question-visual';
import DragonBonesPlayer from '@/shared/components/dragonbones-player';
import type { GameQuestionAnimationType } from '@/shared/core/game/GameExerciseDataProvider';
import type { DragonBonesHandle } from '@/shared/components/dragonbones-player';
import { createAudioManager } from '@/shared/components/audio-manager';
import { getTextureAtlasFrame } from '@/shared/core/atlas';
import commonGameAtlas from '@/shared/assets/common/commonGame.json';
import { playSharedWordListEntryAudio, type SharedWordListAudioController } from './wordListAudio';

const COMMON_GAME_ATLAS_URL = new URL('../../assets/common/commonGame.png', import.meta.url).href;
const COMMON_GAME_BG_SMALL_URL = new URL(
  '../../assets/common/commonGamebg_small.png',
  import.meta.url,
).href;
const WORD_LIST_BG_BIG_URL = new URL('../../assets/common/commonGamebg_big.png', import.meta.url)
  .href;
const RESULT_ARMATURE = 'armatures/skeleton_movie_1';
const WORD_LIST_ITEMS_PER_PAGE = 6;
const RESULT_POP_WIDTH = 548;
const RESULT_POP_HEIGHT = 418;
const SINGLE_STAR_RESULT_TITLE_HOST_LEFT = 80;
const SINGLE_STAR_RESULT_TITLE_HOST_TOP = 20;
const SINGLE_STAR_RESULT_TITLE_HOST_WIDTH = 388;
const SINGLE_STAR_RESULT_TITLE_HOST_HEIGHT = 79;
const SINGLE_STAR_RESULT_TITLE_LEFT = 118;
const SINGLE_STAR_RESULT_TITLE_TOP = 23;
const SINGLE_STAR_RESULT_STAR_LEFT = 30;
const SINGLE_STAR_RESULT_STAR_TOP = 84;
const SINGLE_STAR_RESULT_STAR_WIDTH = 496.1;
const SINGLE_STAR_RESULT_STAR_HEIGHT = 227.45;
const RESULT_SKELETON_LEFT = 93;
const RESULT_SKELETON_TOP = 80;
const RESULT_SKELETON_WIDTH = 360;
const RESULT_SKELETON_HEIGHT = 224.5;
const WORD_LIST_POP_WIDTH = 700;
const WORD_LIST_POP_HEIGHT = 550;
const WORD_LIST_SCROLL_LEFT = 50;
const WORD_LIST_SCROLL_TOP = 93;
const WORD_LIST_SCROLL_WIDTH = 600;
const WORD_LIST_SCROLL_HEIGHT = 330;
const WORD_LIST_ITEM_SIZE = 140;
const WORD_LIST_ITEM_STEP_X = 200;
const WORD_LIST_ITEM_STEP_Y = 150;
const WORD_LIST_ITEM_OFFSET_X = 35;
const WORD_LIST_ITEM_BG_SLICE = [13, 12, 11, 12] as const;
const GAME_END_POP_WIDTH = 548;
const GAME_END_POP_HEIGHT = 418;
const RESET_BUTTON_SCALE_X = 99 / 76;
const RESET_BUTTON_SCALE_Y = 99 / 71;

export interface SharedWordListEntry {
  id: string;
  text: string;
  audioUrl?: string;
  resource: {
    imageUrl: string;
    skeletonUrl: string;
    animationType?: GameQuestionAnimationType;
  };
}

interface SharedOverlayContainerProps {
  overlayTestId?: string;
  containerStyle?: CSSProperties;
  cardStyle?: CSSProperties;
  children: React.ReactNode;
}

export interface SharedResultOverlayProps {
  result: 'win' | 'lose';
  successZipUrl: string;
  failedZipUrl: string;
  successSoundUrl?: string;
  failedSoundUrl?: string;
  onConfirm(): void;
  overlayTestId?: string;
  resultArmature?: string;
  resultDisplayScale?: number;
  backgroundUrl?: string;
  forceCanvas?: boolean;
  containerStyle?: CSSProperties;
  cardStyle?: CSSProperties;
}

export interface SharedWordListOverlayProps {
  entries: SharedWordListEntry[];
  pageIndex: number;
  onPageChange(pageIndex: number): void;
  onHome(): void;
  onReset(): void;
  overlayTestId?: string;
  previewArmature?: string;
  renderEntryMedia?: (entry: SharedWordListEntry) => React.ReactNode;
  containerStyle?: CSSProperties;
  cardStyle?: CSSProperties;
}

export interface SharedGameEndOverlayProps {
  onHome(): void;
  onReset(): void;
  overlayTestId?: string;
  containerStyle?: CSSProperties;
  cardStyle?: CSSProperties;
}

export interface SharedSingleStarResultAction {
  key: string;
  frameName: 'gameCommon_BtnOK' | 'gameCommon_home_big' | 'gameCommon_reset';
  onClick(): void;
  buttonStyle?: CSSProperties;
  spriteStyle?: CSSProperties;
  ariaLabel?: string;
}

export interface SharedSingleStarResultPopProps {
  starState: number;
  titleFrameName: string;
  starZipUrl: string;
  resultSoundUrl?: string;
  overlayTestId?: string;
  armature?: string;
  forceCanvas?: boolean;
  actions: SharedSingleStarResultAction[];
  classNames?: {
    root?: string;
    background?: string;
    title?: string;
    titleText?: string;
    star?: string;
    action?: string;
  };
  styles?: {
    root?: CSSProperties;
    background?: CSSProperties;
    title?: CSSProperties;
    titleText?: CSSProperties;
    star?: CSSProperties;
  };
}

function SharedOverlayContainer({
  overlayTestId,
  containerStyle,
  cardStyle,
  children,
}: SharedOverlayContainerProps) {
  return (
    <div
      data-testid={overlayTestId}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 60, 92, 0.42)',
        backdropFilter: 'blur(12px)',
        ...containerStyle,
      }}
    >
      <div
        style={{
          position: 'relative',
          animation: 'ddvkOverlayFadeIn 220ms ease-out',
          ...cardStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function WordListItemMediaPreview({
  imageUrl,
  skeletonUrl,
  animationType,
  armature,
}: {
  imageUrl: string;
  skeletonUrl: string;
  animationType?: GameQuestionAnimationType;
  armature: string;
}) {
  return (
    <GameQuestionVisual
      imageUrl={imageUrl}
      skeletonUrl={skeletonUrl}
      animationType={animationType}
      fitSize={animationType === 'dragonbones'}
      armature={armature}
      width={100}
      height={84}
      style={{ width: 100, height: 84 }}
    />
  );
}

export function SingleStarResultPop({
  starState,
  titleFrameName,
  starZipUrl,
  resultSoundUrl,
  overlayTestId,
  armature = RESULT_ARMATURE,
  forceCanvas = false,
  actions,
  classNames,
  styles,
}: SharedSingleStarResultPopProps) {
  const playerRef = useRef<DragonBonesHandle | null>(null);
  const audioManagerRef = useRef(createAudioManager());
  const currentAnimationRef = useRef('0');

  useEffect(() => {
    currentAnimationRef.current = '0';
    if (resultSoundUrl) {
      audioManagerRef.current.play({
        src: resultSoundUrl,
        loop: false,
        volume: 1,
      });
    }

    return () => {
      playerRef.current?.stop();
      audioManagerRef.current.stop();
    };
  }, [resultSoundUrl, starState]);

  useEffect(
    () => () => {
      audioManagerRef.current.destroy();
    },
    [],
  );

  return (
    <div
      data-testid={overlayTestId}
      className={classNames?.root}
      style={{
        position: 'relative',
        width: RESULT_POP_WIDTH,
        height: RESULT_POP_HEIGHT,
        ...styles?.root,
      }}
    >
      <img
        src={COMMON_GAME_BG_SMALL_URL}
        alt=""
        aria-hidden="true"
        className={classNames?.background}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: RESULT_POP_WIDTH,
          height: RESULT_POP_HEIGHT,
          ...styles?.background,
        }}
      />
      <div
        className={classNames?.title}
        style={{
          position: 'absolute',
          left: SINGLE_STAR_RESULT_TITLE_HOST_LEFT,
          top: SINGLE_STAR_RESULT_TITLE_HOST_TOP,
          width: SINGLE_STAR_RESULT_TITLE_HOST_WIDTH,
          height: SINGLE_STAR_RESULT_TITLE_HOST_HEIGHT,
          ...styles?.title,
        }}
      >
        <AtlasSprite
          atlasUrl={COMMON_GAME_ATLAS_URL}
          atlasData={commonGameAtlas}
          frameName="gameCommon_label_bg"
        />
        <AtlasSprite
          atlasUrl={COMMON_GAME_ATLAS_URL}
          atlasData={commonGameAtlas}
          frameName={titleFrameName}
          className={classNames?.titleText}
          style={{
            position: 'absolute',
            left: SINGLE_STAR_RESULT_TITLE_LEFT,
            top: SINGLE_STAR_RESULT_TITLE_TOP,
            ...styles?.titleText,
          }}
        />
      </div>
      <div
        className={classNames?.star}
        data-animation={starState}
        style={{
          position: 'absolute',
          left: SINGLE_STAR_RESULT_STAR_LEFT,
          top: SINGLE_STAR_RESULT_STAR_TOP,
          width: SINGLE_STAR_RESULT_STAR_WIDTH,
          height: SINGLE_STAR_RESULT_STAR_HEIGHT,
          ...styles?.star,
        }}
      >
        <DragonBonesPlayer
          ref={playerRef}
          zipUrl={starZipUrl}
          armature={armature}
          width={SINGLE_STAR_RESULT_STAR_WIDTH}
          height={SINGLE_STAR_RESULT_STAR_HEIGHT}
          autoPlay={false}
          initialAnimation="0"
          forceCanvas={forceCanvas}
          onReady={() => {
            currentAnimationRef.current = '0';
            playerRef.current?.play('0', false);
          }}
          onComplete={(animationName) => {
            const currentValue = Number(animationName || currentAnimationRef.current);
            if (Number.isNaN(currentValue)) {
              return;
            }

            if (currentValue < starState) {
              const nextAnimation = String(currentValue + 1);
              currentAnimationRef.current = nextAnimation;
              playerRef.current?.play(nextAnimation, false);
            }
          }}
        />
      </div>
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          onClick={action.onClick}
          className={classNames?.action}
          aria-label={action.ariaLabel}
          style={{
            position: 'absolute',
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            ...action.buttonStyle,
          }}
        >
          <AtlasSprite
            atlasUrl={COMMON_GAME_ATLAS_URL}
            atlasData={commonGameAtlas}
            frameName={action.frameName}
            style={action.spriteStyle}
          />
        </button>
      ))}
    </div>
  );
}

export function ResultOverlay({
  result,
  successZipUrl,
  failedZipUrl,
  successSoundUrl,
  failedSoundUrl,
  onConfirm,
  overlayTestId,
  resultArmature = RESULT_ARMATURE,
  resultDisplayScale = 1,
  backgroundUrl = COMMON_GAME_BG_SMALL_URL,
  forceCanvas = false,
  containerStyle,
  cardStyle,
}: SharedResultOverlayProps) {
  const isWinResult = result === 'win';
  const resultLabelFrameName = isWinResult ? 'label0001' : 'label0002';
  const resultBadgeFrame = getTextureAtlasFrame(commonGameAtlas, 'gameCommon_label_bg');
  const resultLabelFrame = getTextureAtlasFrame(commonGameAtlas, resultLabelFrameName);
  const resultLabelLeft = (resultBadgeFrame.width - resultLabelFrame.width) / 2;
  const playerRef = useRef<DragonBonesHandle | null>(null);
  const audioManagerRef = useRef(createAudioManager());

  useEffect(() => {
    const audioManager = audioManagerRef.current;
    const audioUrl = isWinResult ? successSoundUrl : failedSoundUrl;

    if (audioUrl) {
      audioManager.play({
        src: audioUrl,
        loop: false,
        volume: 1,
      });
    }

    return () => {
      playerRef.current?.stop();
      audioManager.stop();
    };
  }, [failedSoundUrl, isWinResult, successSoundUrl]);

  useEffect(
    () => () => {
      audioManagerRef.current.destroy();
    },
    [],
  );

  return (
    <SharedOverlayContainer
      overlayTestId={overlayTestId}
      containerStyle={containerStyle}
      cardStyle={{ width: RESULT_POP_WIDTH, height: RESULT_POP_HEIGHT, ...cardStyle }}
    >
      <img
        src={backgroundUrl}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: RESULT_POP_WIDTH,
          height: RESULT_POP_HEIGHT,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 78,
          top: -36,
          width: 390,
          height: 79,
        }}
      >
        <AtlasSprite
          atlasUrl={COMMON_GAME_ATLAS_URL}
          atlasData={commonGameAtlas}
          frameName="gameCommon_label_bg"
        />
        <AtlasSprite
          atlasUrl={COMMON_GAME_ATLAS_URL}
          atlasData={commonGameAtlas}
          frameName={resultLabelFrameName}
          style={{
            position: 'absolute',
            left: resultLabelLeft,
            top: isWinResult ? 15.5 : 16.5,
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: RESULT_SKELETON_LEFT,
          top: RESULT_SKELETON_TOP,
          width: RESULT_SKELETON_WIDTH,
          height: RESULT_SKELETON_HEIGHT,
        }}
      >
        <DragonBonesPlayer
          ref={playerRef}
          key={isWinResult ? successZipUrl : failedZipUrl}
          zipUrl={isWinResult ? successZipUrl : failedZipUrl}
          armature={resultArmature}
          forceCanvas={forceCanvas}
          width={RESULT_SKELETON_WIDTH}
          height={RESULT_SKELETON_HEIGHT}
          displayScale={resultDisplayScale}
          style={{ background: 'transparent' }}
        />
      </div>
      <button
        type="button"
        onClick={onConfirm}
        data-testid="result-confirm-button"
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
        aria-label="确认结果"
      >
        <AtlasSprite
          atlasUrl={COMMON_GAME_ATLAS_URL}
          atlasData={commonGameAtlas}
          frameName="gameCommon_BtnOK"
        />
      </button>
    </SharedOverlayContainer>
  );
}

export function WordListOverlay({
  entries,
  pageIndex,
  onPageChange,
  onHome,
  onReset,
  overlayTestId,
  previewArmature = RESULT_ARMATURE,
  renderEntryMedia,
  containerStyle,
  cardStyle,
}: SharedWordListOverlayProps) {
  const audioManagerRef = useRef<SharedWordListAudioController>(createAudioManager());
  const totalPages = Math.max(1, Math.ceil(entries.length / WORD_LIST_ITEMS_PER_PAGE));
  const currentPage = Math.min(pageIndex, totalPages - 1);
  const pageEntries = entries.slice(
    currentPage * WORD_LIST_ITEMS_PER_PAGE,
    currentPage * WORD_LIST_ITEMS_PER_PAGE + WORD_LIST_ITEMS_PER_PAGE,
  );
  const wordListTileFrame = getTextureAtlasFrame(commonGameAtlas, 'gameCommon_WordlistBg');

  useEffect(
    () => () => {
      audioManagerRef.current.destroy?.();
    },
    [],
  );

  const stopWordListAudio = () => {
    audioManagerRef.current.stop();
  };

  const handlePageChange = (nextPageIndex: number) => {
    stopWordListAudio();
    onPageChange(nextPageIndex);
  };

  const handleHome = () => {
    stopWordListAudio();
    onHome();
  };

  const handleReset = () => {
    stopWordListAudio();
    onReset();
  };

  return (
    <SharedOverlayContainer
      overlayTestId={overlayTestId}
      containerStyle={containerStyle}
      cardStyle={{ width: WORD_LIST_POP_WIDTH, height: WORD_LIST_POP_HEIGHT, ...cardStyle }}
    >
      <img
        src={WORD_LIST_BG_BIG_URL}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: WORD_LIST_POP_WIDTH,
          height: WORD_LIST_POP_HEIGHT,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 165,
          top: -31,
          width: 390,
          height: 79,
        }}
      >
        <AtlasSprite
          atlasUrl={COMMON_GAME_ATLAS_URL}
          atlasData={commonGameAtlas}
          frameName="gameCommon_label_bg"
        />
        <AtlasSprite
          atlasUrl={COMMON_GAME_ATLAS_URL}
          atlasData={commonGameAtlas}
          frameName="label0008"
          style={{ position: 'absolute', left: 123.5, top: 16.5 }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: WORD_LIST_SCROLL_LEFT,
          top: WORD_LIST_SCROLL_TOP,
          width: WORD_LIST_SCROLL_WIDTH,
          height: WORD_LIST_SCROLL_HEIGHT,
        }}
      >
        {pageEntries.length > 0 ? (
          pageEntries.map((entry, index) => {
            const columnIndex = index % 3;
            const rowIndex = Math.floor(index / 3);
            const itemText = entry.text || '未命名词条';
            const itemTextSize = itemText.length >= 8 ? 18 : 27;
            const tileContent = (
              <AtlasNineSlice
                atlasUrl={COMMON_GAME_ATLAS_URL}
                sourceRect={[
                  wordListTileFrame.x,
                  wordListTileFrame.y,
                  wordListTileFrame.width,
                  wordListTileFrame.height,
                ]}
                slice={[...WORD_LIST_ITEM_BG_SLICE]}
                width={WORD_LIST_ITEM_SIZE}
                height={WORD_LIST_ITEM_SIZE}
                style={{ overflow: 'hidden' }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 20,
                    top: 16,
                    width: 100,
                    height: 84,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {renderEntryMedia ? (
                    renderEntryMedia(entry)
                  ) : (
                    <WordListItemMediaPreview
                      imageUrl={entry.resource.imageUrl}
                      skeletonUrl={entry.resource.skeletonUrl}
                      animationType={entry.resource.animationType}
                      armature={previewArmature}
                    />
                  )}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    left: 8,
                    top: 106,
                    width: 125,
                    height: 30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    fontSize: itemTextSize,
                    lineHeight: 1.1,
                    fontWeight: 700,
                    color: '#000',
                    wordBreak: 'break-word',
                  }}
                >
                  {itemText}
                </div>
              </AtlasNineSlice>
            );

            return (
              <div
                key={entry.id || `${entry.text}-${index}`}
                style={{
                  position: 'absolute',
                  left: WORD_LIST_ITEM_OFFSET_X + columnIndex * WORD_LIST_ITEM_STEP_X,
                  top: rowIndex * WORD_LIST_ITEM_STEP_Y,
                  width: WORD_LIST_ITEM_SIZE,
                  height: WORD_LIST_ITEM_SIZE,
                }}
              >
                {entry.audioUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      playSharedWordListEntryAudio(audioManagerRef.current, entry.audioUrl);
                    }}
                    data-testid={`word-list-entry-${entry.id}`}
                    aria-label={`播放词条 ${itemText}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      padding: 0,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {tileContent}
                  </button>
                ) : (
                  <div
                    data-testid={`word-list-entry-${entry.id}`}
                    style={{ width: '100%', height: '100%' }}
                  >
                    {tileContent}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: WORD_LIST_SCROLL_WIDTH,
              height: WORD_LIST_SCROLL_HEIGHT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3c6676',
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            当前没有可展示的词单条目
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handleHome}
        data-testid="word-list-home-button"
        style={{
          position: 'absolute',
          left: 169.5,
          top: 450,
          width: 74,
          height: 71,
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
        }}
        aria-label="词单返回大厅"
      >
        <AtlasSprite
          atlasUrl={COMMON_GAME_ATLAS_URL}
          atlasData={commonGameAtlas}
          frameName="gameCommon_home_small"
        />
      </button>
      <button
        type="button"
        onClick={handleReset}
        data-testid="word-list-reset-button"
        style={{
          position: 'absolute',
          left: 450,
          top: 450,
          width: 74,
          height: 71,
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
        }}
        aria-label="词单再玩一次"
      >
        <AtlasSprite
          atlasUrl={COMMON_GAME_ATLAS_URL}
          atlasData={commonGameAtlas}
          frameName="gameCommon_reset"
        />
      </button>
      <button
        type="button"
        onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
        disabled={currentPage === 0}
        data-testid="word-list-prev-button"
        style={{
          position: 'absolute',
          left: 14,
          top: 250.5,
          width: 35,
          height: 49,
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
          opacity: currentPage === 0 || totalPages <= 1 ? 0 : 1,
          pointerEvents: currentPage === 0 || totalPages <= 1 ? 'none' : 'auto',
        }}
        aria-label="词单上一页"
      >
        <AtlasSprite
          atlasUrl={COMMON_GAME_ATLAS_URL}
          atlasData={commonGameAtlas}
          frameName="gameCommon_arrowPreview"
        />
      </button>
      <button
        type="button"
        onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
        disabled={currentPage >= totalPages - 1}
        data-testid="word-list-next-button"
        style={{
          position: 'absolute',
          left: 650,
          top: 250.5,
          width: 35,
          height: 49,
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
          opacity: currentPage >= totalPages - 1 || totalPages <= 1 ? 0 : 1,
          pointerEvents: currentPage >= totalPages - 1 || totalPages <= 1 ? 'none' : 'auto',
        }}
        aria-label="词单下一页"
      >
        <AtlasSprite
          atlasUrl={COMMON_GAME_ATLAS_URL}
          atlasData={commonGameAtlas}
          frameName="gameCommon_arrowNext"
        />
      </button>
    </SharedOverlayContainer>
  );
}

export function GameEndOverlay({
  onHome,
  onReset,
  overlayTestId,
  containerStyle,
  cardStyle,
}: SharedGameEndOverlayProps) {
  return (
    <SharedOverlayContainer
      overlayTestId={overlayTestId}
      containerStyle={containerStyle}
      cardStyle={{ width: GAME_END_POP_WIDTH, height: GAME_END_POP_HEIGHT, ...cardStyle }}
    >
      <img
        src={COMMON_GAME_BG_SMALL_URL}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: GAME_END_POP_WIDTH,
          height: GAME_END_POP_HEIGHT,
        }}
      />
      <AtlasSprite
        atlasUrl={COMMON_GAME_ATLAS_URL}
        atlasData={commonGameAtlas}
        frameName="gameCommon_gameover"
        style={{
          position: 'absolute',
          left: 68,
          top: 108,
        }}
      />
      <button
        type="button"
        onClick={onHome}
        data-testid="game-end-home-button"
        style={{
          position: 'absolute',
          left: 128,
          top: 230,
          width: 99,
          height: 99,
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
        }}
        aria-label="结束返回大厅"
      >
        <AtlasSprite
          atlasUrl={COMMON_GAME_ATLAS_URL}
          atlasData={commonGameAtlas}
          frameName="gameCommon_home_big"
        />
      </button>
      <button
        type="button"
        onClick={onReset}
        data-testid="game-end-reset-button"
        style={{
          position: 'absolute',
          left: 324,
          top: 230,
          width: 99,
          height: 99,
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
        }}
        aria-label="结束再玩一次"
      >
        <AtlasSprite
          atlasUrl={COMMON_GAME_ATLAS_URL}
          atlasData={commonGameAtlas}
          frameName="gameCommon_reset"
          style={{
            transform: `scale(${RESET_BUTTON_SCALE_X}, ${RESET_BUTTON_SCALE_Y})`,
            transformOrigin: 'top left',
          }}
        />
      </button>
    </SharedOverlayContainer>
  );
}
