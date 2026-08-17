import { ExerciseVo, parseExerciseVo } from '../exercise/ExerciseVo';
import { get } from '../../utils/futil';
import { parserResUrl } from '../../utils/resUrl';
import { NavigationVo, parseNavigationVo } from './NavigationVo';

export class UnitVo {
  id: string;
  uuid: string;
  name: string;
  titleImagePath: string;
  commonBgPath: string;
  exercises: ExerciseVo[];
  linkExercises: ExerciseVo[];
  navigations: NavigationVo[];
  interactiveQuizIds: string[];
  courseCategoryName: string;
  styleId: string;
  font: string;
}

export function parseUnitVo(raw: any, resUrlPrefix: string): UnitVo {
  const ret = new UnitVo();
  ret.id = '' + get(raw, ['unit_id'], '');
  ret.uuid = get(raw, ['unit_uuid'], '');
  ret.name = get(raw, ['unit_name'], '');
  ret.courseCategoryName = get(raw, ['course_category_name'], '');
  ret.font = get(raw, ['course_font'], null);
  ret.styleId = get(raw, ['course_style_id'], '');
  ret.titleImagePath = parserResUrl(resUrlPrefix, get(raw, 'title_image_next', null));
  ret.commonBgPath = parserResUrl(resUrlPrefix, get(raw, 'common_bg_next', ''));
  ret.interactiveQuizIds = get(raw, ['interactive_quiz_ids'], []).map((id: any) => '' + id);
  const _exesData: any[] = get(raw, ['exercises_data'], []);
  const exesData: any[] = Array.isArray(_exesData) ? _exesData : [_exesData];
  ret.exercises = [];
  ret.linkExercises = [];
  if (Array.isArray(exesData)) {
    for (let eData of exesData) {
      const exeVo = parseExerciseVo(eData, resUrlPrefix);
      exeVo.unitId = ret.id;
      exeVo.unitUuid = ret.uuid;
      if (exeVo.titleImagePath === '') {
        // 如果是''使用unit一级的title-image
        exeVo.titleImagePath = ret.titleImagePath;
      }
      if (exeVo.source !== 'link') {
        ret.exercises.push(exeVo);
      } else {
        ret.linkExercises.push(exeVo);
      }
    }
  }
  const naviData: any[] = get(raw, ['navigations'], []);
  ret.navigations = Array.isArray(naviData)
    ? naviData.map((nData) => parseNavigationVo(nData, ret.interactiveQuizIds))
    : [];
  return ret;
}

/** 将多个unitVo拼接为一个，用于一堂课多个unit的情况 */
export function mergeUnitVos(vos: UnitVo[]): UnitVo {
  const ret = new UnitVo();
  if (vos && vos.length > 0) {
    vos.forEach((v) => {
      ret.id = ret.id || v.id;
      ret.uuid = ret.uuid || v.uuid;
      ret.name = ret.name || v.name;
      ret.titleImagePath = ret.titleImagePath || v.titleImagePath;
      ret.commonBgPath = ret.commonBgPath || v.commonBgPath;
      ret.courseCategoryName = ret.courseCategoryName || v.courseCategoryName;
      ret.exercises = v.exercises
        ? ret.exercises
          ? ret.exercises.concat(v.exercises)
          : v.exercises.concat()
        : ret.exercises;
      ret.linkExercises = v.linkExercises
        ? ret.linkExercises
          ? ret.linkExercises.concat(v.linkExercises)
          : v.linkExercises.concat()
        : ret.linkExercises;
      ret.navigations = v.navigations
        ? ret.navigations
          ? ret.navigations.concat(v.navigations)
          : v.navigations.concat()
        : ret.navigations;
      ret.interactiveQuizIds = v.interactiveQuizIds
        ? ret.interactiveQuizIds
          ? ret.interactiveQuizIds.concat(v.interactiveQuizIds)
          : v.interactiveQuizIds
        : ret.interactiveQuizIds;
      ret.font = ret.font || v.font;
      ret.styleId = ret.styleId || v.styleId;
    });
  }
  return ret;
}
