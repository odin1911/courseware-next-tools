import { get } from '../../utils/futil';

export class TemplateVo {
  id: string;
  name: string;
  displayName: string;
  module: string;
  expectedTime: number;
  isOptionShuffle: boolean;
  instructionCn: any;
  instructionEn: any;
}

export function parseTemplateVo(raw: any): TemplateVo {
  const ret = new TemplateVo();
  const attributes = get(raw, 'attributes', {});
  ret.id = get(raw, 'id', '');
  ret.name = get(attributes, 'name', '');
  ret.displayName = get(attributes, 'display-name', '');
  ret.module = get(attributes, 'module', '__UNKNOWN__');
  ret.expectedTime = get(attributes, 'expected-time', 0);
  ret.isOptionShuffle = get(attributes, 'is-option-shuffle', false);
  ret.instructionCn = get(attributes, 'instruction-cn');
  ret.instructionEn = get(attributes, 'instruction-en');
  return ret;
}
