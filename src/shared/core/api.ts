import { AppProps, ExerciseResultItem } from './types/exercise';
import type { ExerciseVo, UnitVo } from '@/shared/exercise-parser/src';
import { parseUnitPayload } from '../utils/parseUnit';
import { applyExerciseDocumentTheme } from './exercise-document-theme';
import { requestExerciseBootstrapData, type ExerciseBootstrapIdentity } from './exercise-bootstrap';
import { fetchCoursewareUnitData, fetchPreviewUnitData } from './exercise-data-source';

/** 模块加载时自动从 URL 参数读取 token，开发模式下回退到 VITE_DEV_TOKEN */
function resolveToken(): string {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('token') || params.get('accessToken');
  if (fromUrl) return fromUrl;
  if (import.meta.env.DEV) return import.meta.env.VITE_DEV_TOKEN ?? '';
  return '';
}

const _token = resolveToken();

export function resolveExerciseIdentity(params: AppProps): ExerciseBootstrapIdentity {
  switch (params.channel) {
    case 'courseware-next':
      if (!params.unitId || !params.exerciseId) {
        throw new Error('courseware-next requires unitId and exerciseId');
      }
      return {
        channel: 'courseware-next',
        unitId: params.unitId,
        exerciseId: params.exerciseId,
      };
    case 'ng-preview':
      if (!params.businessContentUuid) {
        throw new Error('ng-preview requires businessContentUuid');
      }
      return {
        channel: 'ng-preview',
        businessContentUuid: params.businessContentUuid,
      };
    default:
      throw new Error(`Unsupported channel: ${params.channel}`);
  }
}

export async function getExerciseData(
  unitId: string,
  exerciseId: string,
  fetchDataUrl?: string,
): Promise<[ExerciseVo | undefined, UnitVo | undefined]> {
  return getCoursewareUnitData(unitId, _token, fetchDataUrl).then((unit) => {
    const exercise = unit?.exercises.find((item) => item.id === exerciseId);
    applyExerciseDocumentTheme(exercise, unit);
    return [exercise, unit];
  });
}

export async function getCoursewareUnitData(
  unitId: string,
  token = _token,
  fetchDataUrl?: string,
): Promise<UnitVo | undefined> {
  return fetchCoursewareUnitData(unitId, token, fetchDataUrl);
}

export async function getPreviewExerciseData(
  businessContentUuid: string,
  fetchDataUrl?: string,
): Promise<any> {
  return getPreviewUnitData(businessContentUuid, _token, fetchDataUrl).then((unit) => {
    const exercise = unit.exercises[0];
    applyExerciseDocumentTheme(exercise, unit);
    return [exercise, unit];
  });
}

export async function getPreviewUnitData(
  businessContentUuid: string,
  token = _token,
  fetchDataUrl?: string,
): Promise<UnitVo> {
  return fetchPreviewUnitData(businessContentUuid, token, fetchDataUrl);
}

export function getExerciseDataByIdentity(
  identity: ExerciseBootstrapIdentity,
  fetchDataUrl?: string,
) {
  return identity.channel === 'courseware-next'
    ? getExerciseData(identity.unitId, identity.exerciseId, fetchDataUrl)
    : getPreviewExerciseData(identity.businessContentUuid, fetchDataUrl);
}

export async function getExerciseInterceptor(params: AppProps) {
  const identity = resolveExerciseIdentity(params);
  const bootstrapData = await requestExerciseBootstrapData(identity);
  if (bootstrapData) {
    applyExerciseDocumentTheme(...bootstrapData);
    return bootstrapData;
  }
  return getExerciseDataByIdentity(identity, params.fetchDataUrl);
}

// Only for early development of new templates before real getExerciseData wiring exists.
// Remove template-side usage once the template is connected to real data.
export function getPreviewMock(template: string): Promise<[ExerciseVo | undefined, UnitVo]> {
  const mockUrl = new URL(`./mock/${template}.json`, import.meta.url);

  return fetch(mockUrl)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Mock 数据加载失败: ${res.status} ${res.statusText}`);
      }

      return res.json() as Promise<ExerciseResultItem>;
    })
    .then(parseUnitPayload)
    .then((res) => {
      const exercise = res.exercises[0];
      const unit = res;
      applyExerciseDocumentTheme(exercise, unit);
      return [exercise, unit];
    });
}
