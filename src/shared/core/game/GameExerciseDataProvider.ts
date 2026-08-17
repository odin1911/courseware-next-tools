import type {
  ExerciseVo,
  MarcWordBankVo,
  OptionVo,
  QuestionVo,
  ResourceVo,
  WordBankVo,
} from '@/shared/exercise-parser/src';

export type GameQuestionAnimationType = 'none' | 'spine' | 'dragonbones' | 'unknown';

export interface GameQuestionResourceVo extends ResourceVo {
  animationType: GameQuestionAnimationType;
}

export interface GameQuestionVo {
  id: string;
  text: string;
  resources: GameQuestionResourceVo[];
  options: OptionVo[];
  module: string;
  wordBankId?: string;
}

function createResource(partial: Partial<GameQuestionResourceVo>): GameQuestionResourceVo {
  return {
    id: partial.id ?? '',
    mime: partial.mime ?? '',
    audioPath: partial.audioPath ?? '',
    skeletonPath: partial.skeletonPath ?? '',
    imagePath: partial.imagePath ?? '',
    videoPath: partial.videoPath ?? '',
    animationType: partial.animationType ?? 'none',
    timeAxisBySentence: partial.timeAxisBySentence ?? [],
    timeAxisByWord: partial.timeAxisByWord ?? {},
  };
}

function inferAnimationType(
  resource:
    | Pick<ResourceVo, 'mime' | 'imagePath' | 'skeletonPath'>
    | ({ animationType?: string } & Partial<ResourceVo>),
): GameQuestionAnimationType {
  if ('animationType' in resource && typeof resource.animationType === 'string') {
    return resource.animationType as GameQuestionAnimationType;
  }

  if (resource.skeletonPath) {
    return 'spine';
  }

  if (resource.mime === 'swf' && /\.zip(?:$|\?)/i.test(resource.imagePath ?? '')) {
    return 'spine';
  }

  if (!resource.skeletonPath) {
    return 'none';
  }

  return 'spine';
}

export function readAnimationType(
  resource:
    | Pick<ResourceVo, 'mime' | 'imagePath' | 'skeletonPath'>
    | ({ animationType?: string } & Partial<ResourceVo>)
    | undefined,
): GameQuestionAnimationType {
  if (!resource) {
    return 'none';
  }

  if ('animationType' in resource && typeof resource.animationType === 'string') {
    return resource.animationType as GameQuestionAnimationType;
  }

  return inferAnimationType(resource);
}

function cloneResource(resource: ResourceVo): GameQuestionResourceVo {
  return createResource({
    ...resource,
    animationType: inferAnimationType(resource),
  });
}

function convertMarcWordBank(mark: MarcWordBankVo, index: number): WordBankVo {
  const resources: GameQuestionResourceVo[] = [];

  if (mark.audioPath) {
    resources.push(
      createResource({
        mime: 'mp3',
        audioPath: mark.audioPath,
        animationType: 'none',
      }),
    );
  }

  if (mark.imagePath) {
    const isSkeletonArchive = /\.zip(?:$|\?)/i.test(mark.imagePath);
    resources.push(
      createResource({
        mime: 'swf',
        // Keep the legacy field for templates that still read imagePath while
        // exposing the same archive as a DragonBones skeleton to new players.
        imagePath: mark.imagePath,
        skeletonPath: isSkeletonArchive ? mark.imagePath : '',
        animationType: 'dragonbones',
      }),
    );
  }

  return {
    id: `${index}`,
    word: mark.word,
    attributes: {},
    resources,
  };
}

function createWordListQuestionResources(
  wordBankResources: ResourceVo[],
): GameQuestionResourceVo[] {
  const resources: GameQuestionResourceVo[] = [];
  const audioResource = wordBankResources.find((resource) => Boolean(resource.audioPath));
  const animationResource = wordBankResources.find((resource) => Boolean(resource.skeletonPath));
  const imageResource = wordBankResources.find((resource) => Boolean(resource.imagePath));

  if (audioResource) {
    resources.push(
      createResource({
        mime: audioResource.mime || 'mp3',
        audioPath: audioResource.audioPath,
        animationType: 'none',
      }),
    );
  }

  if (animationResource || imageResource) {
    const visualResource = animationResource ?? imageResource;
    const visualAnimationType = readAnimationType(visualResource);
    const imagePath = imageResource?.imagePath || animationResource?.imagePath || '';
    const inferredSkeletonPath =
      animationResource?.skeletonPath ||
      ((visualAnimationType === 'spine' || visualAnimationType === 'dragonbones') &&
      /\.zip(?:$|\?)/i.test(imagePath)
        ? imagePath
        : '');

    resources.push(
      createResource({
        mime: animationResource?.mime || imageResource?.mime || 'swf',
        imagePath: inferredSkeletonPath === imagePath ? '' : imagePath,
        skeletonPath: inferredSkeletonPath,
        animationType: visualAnimationType,
      }),
    );
  }

  return resources;
}

