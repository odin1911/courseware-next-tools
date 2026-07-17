import { describe, expect, it } from 'vitest';
import { pickInitialArmature } from './armatureSelection';

describe('pickInitialArmature', () => {
  it('优先使用显式配置且该 armature 存在', () => {
    expect(
      pickInitialArmature({
        preferredArmatures: ['armatures/custom', 'armatures/main'],
        discoveredArmatures: ['armatures/main', 'armatures/custom'],
      }),
    ).toBe('armatures/custom');
  });

  it('默认骨骼不存在时回退到 armatures/main', () => {
    expect(
      pickInitialArmature({
        preferredArmatures: undefined,
        discoveredArmatures: ['armatures/main', 'armatures/mc-1-2'],
      }),
    ).toBe('armatures/main');
  });

  it('没有默认骨骼和 main 时回退到第一个发现的 armature', () => {
    expect(
      pickInitialArmature({
        preferredArmatures: undefined,
        discoveredArmatures: ['armatures/alpha', 'armatures/beta'],
      }),
    ).toBe('armatures/alpha');
  });
});
