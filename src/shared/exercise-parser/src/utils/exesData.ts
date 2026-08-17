import { mergeUnitVos, UnitVo, parseUnitVo } from '../vo/unit/UnitVo';
import { setResScale, useResShortName } from './resUrl';

export function parseUnitData(
  resUrlPrefix: string,
  rawJson: any,
  resShortName: boolean = true,
  resScale: number = 1,
): UnitVo {
  useResShortName(resShortName);
  setResScale(resScale);
  return parseUnitVo(rawJson, resUrlPrefix);
}

export function parseUnitPayload(
  resUrlPrefix: string,
  payload: any,
  resShortName: boolean = true,
  resScale: number = 1,
): UnitVo {
  const units = payload?.result || payload;
  if (Array.isArray(units)) {
    return mergeUnitVos(
      units.map((unit) => parseUnitData(resUrlPrefix, unit, resShortName, resScale)),
    );
  }
  return parseUnitData(resUrlPrefix, units, resShortName, resScale);
}
