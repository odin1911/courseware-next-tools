import { get } from '../../utils/futil';
import { parserResUrl } from '../../utils/resUrl';

export class DictionaryVo {
  id: number;
  word: string;
  partOfSpeech: string;
  phoneticBre: string;
  phoneticAme: string;
  definitionEn: string;
  definitionCn: string;
  audioPath: string;
  imagePath: string;
  sentences: SentenceVo[];
}

export class SentenceVo {
  conent: string;
  audioPath: string;
  imagePath: string;
}

export function parseDictionaryVo(raw: any, resUrlPrefix: string = ''): DictionaryVo {
  const ret = new DictionaryVo();
  const sentences = get(raw, ['sentences'], []);
  ret.id = get(raw, 'id', '');
  ret.word = get(raw, 'word', '');
  ret.partOfSpeech = get(raw, 'part-of-speech', '');
  ret.phoneticBre = get(raw, 'phonetic-bre', '');
  ret.phoneticAme = get(raw, 'phonetic-ame', '');
  ret.definitionCn = get(raw, 'definition-cn', '');
  ret.definitionEn = get(raw, 'definition-en', '');
  ret.audioPath = parserResUrl(resUrlPrefix, get(raw, 'audio-resource', ''));
  ret.imagePath = parserResUrl(resUrlPrefix, get(raw, 'image-resource', ''));
  ret.sentences = Array.isArray(sentences)
    ? sentences.map((s) => {
        const v = new SentenceVo();
        v.conent = get(s, 'conent', '');
        v.audioPath = parserResUrl(resUrlPrefix, get(s, 'audio-resource', ''));
        v.imagePath = parserResUrl(resUrlPrefix, get(s, 'image-resource', ''));
        return v;
      })
    : [];
  return ret;
}
