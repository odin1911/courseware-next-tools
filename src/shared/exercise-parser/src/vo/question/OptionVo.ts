import { ResourceVo, parseResourceVo } from '../resource/ResourceVo';
import { get, find } from '../../utils/futil';

export class OptionVo {
  id: string;
  text: string;
  isChecked: boolean;
  additionalAttributes: any;
  position: number;
  resources: ResourceVo[];
}

export function parseOptionVo(raw: any, included: any, resUrlPrefix: string): OptionVo {
  const ret = new OptionVo();
  const attributes = get(raw, 'attributes', {});
  const resources = get(raw, ['relationships', 'resources', 'data'], []);

  ret.id = '' + get(raw, 'id', '');
  ret.text = get(attributes, 'text', '') || '';
  ret.isChecked = get(attributes, 'is-checked', false);
  ret.additionalAttributes = get(attributes, 'additional-attributes');
  ret.position = get(attributes, 'position', 0);
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
