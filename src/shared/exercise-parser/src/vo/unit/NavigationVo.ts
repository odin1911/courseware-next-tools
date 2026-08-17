import { get } from '../../utils/futil';

export class NavigationVo {
  text: string;
  module: string;
  exerciseId: string;
  iconPath: string;
  bgColor: number;
  bgHoverColor: number;
  children: NavigationVo[] | undefined;
  parent: NavigationVo | undefined;
  hasInteractiveQuiz: boolean; // 是否存在互动题
}

export function parseNavigationVo(
  raw: any,
  interactiveQuizIds: string[],
  parent?: NavigationVo,
): NavigationVo {
  const ret = new NavigationVo();
  ret.text = get(raw, ['navigation-name'], '');
  ret.module = get(raw, ['template-module'], '');
  ret.exerciseId = '' + get(raw, ['exercise-id'], '');
  ret.hasInteractiveQuiz = interactiveQuizIds.indexOf(ret.exerciseId) !== -1;
  ret.iconPath = get(raw, ['navigation-icon'], '');
  ret.bgColor = get(raw, ['navigation-bg-color'], '');
  ret.bgHoverColor = get(raw, ['navigation-bg-color-hover'], '');
  const childrenData: any[] = get(raw, ['sub-navigations'], undefined);
  ret.children = Array.isArray(childrenData)
    ? childrenData.map((cData) => parseNavigationVo(cData, interactiveQuizIds, ret))
    : undefined;
  ret.parent = parent;
  return ret;
}
