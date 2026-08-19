import type { ExerciseVo } from '@/shared/exercise-parser/src';
import {
  GameExerciseDataProvider,
  type GameQuestionAnimationType,
} from '@/shared/core/game/GameExerciseDataProvider';
import type { BDWordItem } from '../sceneTypes';

const DEFAULT_RES_PREFIX = 'https://course-assets.alo7.com/generate/pieces/';

export const RES_PREFIX = () => import.meta.env.VITE_RES_URL_PREFIX || DEFAULT_RES_PREFIX;
export const DAY_WAIT_TIMES = [90, 60, 45] as const;
const BD_TOTAL_QUESTION_COUNT = 10;

function normalizeResourceUrl(resourceUrl: string) {
  if (!resourceUrl) {
    return '';
  }

  if (/^https?:\/\//.test(resourceUrl)) {
    return resourceUrl;
  }

  return `${RES_PREFIX()}${resourceUrl.replace(/^\/+/, '')}`;
}

function selectionSortByWordLength(items: BDWordItem[]) {
  const sorted = items.slice();

  for (let i = 0; i < sorted.length - 1; i += 1) {
    let minIndex = i;

    for (let j = i + 1; j < sorted.length; j += 1) {
      if (sorted[j].word.length < sorted[minIndex].word.length) {
        minIndex = j;
      }
    }

    if (minIndex !== i) {
      const current = sorted[i] as BDWordItem;
      sorted[i] = sorted[minIndex] as BDWordItem;
      sorted[minIndex] = current;
    }
  }

  return sorted;
}

function cloneWordItem(item: BDWordItem): BDWordItem {
  return {
    ...item,
    letters: [...item.letters],
  };
}

function normalizeQuestionCount(items: BDWordItem[], targetCount = BD_TOTAL_QUESTION_COUNT) {
  if (items.length === 0 || targetCount <= 0) {
    return [];
  }

  if (items.length >= targetCount) {
    return items.slice(0, targetCount).map(cloneWordItem);
  }

  const expanded = Array.from({ length: targetCount }, (_, index) =>
    cloneWordItem(items[index % items.length] as BDWordItem),
  );

  return selectionSortByWordLength(expanded);
}

function findAudioResource(resources: Array<{ mime: string; audioPath: string }>) {
  return (
    resources.find((resource) => resource.mime === 'mp3' && Boolean(resource.audioPath)) ??
    resources.find((resource) => Boolean(resource.audioPath)) ??
    null
  );
}

function findVisualResource(
  resources: Array<{
    skeletonPath: string;
    imagePath: string;
    animationType?: GameQuestionAnimationType;
  }>,
) {
  return (
    resources.find(
      (resource, index) =>
        index === 1 && (Boolean(resource.skeletonPath) || Boolean(resource.imagePath)),
    ) ??
    resources.find((resource) => Boolean(resource.skeletonPath) || Boolean(resource.imagePath)) ??
    null
  );
}

function buildBDWordItems(exerciseVo: ExerciseVo): BDWordItem[] {
  const provider = new GameExerciseDataProvider(exerciseVo);
  const questions = provider.requestWordBanks(true);

  return questions.map((question, index) => {
    const word = question.text.trim();
    const audioResource = findAudioResource(question.resources);
    const visualResource = findVisualResource(question.resources);
    const audioUrl = normalizeResourceUrl(audioResource?.audioPath || '');
    const skeletonUrl = normalizeResourceUrl(visualResource?.skeletonPath || '');
    const imageUrl = normalizeResourceUrl(visualResource?.imagePath || '');
    const animationType: GameQuestionAnimationType = visualResource?.animationType ?? 'none';

    if (!word) {
      throw new Error(`词条 ${index + 1} 缺少 word 字段。`);
    }

    if (!audioUrl) {
      throw new Error(`词条 ${word} 缺少音频资源。`);
    }

    if (!skeletonUrl && !imageUrl) {
      throw new Error(`词条 ${word} 缺少图片或骨骼资源。`);
    }

    return {
      word,
      audioUrl,
      imageUrl,
      skeletonUrl,
      animationType,
      letters: word.split(''),
      module: question.module,
    } satisfies BDWordItem;
  });
}

export function normalizeBDWordList(exerciseVo: ExerciseVo): BDWordItem[] {
  return selectionSortByWordLength(buildBDWordItems(exerciseVo));
}

export function normalizeBDExercise(exerciseVo: ExerciseVo): BDWordItem[] {
  return normalizeQuestionCount(normalizeBDWordList(exerciseVo));
}

export function computeHearts(count: number): number {
  if (count <= 0) {
    return 0;
  }

  if (count <= 3) {
    return 1;
  }

  if (count <= 6) {
    return 2;
  }

  return 3;
}

export function computeEachDayCoustoms(count: number): number[] {
  switch (count) {
    case 3:
      return [1, 1, 1];
    case 4:
      return [2, 1, 1];
    case 5:
      return [2, 2, 1];
    case 6:
      return [2, 2, 2];
    case 7:
      return [3, 2, 2];
    case 8:
      return [3, 3, 2];
    case 9:
      return [3, 3, 3];
    default:
      return [3, 3, 4];
  }
}

export function computeDayThresholds(daily: number[]): number[] {
  const thresholds: number[] = [];
  let sum = 0;

  for (let index = 0; index < daily.length - 1; index += 1) {
    sum += daily[index] ?? 0;
    thresholds.push(sum);
  }

  return thresholds;
}
