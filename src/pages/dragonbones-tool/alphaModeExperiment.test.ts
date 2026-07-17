import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const demoAssetsSource = readFileSync(new URL('./demoAssets.ts', import.meta.url), 'utf8');
const demoCardSource = readFileSync(new URL('./DemoCard.tsx', import.meta.url), 'utf8');

describe('dragonbones-tool alpha mode experiment', () => {
  it('只让 Count2 Reward Nani&Pili 调试卡片显式走 premultiplied transparentMode', () => {
    expect(demoAssetsSource).toContain("id: 'count2-reward-nani-and-pili'");
    expect(demoAssetsSource).toContain("transparentMode: 'premultiplied'");
    expect(demoCardSource).toContain('transparentMode={asset.transparentMode}');
  });
});
