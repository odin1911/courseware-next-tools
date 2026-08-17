import { get, find } from '../../utils/futil';
import { parseResourceVo, ResourceVo } from '../resource/ResourceVo';

export interface HotZoneRectPositionVo {
  x: number;
  y: number;
  width: number;
  height: number;
  rotate: number;
  zIndex: number;
}

export class HotZoneElementVo {
  id: string;
  key: string;
  propertyName: string;
  type: string;
  text: string;
  sourceHotZoneElementId: string;
  areaPosition: HotZoneRectPositionVo | null;
  circleAreaPosition: HotZoneRectPositionVo | HotZoneRectPositionVo[] | null;
  resources: ResourceVo[];
}

export class HotZoneVo {
  id: string;
  relationType: string;
  elements: HotZoneElementVo[];
}

function toNumber(value: unknown, fallback: number): number {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
}

function parseHotZoneRectPositionVo(raw: any): HotZoneRectPositionVo | null {
  if (!raw) {
    return null;
  }

  return {
    x: toNumber(get(raw, 'x', 0), 0),
    y: toNumber(get(raw, 'y', 0), 0),
    width: toNumber(get(raw, 'width', 0), 0),
    height: toNumber(get(raw, 'height', 0), 0),
    rotate: toNumber(get(raw, 'rotate', 0), 0),
    zIndex: toNumber(get(raw, 'zIndex', 0), 0),
  };
}

function parseCircleAreaPosition(raw: any): HotZoneRectPositionVo | HotZoneRectPositionVo[] | null {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => parseHotZoneRectPositionVo(item))
      .filter((item): item is HotZoneRectPositionVo => !!item);
  }

  return parseHotZoneRectPositionVo(raw);
}

function findIncludedByIdAndType(included: any[], id: unknown, type: string): any {
  return find(
    included,
    (item) => '' + get(item, 'id', '') === '' + id && get(item, 'type', '') === type,
  );
}

export function parseHotZoneElementVo(
  raw: any,
  included: any[],
  resUrlPrefix: string,
): HotZoneElementVo {
  const ret = new HotZoneElementVo();
  const attributes = get(raw, 'attributes', {});
  const resources = get(raw, ['relationships', 'resources', 'data'], []);

  ret.id = '' + get(raw, 'id', '');
  ret.key = '' + get(attributes, 'key', '');
  ret.propertyName = get(attributes, 'property-name', '') || '';
  ret.type = get(attributes, 'type', '') || '';
  ret.text = get(attributes, 'text', '') || '';
  ret.sourceHotZoneElementId = '' + get(attributes, 'source-hot-zone-element-id', '');
  ret.areaPosition = parseHotZoneRectPositionVo(get(attributes, 'area-position', null));
  ret.circleAreaPosition = parseCircleAreaPosition(get(attributes, 'circle-area-position', null));
  ret.resources = Array.isArray(resources)
    ? resources.map((resourceRef) =>
        parseResourceVo(
          findIncludedByIdAndType(included, get(resourceRef, 'id', ''), 'resources'),
          resUrlPrefix,
        ),
      )
    : [];

  return ret;
}

export function parseHotZoneVo(raw: any, included: any[], resUrlPrefix: string): HotZoneVo {
  const ret = new HotZoneVo();
  const attributes = get(raw, 'attributes', {});
  const elements = get(raw, ['relationships', 'hot-zone-elements', 'data'], []);

  ret.id = '' + get(raw, 'id', '');
  ret.relationType = get(attributes, 'relation-type', '') || '';
  ret.elements = Array.isArray(elements)
    ? elements.map((elementRef) =>
        parseHotZoneElementVo(
          findIncludedByIdAndType(included, get(elementRef, 'id', ''), 'hot-zone-elements'),
          included,
          resUrlPrefix,
        ),
      )
    : [];

  return ret;
}
