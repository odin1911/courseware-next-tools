import type { UnitVo } from '../exercise-parser/src';
import { parseUnitPayload } from '../utils/parseUnit';

function getAuthHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchCoursewareUnitData(
  unitId: string,
  token: string,
  fetchDataUrl?: string,
): Promise<UnitVo | undefined> {
  const baseUrl = import.meta.env.VITE_COURSEWARE_API_BASE_URL;
  const requestUrl = fetchDataUrl || `${baseUrl}/api/v1/courseware_units/${unitId}/exercises`;
  return fetch(requestUrl, {
    method: 'GET',
    headers: getAuthHeaders(token),
  })
    .then((res) => res.json())
    .then(parseUnitPayload);
}

export async function fetchPreviewUnitData(
  businessContentUuid: string,
  token: string,
  fetchDataUrl?: string,
): Promise<UnitVo> {
  const baseUrl = import.meta.env.VITE_KELLIS_BASE_URL;
  const requestUrl =
    fetchDataUrl || `${baseUrl}/api/v2/preview/courseware_next/${businessContentUuid}`;
  return fetch(requestUrl, {
    method: 'GET',
    headers: getAuthHeaders(token),
  })
    .then((res) => res.json())
    .then(parseUnitPayload);
}
