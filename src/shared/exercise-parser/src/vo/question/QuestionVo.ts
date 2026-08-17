import { OptionVo, parseOptionVo } from './OptionVo';
import { BubbleVo, parseBubbleVo } from './BubbleVo';
import { HotZoneVo, parseHotZoneVo } from './HotZoneVo';
import { get, find } from '../../utils/futil';
import { parseResourceVo, ResourceVo } from '../resource/ResourceVo';

export class QuestionVo {
  id: string;
  text: string;
  hint: any;
  position: number;
  score: number;
  additionalAttributes: any;
  videoAutoPlay?: boolean;
  controlStyle?: 'NONE' | 'STYLE1' | 'STYLE2';
  options: OptionVo[];
  bubbles?: BubbleVo[];
  resources: ResourceVo[];
  hotZones?: HotZoneVo[];
  heartType?: number; // for special module
}

function parseBooleanFlag(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  return fallback;
}

export function parseQuestionVo(raw: any, included: any, resUrlPrefix: string): QuestionVo {
  const ret = new QuestionVo();
  const attributes = get(raw, 'attributes', {});
  const options = get(raw, ['relationships', 'options', 'data'], []);
  const bubbles = get(raw, ['relationships', 'bubbles', 'data'], []);
  const resources = get(raw, ['relationships', 'resources', 'data'], []);
  const hotZones = get(raw, ['relationships', 'hot-zones', 'data'], []);
  ret.id = '' + get(raw, 'id', '');
  ret.text = get(attributes, 'text', '');
  ret.hint = get(attributes, 'hint', '');
  ret.position = get(attributes, 'position', '');
  ret.score = get(attributes, 'score', '');
  ret.additionalAttributes = get(attributes, 'additional-attributes');
  ret.videoAutoPlay = parseBooleanFlag(
    get(ret.additionalAttributes, ['video-auto-play'], true),
    true,
  );
  ret.controlStyle = get(ret.additionalAttributes, ['control-style'], 'NONE');
  ret.options = Array.isArray(options)
    ? options.map((opt) => {
        return parseOptionVo(
          find(included, (v) => v.id === opt.id),
          included,
          resUrlPrefix,
        );
      })
    : [];
  ret.bubbles = Array.isArray(bubbles)
    ? bubbles.map((bubble) => {
        return parseBubbleVo(find(included, (v) => v.id === bubble.id));
      })
    : [];
  ret.resources = Array.isArray(resources)
    ? resources.map((res) => {
        return parseResourceVo(
          find(included, (v) => v.id === res.id),
          resUrlPrefix,
        );
      })
    : [];
  ret.hotZones = Array.isArray(hotZones)
    ? hotZones.map((hotZone) => {
        return parseHotZoneVo(
          find(included, (v) => v.id === hotZone.id && v.type === 'hot-zones'),
          included,
          resUrlPrefix,
        );
      })
    : [];
  return ret;
}
