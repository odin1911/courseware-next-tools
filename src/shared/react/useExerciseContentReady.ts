import { useEffect, useRef } from 'react';
import { resolveExerciseIdentity } from '../core/api';
import { notifyExerciseContentReady } from '../core/exercise-bootstrap';
import { getExerciseDocumentThemeReady } from '../core/exercise-document-theme';
import { getCoursewareAppPropsFromQuery } from '../core/query';

function waitForImage(image: HTMLImageElement): Promise<void> {
  const decode = () => image.decode?.().catch(() => undefined) ?? Promise.resolve();
  if (image.complete) return decode();

  return new Promise((resolve) => {
    const finish = () => {
      image.removeEventListener('load', finish);
      image.removeEventListener('error', finish);
      void decode().then(resolve);
    };
    image.addEventListener('load', finish, { once: true });
    image.addEventListener('error', finish, { once: true });
  });
}

function waitForDocumentLoad(currentDocument: Document): Promise<void> {
  if (currentDocument.readyState === 'complete') return Promise.resolve();
  const currentWindow = currentDocument.defaultView;
  if (!currentWindow) return Promise.resolve();
  return new Promise((resolve) =>
    currentWindow.addEventListener('load', () => resolve(), { once: true }),
  );
}

function waitForNextPaint(currentWindow: Window): Promise<void> {
  return new Promise((resolve) => {
    currentWindow.requestAnimationFrame(() => {
      currentWindow.requestAnimationFrame(() => resolve());
    });
  });
}

async function waitForCurrentVisuals(
  currentDocument: Document,
  currentWindow: Window,
): Promise<void> {
  const visibleImages = Array.from(currentDocument.images).filter((image) => {
    const style = currentWindow.getComputedStyle(image);
    return (
      style.display !== 'none' && style.visibility !== 'hidden' && image.getClientRects().length > 0
    );
  });
  await Promise.all([
    waitForDocumentLoad(currentDocument),
    getExerciseDocumentThemeReady(),
    currentDocument.fonts?.ready ?? Promise.resolve(),
    ...visibleImages.map(waitForImage),
  ]);
  await waitForNextPaint(currentWindow);
}

/**
 * 当前模板声明首屏 UI 已挂载后，等待动态背景、文档图片、字体和一次实际绘制，
 * 再向同源 Flow 报告。
 */
export function useExerciseContentReady(ready: boolean): void {
  const sentIdentityRef = useRef('');
  const props = getCoursewareAppPropsFromQuery();
  const identityKey = JSON.stringify([
    props.channel,
    props.unitId,
    props.exerciseId,
    props.businessContentUuid,
  ]);

  useEffect(() => {
    if (!ready || sentIdentityRef.current === identityKey) return;

    let cancelled = false;
    void waitForCurrentVisuals(document, window).then(() => {
      if (cancelled) return;
      try {
        notifyExerciseContentReady(resolveExerciseIdentity(props));
      } catch {
        // Custom-data template tests and standalone development may omit business identity.
      }
      sentIdentityRef.current = identityKey;
    });

    return () => {
      cancelled = true;
    };
  }, [
    identityKey,
    props.businessContentUuid,
    props.channel,
    props.exerciseId,
    props.unitId,
    ready,
  ]);
}
