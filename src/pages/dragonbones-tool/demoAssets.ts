export type DemoAsset = {
  id: string;
  title: string;
  note: string;
  zipUrl: string;
  sourceLabel?: string;
  width: number;
  height: number;
  armatures?: string[];
  transparentMode?: 'premultiplied' | 'notMultiplied';
  embeddedTextDefaults?: {
    enabled?: boolean;
    text?: string;
    target?: string;
    x?: number;
    y?: number;
    fontSize?: number;
    fill?: string;
  };
};

export const count2FarmAsset: DemoAsset = {
  id: 'count2-farm',
  title: 'Count2 Farm',
  note: 'COUNT2 农场骨骼，zip 内包含 bg.png',
  zipUrl: new URL('./assets/skeleton/HJ_K3_KJ_count2_farm.zip', import.meta.url).href,
  sourceLabel: 'assets/skeleton/HJ_K3_KJ_count2_farm.zip',
  width: 420,
  height: 320,
  armatures: ['armatures/main'],
};

export const dragonbonesToolAssets: DemoAsset[] = [
  {
    id: 'kj-qa-cc-checkmark',
    title: 'KJ_QA_CC CheckMark',
    note: 'Click and Choose v2 选项正确反馈小勾，按原模板宿主 74x54 验证安全区',
    zipUrl: new URL('./assets/fixtures/CheckMark.zip', import.meta.url).href,
    sourceLabel: 'assets/fixtures/CheckMark.zip',
    width: 74,
    height: 54,
    armatures: ['armatures/skeleton_movie_1'],
    transparentMode: 'premultiplied',
  },
  {
    id: 'kj-qa-pp-bubble',
    title: 'KJ_QA_PP_v2 Bubble',
    note: 'Phonics Pop v2 水泡待机动画，用于验证 DragonBones 同 canvas 嵌字',
    zipUrl: new URL('./assets/fixtures/PP_bubble_0.zip', import.meta.url).href,
    sourceLabel: 'assets/fixtures/PP_bubble_0.zip',
    width: 180,
    height: 112,
    armatures: ['armatures/skeleton_movie_1'],
    transparentMode: 'notMultiplied',
    embeddedTextDefaults: {
      enabled: true,
      text: 'seeking',
      target: 'slot:text_area',
      x: 0,
      y: 0,
      fontSize: 30,
      fill: '#000000',
    },
  },
  {
    id: 'count2-reward-nani-and-pili',
    title: 'Count2 Reward Nani&Pili',
    note: 'Count2 reward 阶段奖励动画 naniAndPili',
    zipUrl: new URL('./assets/rewards/naniAndPili.zip', import.meta.url).href,
    sourceLabel: 'assets/rewards/naniAndPili.zip',
    width: 420,
    height: 320,
    armatures: ['armatures/skeleton_movie_1'],
    transparentMode: 'premultiplied',
  },
  {
    id: 'successed',
    title: 'Successed',
    note: '成功反馈动画',
    zipUrl: new URL(
      './assets/fixtures/OLK_DDV_successed.zip',
      import.meta.url,
    ).href,
    width: 360,
    height: 280,
  },
  {
    id: 'failed',
    title: 'Failed',
    note: '失败反馈动画',
    zipUrl: new URL('./assets/fixtures/OLK_DDV_failed.zip', import.meta.url)
      .href,
    width: 360,
    height: 280,
  },
];
