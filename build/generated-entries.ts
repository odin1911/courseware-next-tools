import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

export const pageEntries = {
  'ddvk-answer-area-lab': path.resolve(root, 'src/pages/ddvk-answer-area-lab/index.html'),
  'dragonbones-tool': path.resolve(root, 'src/pages/dragonbones-tool/index.html'),
  'spine-tool': path.resolve(root, 'src/pages/spine-tool/index.html')
} as const;

export type PageEntryName = keyof typeof pageEntries;
