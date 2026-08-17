import { get } from '../../utils/futil';
import { parserResUrl } from '../../utils/resUrl';

export class MarcWordBankVo {
  word: string;
  audioPath: string;
  imagePath: string;
}

export function parseMarcWordBankVo(raw: any, resUrlPrefix: string): MarcWordBankVo {
  const ret = new MarcWordBankVo();
  ret.word = get(raw, ['word'], '');
  ret.audioPath = parserResUrl(resUrlPrefix, get(raw, ['audio-resources'], null));
  ret.imagePath = parserResUrl(resUrlPrefix, get(raw, ['image-resources'], null));
  return ret;
}
