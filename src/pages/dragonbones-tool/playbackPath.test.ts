import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const demoCardSource = readFileSync(new URL('./DemoCard.tsx', import.meta.url), 'utf8');

describe('dragonbones-tool playback path', () => {
  it('DemoCard 不再接入共享播放器 preview API', () => {
    expect(demoCardSource).not.toMatch(/\.preview\s*\(/);
    expect(demoCardSource).not.toContain("'./previewSemantics'");
  });
});
