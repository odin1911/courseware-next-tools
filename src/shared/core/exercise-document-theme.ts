import type { ExerciseVo, UnitVo } from '@/shared/exercise-parser/src';
import injectBgToBody from '@/shared/exercise-parser/src/utils/inject-bg';
import injectionFontToBody from '@/shared/exercise-parser/src/vo/unit/injectionFontToBody';

let documentThemeReady: Promise<void> = Promise.resolve();

function waitForBackgroundImage(url: string): Promise<void> {
  if (!url) return Promise.resolve();
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = image.onerror = () => resolve();
    image.src = url;
  });
}

export function applyExerciseDocumentTheme(
  exercise: ExerciseVo | undefined,
  unit: UnitVo | undefined,
): void {
  const backgroundUrl = exercise?.bgPath || unit?.commonBgPath || '';
  injectBgToBody(backgroundUrl);
  documentThemeReady = waitForBackgroundImage(backgroundUrl);
  if (unit) injectionFontToBody(unit.font || '');
}

export function getExerciseDocumentThemeReady(): Promise<void> {
  return documentThemeReady;
}
