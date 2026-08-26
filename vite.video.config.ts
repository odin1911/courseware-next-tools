import path from 'node:path';
import { mergeConfig } from 'vite';
import baseConfig from './vite.config';

const root = path.resolve(__dirname, 'src/pages/KJG_QAP_BD_v2_2026_video');

export default mergeConfig(baseConfig, {
  root,
  build: {
    outDir: path.resolve(__dirname, 'dist-video'),
    rollupOptions: { input: path.join(root, 'index.html') },
  },
});
