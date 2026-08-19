import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExerciseVo, MarcWordBankVo } from '@/shared/exercise-parser/src';
import * as normalizeExerciseModule from './normalizeExercise';

const {
  computeDayThresholds,
  computeEachDayCoustoms,
  computeHearts,
  DAY_WAIT_TIMES,
  normalizeBDExercise,
  normalizeBDWordList,
} = normalizeExerciseModule;

afterEach(() => {
  vi.unstubAllEnvs();
});

function createMarcWord(word: string, audioPath: string, imagePath: string) {
  const item = new MarcWordBankVo();
  item.word = word;
  item.audioPath = audioPath;
  item.imagePath = imagePath;
  return item;
}

describe('normalizeBDExercise', () => {
  it('应按单词长度升序并使用配置的资源前缀映射资源', () => {
    vi.stubEnv('VITE_RES_URL_PREFIX', 'https://assets.example.test/pieces/');

    const exercise = new ExerciseVo();
    exercise.questions = [];
    exercise.wordBanks = [];
    exercise.marcWordBanks = [
      createMarcWord('trophy', 'audio/trophy.mp3', 'image/trophy.zip'),
      createMarcWord('win', 'audio/win.mp3', 'image/win.zip'),
      createMarcWord('sheet', 'audio/sheet.mp3', 'image/sheet.zip'),
    ];
    exercise.additionalAttributes = {
      'question-setting': {
        'auto-generated': {
          modules: ['KJG_A', 'KJG_I'],
        },
      },
    };

    const normalized = normalizeBDWordList(exercise);

    expect(normalized.map((item) => item.word)).toEqual(['win', 'sheet', 'trophy']);
    expect(normalized[0]).toMatchObject({
      audioUrl: 'https://assets.example.test/pieces/audio/win.mp3',
      imageUrl: '',
      skeletonUrl: 'https://assets.example.test/pieces/image/win.zip',
      animationType: 'dragonbones',
      letters: ['w', 'i', 'n'],
      module: 'KJG_I',
    });
    expect(normalized.map((item) => item.module)).toEqual(['KJG_I', 'KJG_A', 'KJG_A']);
  });

  it('词条少于 10 个时应重复补足到 10 题', () => {
    const exercise = new ExerciseVo();
    exercise.questions = [];
    exercise.wordBanks = [];
    exercise.marcWordBanks = [
      createMarcWord('trophy', 'audio/trophy.mp3', 'image/trophy.zip'),
      createMarcWord('win', 'audio/win.mp3', 'image/win.zip'),
      createMarcWord('sheet', 'audio/sheet.mp3', 'image/sheet.zip'),
    ];
    exercise.additionalAttributes = {};

    const normalized = normalizeBDExercise(exercise);

    expect(normalized).toHaveLength(10);
    expect(normalized.map((item) => item.word)).toEqual([
      'win',
      'win',
      'win',
      'win',
      'sheet',
      'sheet',
      'sheet',
      'trophy',
      'trophy',
      'trophy',
    ]);
  });

  it('词单应保留原始词条，不重复补足到 10 个', () => {
    const exercise = new ExerciseVo();
    exercise.questions = [];
    exercise.wordBanks = [];
    exercise.marcWordBanks = [
      createMarcWord('trophy', 'audio/trophy.mp3', 'image/trophy.zip'),
      createMarcWord('win', 'audio/win.mp3', 'image/win.zip'),
      createMarcWord('sheet', 'audio/sheet.mp3', 'image/sheet.zip'),
    ];
    exercise.additionalAttributes = {};

    expect(typeof normalizeBDWordList).toBe('function');
    const wordList = normalizeBDWordList(exercise);

    expect(wordList).toHaveLength(3);
    expect(wordList.map((item) => item.word)).toEqual(['win', 'sheet', 'trophy']);
  });

  it('词条多于 10 个时应按词长升序只保留前 10 题', () => {
    const exercise = new ExerciseVo();
    exercise.questions = [];
    exercise.wordBanks = [];
    exercise.marcWordBanks = [
      createMarcWord('aaaaaaaaaaaa', 'audio/12.mp3', 'image/12.zip'),
      createMarcWord('a', 'audio/1.mp3', 'image/1.zip'),
      createMarcWord('aaaaaaaaa', 'audio/9.mp3', 'image/9.zip'),
      createMarcWord('aaaa', 'audio/4.mp3', 'image/4.zip'),
      createMarcWord('aaaaaaaaaaa', 'audio/11.mp3', 'image/11.zip'),
      createMarcWord('aa', 'audio/2.mp3', 'image/2.zip'),
      createMarcWord('aaaaaaa', 'audio/7.mp3', 'image/7.zip'),
      createMarcWord('aaaaaa', 'audio/6.mp3', 'image/6.zip'),
      createMarcWord('aaaaaaaa', 'audio/8.mp3', 'image/8.zip'),
      createMarcWord('aaaaa', 'audio/5.mp3', 'image/5.zip'),
      createMarcWord('aaa', 'audio/3.mp3', 'image/3.zip'),
      createMarcWord('aaaaaaaaaa', 'audio/10.mp3', 'image/10.zip'),
    ];
    exercise.additionalAttributes = {};

    const normalized = normalizeBDExercise(exercise);

    expect(normalized).toHaveLength(10);
    expect(normalized.map((item) => item.word)).toEqual([
      'a',
      'aa',
      'aaa',
      'aaaa',
      'aaaaa',
      'aaaaaa',
      'aaaaaaa',
      'aaaaaaaa',
      'aaaaaaaaa',
      'aaaaaaaaaa',
    ]);
  });

  it('应保留 image-only 词条的图片资源而不是误判缺资源', () => {
    const exercise = new ExerciseVo();
    exercise.questions = [];
    exercise.marcWordBanks = [];
    exercise.wordBanks = [
      {
        id: 'wb-image-only',
        word: 'Apple',
        attributes: {},
        resources: [
          {
            id: 'res-audio',
            mime: 'mp3',
            audioPath: 'https://example.com/apple.mp3',
            skeletonPath: '',
            imagePath: '',
            videoPath: '',
            timeAxisBySentence: [],
            timeAxisByWord: {},
          },
          {
            id: 'res-image',
            mime: 'swf',
            audioPath: '',
            skeletonPath: '',
            imagePath: 'https://example.com/apple.png',
            videoPath: '',
            timeAxisBySentence: [],
            timeAxisByWord: {},
          },
        ],
      },
    ] as never;
    exercise.additionalAttributes = {};

    const normalized = normalizeBDWordList(exercise);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toMatchObject({
      word: 'Apple',
      audioUrl: 'https://example.com/apple.mp3',
      imageUrl: 'https://example.com/apple.png',
      skeletonUrl: '',
      animationType: 'none',
      letters: ['A', 'p', 'p', 'l', 'e'],
      module: 'KJG_WL',
    });
  });

  it('应优先消费 resources[1] 的视觉资源以和 SKR 保持一致', () => {
    const exercise = new ExerciseVo();
    exercise.questions = [];
    exercise.marcWordBanks = [];
    exercise.wordBanks = [
      {
        id: 'wb-prefer-second-resource',
        word: 'Apple',
        attributes: {},
        resources: [
          {
            id: 'res-audio',
            mime: 'mp3',
            audioPath: 'https://example.com/apple.mp3',
            skeletonPath: '',
            imagePath: '',
            videoPath: '',
            timeAxisBySentence: [],
            timeAxisByWord: {},
          },
          {
            id: 'res-image',
            mime: 'swf',
            audioPath: '',
            skeletonPath: '',
            imagePath: 'https://example.com/apple.png',
            videoPath: '',
            timeAxisBySentence: [],
            timeAxisByWord: {},
          },
          {
            id: 'res-skeleton',
            mime: 'swf',
            audioPath: '',
            skeletonPath: 'https://example.com/apple.zip',
            imagePath: '',
            videoPath: '',
            timeAxisBySentence: [],
            timeAxisByWord: {},
          },
        ],
      },
    ] as never;
    exercise.additionalAttributes = {};

    const normalized = normalizeBDWordList(exercise);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toMatchObject({
      word: 'Apple',
      imageUrl: 'https://example.com/apple.png',
      skeletonUrl: 'https://example.com/apple.zip',
      animationType: 'spine',
    });
  });

  it('缺少资源时应抛错', () => {
    const exercise = new ExerciseVo();
    exercise.questions = [];
    exercise.wordBanks = [];
    exercise.marcWordBanks = [createMarcWord('win', '', 'img.zip')];
    exercise.additionalAttributes = {};

    expect(() => normalizeBDExercise(exercise)).toThrow('缺少音频资源');
  });
});

describe('day helpers', () => {
  it('应按词数计算 hearts', () => {
    expect(computeHearts(3)).toBe(1);
    expect(computeHearts(4)).toBe(2);
    expect(computeHearts(7)).toBe(3);
  });

  it('应返回每日分配', () => {
    expect(computeEachDayCoustoms(3)).toEqual([1, 1, 1]);
    expect(computeEachDayCoustoms(6)).toEqual([2, 2, 2]);
    expect(computeEachDayCoustoms(10)).toEqual([3, 3, 4]);
  });

  it('应生成日切阈值', () => {
    expect(computeDayThresholds([3, 3, 4])).toEqual([3, 6]);
    expect(computeDayThresholds([1, 1, 1])).toEqual([1, 2]);
    expect(DAY_WAIT_TIMES).toEqual([90, 60, 45]);
  });
});
