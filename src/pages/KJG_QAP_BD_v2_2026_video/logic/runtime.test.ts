import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  allColumnsSelected,
  buildFoodFrames,
  FOOD_THEME_FRAMES,
  checkAnswer,
  generateCharList,
  getEatYesWait,
  getMaluEntryDuration,
  getMaluMoveDuration,
  getMaluPosX,
  getRandomMaluChar,
  getSelectedLetter,
  shouldLoopMaluAnimation,
} from './runtime';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generateCharList', () => {
  it('应生成 15 个字符，并按原模板把 5 列字母重复三轮', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.62)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0);

    const charList = generateCharList('a');

    expect(charList).toHaveLength(15);
    expect(charList.slice(0, 5)).toEqual(['b', 'c', 'd', 'a', 'e']);
    expect(charList.slice(5, 10)).toEqual(['b', 'c', 'd', 'a', 'e']);
    expect(charList.slice(10, 15)).toEqual(['b', 'c', 'd', 'a', 'e']);
  });
});

describe('runtime helpers', () => {
  it('应读取当前选中字母并校验答案', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.62)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0);

    const charList = generateCharList('w');
    expect(getSelectedLetter(charList, 5, 0)).toBe('');
    expect(getSelectedLetter(charList, 5, 1)).toBe('a');
    expect(getSelectedLetter(charList, 8, 1)).toBe('w');
    expect(checkAnswer(['w', 'i', 'n'], 'win')).toBe(true);
    expect(checkAnswer(['w', 'o', 'n'], 'win')).toBe(false);
  });

  it('应计算 malu 位置与入场时长', () => {
    expect(getMaluPosX(0)).toBe(137);
    expect(getMaluPosX(2)).toBe(512);
    expect(getMaluEntryDuration(137)).toBe(2970);
    expect(getMaluMoveDuration(137, 1184)).toBe(10470);
  });

  it('应计算吃对等待与列选中状态', () => {
    expect(getEatYesWait('ola')).toBe(2500);
    expect(getEatYesWait('pili')).toBe(3000);
    expect(
      allColumnsSelected([
        { charList: [], currentCenterIndex: 5, touchCount: 1 },
        { charList: [], currentCenterIndex: 5, touchCount: 2 },
      ]),
    ).toBe(true);
    expect(
      allColumnsSelected([
        { charList: [], currentCenterIndex: 5, touchCount: 1 },
        { charList: [], currentCenterIndex: 5, touchCount: 0 },
      ]),
    ).toBe(false);
  });

  it('应返回非重复当前角色的 malu', () => {
    const next = getRandomMaluChar('ola');
    expect(['laki', 'lele', 'nani', 'pili']).toContain(next);
  });

  it('应在 malu 入场阶段循环播放走路动作', () => {
    expect(shouldLoopMaluAnimation('enter', 'enter')).toBe(true);
    expect(shouldLoopMaluAnimation('enter', 'walk')).toBe(true);
    expect(shouldLoopMaluAnimation('idle', 'wait')).toBe(true);
    expect(shouldLoopMaluAnimation('angry', 'angry')).toBe(false);
    expect(shouldLoopMaluAnimation('happy', 'happy_eating')).toBe(false);
  });

  it('应按原模板规则生成食材行贴图，不默认注入完整三明治堆叠图', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.6);

    expect(buildFoodFrames(5, FOOD_THEME_FRAMES[4] ?? null)).toEqual([
      'KJG_QAP_BD_v2_hamburger_top',
      'KJG_QAP_BD_v2_pork_chops',
      'KJG_QAP_BD_v2_onion',
      'KJG_QAP_BD_v2_butter',
      'KJG_QAP_BD_v2_hamburger_bottom',
    ]);
  });

  it('首日未选食材时不应提前注入主题食材图', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0);

    expect(buildFoodFrames(4, null)).toEqual([
      'KJG_QAP_BD_v2_hamburger_top',
      'KJG_QAP_BD_v2_pork_chops',
      'KJG_QAP_BD_v2_butter',
      'KJG_QAP_BD_v2_hamburger_bottom',
    ]);
  });
});