function createQuestionVo(question: QuestionVo, module: string): GameQuestionVo {
  return {
    id: question.id,
    text: question.text,
    resources: (question.resources ?? []).map(cloneResource),
    options: (question.options ?? []).map((option) => ({
      ...option,
      resources: (option.resources ?? []).map(cloneResource),
    })),
    module,
  };
}

function createWordBankQuestionVo(
  wordBank: WordBankVo,
  index: number,
  rawId: boolean,
  module: string,
): GameQuestionVo {
  return {
    id: rawId ? wordBank.id : `${index}`,
    text: wordBank.word,
    resources: createWordListQuestionResources(wordBank.resources ?? []),
    options: [],
    module,
    wordBankId: wordBank.id,
  };
}

function resolveWordBankModule(
  wordBank: WordBankVo,
  index: number,
  autoModules: string[],
  manualModuleKey: string,
) {
  const availableAutoModules = autoModules.filter(Boolean);

  if (availableAutoModules.length > 0) {
    const stableIndex = Number.parseInt(wordBank.id, 10);
    const moduleIndex = Number.isFinite(stableIndex) ? stableIndex : index;
    return (
      availableAutoModules[moduleIndex % availableAutoModules.length] ?? availableAutoModules[0]
    );
  }

  if (manualModuleKey) {
    return manualModuleKey;
  }

  return 'KJG_WL';
}

const ADVENTURE_MATCHING_MODULES = new Set(['KJG_MC_SW', 'KJG_M_WI']);
const ADVENTURE_WORD_LIST_MODULE = 'KJG_UW';

function randomIndex(length: number, random: () => number): number {
  if (length <= 1) {
    return 0;
  }

  const value = random();
  const normalized = Number.isFinite(value) ? Math.min(Math.max(value, 0), 0.999999999) : 0;
  return Math.floor(normalized * length);
}

function shuffled<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = randomIndex(index + 1, random);
    [result[index], result[target]] = [result[target] as T, result[index] as T];
  }

  return result;
}

function createAdventureOption(
  wordBank: WordBankVo,
  position: number,
  isChecked: boolean,
): OptionVo {
  return {
    id: wordBank.id || `${position}`,
    text: wordBank.word,
    isChecked,
    additionalAttributes: {},
    position,
    resources: (wordBank.resources ?? []).map(cloneResource),
  };
}

function createAdventureAutoQuestion(
  wordBanks: WordBankVo[],
  wordBankIndex: number,
  module: string,
  questionIndex: number,
  random: () => number,
): { question: GameQuestionVo; increment: number } {
  const current = wordBanks[wordBankIndex % wordBanks.length] as WordBankVo;

  if (ADVENTURE_MATCHING_MODULES.has(module)) {
    const options = Array.from({ length: 4 }, (_, offset) => {
      const position = (wordBankIndex + offset) % wordBanks.length;
      return createAdventureOption(wordBanks[position] as WordBankVo, position, false);
    });

    return {
      question: {
        id: `${questionIndex}-${current.id}`,
        text: '',
        resources: [],
        options: shuffled(options, random),
        module,
        wordBankId: current.id,
      },
      increment: 4,
    };
  }

  const baseQuestion = createWordBankQuestionVo(current, questionIndex, true, module);

  if (module === ADVENTURE_WORD_LIST_MODULE) {
    return { question: baseQuestion, increment: 1 };
  }

  const distractorPositions = shuffled(
    wordBanks
      .map((_, index) => index)
      .filter((index) => index !== wordBankIndex % wordBanks.length),
    random,
  ).slice(0, 3);
  const options = [
    createAdventureOption(current, wordBankIndex % wordBanks.length, true),
    ...distractorPositions.map((position) =>
      createAdventureOption(wordBanks[position] as WordBankVo, position, false),
    ),
  ];

  return {
    question: { ...baseQuestion, options: shuffled(options, random) },
    increment: 1,
  };
}

