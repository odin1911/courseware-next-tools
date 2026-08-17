import { ResourceVo, parseResourceVo } from '../resource/ResourceVo';
import { get, find } from '../../utils/futil';

export class ExplainVo {
  id: string;
  text: string;
  additionalAttribute: any;
  resources: ResourceVo[];
}

export function parseExplainVo(raw: any, included: any, resUrlPrefix: string): ExplainVo {
  const ret = new ExplainVo();
  const resources = get(raw, ['relationships', 'resources', 'data'], []);
  ret.id = get(raw, 'id', '');
  ret.text = get(raw, ['attributes', 'text'], '');
  ret.additionalAttribute = get(raw, ['attributes', 'additional-attributes']);
  ret.resources = Array.isArray(resources)
    ? resources.map((res) => {
        return parseResourceVo(
          find(included, (v) => v.id === res.id),
          resUrlPrefix,
        );
      })
    : [];
  return ret;
}
