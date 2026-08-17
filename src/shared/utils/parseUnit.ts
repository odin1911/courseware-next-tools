import { parseUnitPayload as parseRawUnitPayload, UnitVo } from '../exercise-parser/src';

export function parseUnitPayload(payload: any): UnitVo {
  const resUrlPrefix = import.meta.env.VITE_RES_URL_PREFIX ?? '';
  return parseRawUnitPayload(resUrlPrefix, payload);
}
