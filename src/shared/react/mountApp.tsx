import { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { disableTouchContextMenu } from '../core/touchContextMenu';

export function mountReactApp(element: HTMLElement, app: ReactElement): void {
  disableTouchContextMenu();
  createRoot(element).render(app);
}
