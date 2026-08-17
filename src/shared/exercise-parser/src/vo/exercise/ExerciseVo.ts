import { TemplateVo, parseTemplateVo } from './TemplateVo';
import { ExplainVo, parseExplainVo } from './ExplainVo';
import { QuestionVo, parseQuestionVo } from '../question/QuestionVo';
import { get, find } from '../../utils/futil';
import { TeacherTipVo, parseTeacherTipVo } from './TeacherTipVo';
import { parserResUrl } from '../../utils/resUrl';
import { WordBankVo, parseWordBankVo } from './WordBankVo';
import { MarcWordBankVo, parseMarcWordBankVo } from './MarcWordBankVo';
import { DictionaryVo, parseDictionaryVo } from './DictionaryVo';

function findIncludedByRef(included: any[], ref: any): any {
  if (!ref) {
    return null;
  }

  return find(included, (value) => value.id === ref.id && (!ref.type || value.type === ref.type));
}

export class ExerciseVo {
  id: string;
  unitId: string;
  unitUuid: string;
  titleImagePath: string;
  bgPath: string;
  name: string;
  position: number;
  additionalAttributes: any;
  instructionEn: any;
  instructionCn: any;
  displayLevel: number;
  template: TemplateVo;
  explain: ExplainVo;
  questions: QuestionVo[];
  teacherTips: TeacherTipVo[];
  wordBanks: WordBankVo[];
  marcWordBanks: MarcWordBankVo[];
  isInteractiveQuiz: boolean;
  dictionaries: DictionaryVo[];
  source: string;
  templateSkin: string;
}

export function parseExerciseVo(raw: any, resUrlPrefix: string): ExerciseVo {
  const attributes = get(raw, ['data', 'attributes'], {});
  const relationships = get(raw, ['data', 'relationships'], {});
  const templateRef = get(relationships, ['template', 'data'], null);
  const included = get(raw, ['included'], []);
  const templateRaw = findIncludedByRef(included, templateRef);
  const explainRef = get(relationships, ['explain', 'data'], null);
  const explainRaw = findIncludedByRef(included, explainRef);
  const questions = get(relationships, ['questions', 'data'], []);
  const teacherTips = get(relationships, ['teacher-tips', 'data'], []);
  const wordBanks = get(relationships, ['word-banks', 'data']);
  const marcWordBanks = get(attributes, ['marc-word-banks']);
  const dictionaries = get(attributes, ['dictionaries'], []);
  const ret = new ExerciseVo();
  ret.id = '' + get(raw, ['data', 'id'], '');
  ret.name = get(attributes, ['name'], '');
  ret.position = get(attributes, ['position'], 0);
  ret.instructionCn = get(attributes, ['instruction-cn']);
  ret.instructionEn = get(attributes, ['instruction-en']);
  ret.displayLevel = get(attributes, ['display-level']);
  ret.additionalAttributes = get(attributes, ['additional-attributes']);
  ret.source = get(ret.additionalAttributes, ['exercise-source'], '');
  ret.templateSkin = get(attributes, ['template-skin'], '');
  ret.titleImagePath = parserResUrl(
    resUrlPrefix,
    get(ret.additionalAttributes, ['title-image'], null),
  );
  ret.bgPath = parserResUrl(
    resUrlPrefix,
    get(ret.additionalAttributes, ['background-image'], null),
  );
  ret.template = parseTemplateVo(templateRaw);
  ret.explain = parseExplainVo(explainRaw, included, resUrlPrefix);
  ret.questions = Array.isArray(questions)
    ? questions.map((q) => parseQuestionVo(findIncludedByRef(included, q), included, resUrlPrefix))
    : [];
  ret.teacherTips = Array.isArray(teacherTips)
    ? teacherTips.map((t) =>
        parseTeacherTipVo(findIncludedByRef(included, t), included, resUrlPrefix),
      )
    : [];
  ret.wordBanks = Array.isArray(wordBanks)
    ? wordBanks.map((w) => parseWordBankVo(findIncludedByRef(included, w), included, resUrlPrefix))
    : [];
  ret.marcWordBanks = Array.isArray(marcWordBanks)
    ? marcWordBanks.map((m) => parseMarcWordBankVo(m, resUrlPrefix))
    : [];
  ret.dictionaries = Array.isArray(dictionaries)
    ? dictionaries.map((d) => parseDictionaryVo(d, resUrlPrefix))
    : [];
  ret.isInteractiveQuiz = get(attributes, ['is-interactive-quiz'], false);
  return ret;
}
