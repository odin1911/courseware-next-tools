export const TOUCH_CONTEXT_MENU_DISABLED_CLASS = 'is-touch-context-menu-disabled';

const TOUCH_CONTEXT_MENU_STYLE_ID = 'shared-touch-context-menu-guard';

interface ContextMenuGuardState {
  cleanup: () => void;
}

const installedGuards = new WeakMap<Document, ContextMenuGuardState>();

function isTouchDevice(win: Window): boolean {
  const navigatorWithTouchPoints = win.navigator as Navigator & {
    msMaxTouchPoints?: number;
  };

  if ((navigatorWithTouchPoints.maxTouchPoints ?? 0) > 0) return true;
  if ((navigatorWithTouchPoints.msMaxTouchPoints ?? 0) > 0) return true;

  return win.matchMedia?.('(pointer: coarse)').matches ?? false;
}

function ensureTouchContextMenuStyle(doc: Document) {
  if (doc.getElementById(TOUCH_CONTEXT_MENU_STYLE_ID)) return;

  const style = doc.createElement('style');
  style.id = TOUCH_CONTEXT_MENU_STYLE_ID;
  style.textContent = `
html.${TOUCH_CONTEXT_MENU_DISABLED_CLASS},
html.${TOUCH_CONTEXT_MENU_DISABLED_CLASS} body,
html.${TOUCH_CONTEXT_MENU_DISABLED_CLASS} #app {
  -webkit-touch-callout: none;
}
`;
  doc.head.append(style);
}

export function disableTouchContextMenu(
  doc: Document = document,
  win: Window = window,
): () => void {
  if (!isTouchDevice(win)) return () => {};

  const installedGuard = installedGuards.get(doc);
  if (installedGuard) return installedGuard.cleanup;

  function preventContextMenu(event: Event) {
    event.preventDefault();
  }

  ensureTouchContextMenuStyle(doc);
  doc.documentElement.classList.add(TOUCH_CONTEXT_MENU_DISABLED_CLASS);
  doc.addEventListener('contextmenu', preventContextMenu, { capture: true });

  function cleanup() {
    doc.removeEventListener('contextmenu', preventContextMenu, { capture: true });
    doc.documentElement.classList.remove(TOUCH_CONTEXT_MENU_DISABLED_CLASS);
    installedGuards.delete(doc);
  }

  installedGuards.set(doc, { cleanup });
  return cleanup;
}
