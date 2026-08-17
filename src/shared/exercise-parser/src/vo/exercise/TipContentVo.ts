import { ResourceVo, parseResourceVo } from '../resource/ResourceVo';
import { get, find } from '../../utils/futil';

export class TipContentVo {
  id: string;
  column: string;
  columnType: string;
  isMultiple: boolean;
  position: number;
  language: string;
  value: any;
  resources: ResourceVo[];
}

export function parseTipContentVo(raw: any, included: any, resUrlPrefix: string): TipContentVo {
  const ret = new TipContentVo();
  ret.id = get(raw, ['id'], '');
  const attr = get(raw, ['attributes'], undefined);
  ret.column = get(attr, ['column'], 'default');
  ret.columnType = get(attr, ['column-type'], 'text');
  ret.isMultiple = get(attr, ['is-multiple'], false);
  ret.position = get(attr, ['position'], 0);
  ret.language = get(attr, ['language'], 'en');
  ret.value = get(attr, ['value'], '');
  const resources = get(raw, ['relationships', 'resources', 'data'], []);
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