export class GameExerciseDataProvider {
  private readonly autoModules: string[];
  private readonly manualModuleKey: string;
  private readonly mergedWordBanks: WordBankVo[];

  public constructor(private readonly exercise: ExerciseVo) {
    const questionSetting = exercise.additionalAttributes?.['question-setting'] ?? {};
    const autoGenerated = questionSetting['auto-generated'] ?? {};

    this.autoModules = Array.isArray(autoGenerated.modules) ? [...autoGenerated.modules] : [];
    this.manualModuleKey =
      exercise.questions.length > 0 ? (questionSetting['manual-module'] ?? '') : '';
    this.mergedWordBanks = this.getWordBanks();
  }

  public get manualModule(): string {
    return this.manualModuleKey;
  }

  public get hasAutoQuestion(): boolean {
    return this.autoModules.length > 0 && this.mergedWordBanks.length > 0;
  }

  public get hasWordBanks(): boolean {
    return this.mergedWordBanks.length > 0;
  }

  public get autoGeneratedModules(): string[] {
    return [...this.autoModules];
  }

  public getWordBanks(): WordBankVo[] {
    const marcWordBanks = (this.exercise.marcWordBanks ?? []).map(convertMarcWordBank);
    return marcWordBanks.concat(this.exercise.wordBanks ?? []);
  }

  public requestExerciseData(quantity: number, forceModule: string = ''): GameQuestionVo[] {
    const sourceQuestions = this.exercise.questions ?? [];

    if (quantity <= 0 || sourceQuestions.length === 0) {
      return [];
    }

    const module = forceModule || this.manualModuleKey;

    return Array.from({ length: quantity }, (_, index) => {
      const question = sourceQuestions[index % sourceQuestions.length] as QuestionVo;
      return createQuestionVo(question, module);
    });
  }

  public requestWordBanks(rawId: boolean = false): GameQuestionVo[] {
    return this.mergedWordBanks.map((wordBank, index) =>
      createWordBankQuestionVo(
        wordBank,
        index,
        rawId,
        resolveWordBankModule(wordBank, index, this.autoModules, this.manualModuleKey),
      ),
    );
  }

  /**
   * Reproduces the legacy GAME_GROUP_AD mixed-question contract without changing
   * the simpler manual-question and word-bank APIs used by existing pages.
   */
  public requestAdventureExerciseData(
    quantity: number,
    random: () => number = Math.random,
  ): GameQuestionVo[] {
    if (quantity <= 0) {
      return [];
    }

    const manualQuestions = this.exercise.questions ?? [];
    const availableAutoModules = this.hasAutoQuestion ? this.autoModules.filter(Boolean) : [];
    const modules = [...availableAutoModules];

    if (
      manualQuestions.length > 0 &&
      this.manualModuleKey &&
      !modules.includes(this.manualModuleKey)
    ) {
      modules.push(this.manualModuleKey);
    }

    if (modules.length === 0) {
      return [];
    }

    const modulePool: string[] = [];
    while (modulePool.length < quantity) {
      modulePool.push(...modules);
    }
    const moduleList = shuffled(modulePool, random).slice(0, quantity);
    let manualQuestionIndex = 0;
    let wordBankIndex = 0;
    let wordBanks = shuffled(this.mergedWordBanks, random);

    return moduleList.flatMap((module, questionIndex) => {
      if (module === this.manualModuleKey && manualQuestions.length > 0) {
        const source = manualQuestions[manualQuestionIndex % manualQuestions.length] as QuestionVo;
        manualQuestionIndex += 1;
        const question = createQuestionVo(source, module);
        return [{ ...question, options: shuffled(question.options, random) }];
      }

      if (wordBanks.length === 0) {
        return [];
      }

      const parsed = createAdventureAutoQuestion(
        wordBanks,
        wordBankIndex,
        module,
        questionIndex,
        random,
      );
      wordBankIndex += parsed.increment;

      if (wordBankIndex >= wordBanks.length) {
        wordBanks = shuffled(this.mergedWordBanks, random);
        wordBankIndex = 0;
      }

      return [parsed.question];
    });
  }
}
