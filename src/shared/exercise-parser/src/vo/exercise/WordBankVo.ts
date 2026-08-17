import { ResourceVo, parseResourceVo } from '../resource/ResourceVo';
import { get, find } from '../../utils/futil';

export class WordBankVo {
  id: string;
  word: string;
  attributes: any;
  resources: ResourceVo[];
}

function parseInlineWordBankResource(raw: any, resUrlPrefix: string): ResourceVo {
  return parseResourceVo(
    {
      id: get(raw, ['id'], ''),
      attributes: raw,
    },
    resUrlPrefix,
  );
}

export function parseWordBankVo(raw: any, included: any, resUrlPrefix: string): WordBankVo {
  const ret = new WordBankVo();
  ret.id = '' + get(raw, ['id'], '');
  ret.attributes = get(raw, ['attributes'], {});
  ret.word = get(ret.attributes, ['word'], '');
  const relationshipResources = get(raw, ['relationships', 'resources', 'data'], []);
  const inlineResources = get(ret.attributes, ['resources'], []);

  if (Array.isArray(relationshipResources) && relationshipResources.length > 0) {
    ret.resources = relationshipResources.map((res) => {
      return parseResourceVo(
        find(included, (v) => v.id === res.id),
        resUrlPrefix,
      );
    });
    return ret;
  }

  ret.resources = Array.isArray(inlineResources)
    ? inlineResources.map((resource) => parseInlineWordBankResource(resource, resUrlPrefix))
    : [];
  return ret;
}
