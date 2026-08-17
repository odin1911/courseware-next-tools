import { TipContentVo, parseTipContentVo } from './TipContentVo';
import { get, find } from '../../utils/futil';

export class TeacherTipVo {
  id: string;
  name: string;
  position: number;
  type: string;
  statusEn: string;
  statusCn: string;
  tipContents: TipContentVo[];
}

export function parseTeacherTipVo(raw: any, include: any, resUrlPrefix: string): TeacherTipVo {
  const ret = new TeacherTipVo();
  ret.id = get(raw, ['id'], '');
  const attr = get(raw, ['attributes'], undefined);
  ret.name = get(attr, ['name'], '');
  ret.position = get(attr, ['position'], 0);
  ret.type = get(attr, ['type'], '');
  ret.statusEn = get(attr, ['status-en'], '');
  ret.statusCn = get(attr, ['status-cn'], '');
  const tipContents = get(raw, ['relationships', 'tip-contents', 'data'], []);
  ret.tipContents = Array.isArray(tipContents)
    ? tipContents.map((t) =>
        parseTipContentVo(
          find(include, (v) => v.id === t.id),
          include,
          resUrlPrefix,
        ),
      )
    : [];
  return ret;
}
