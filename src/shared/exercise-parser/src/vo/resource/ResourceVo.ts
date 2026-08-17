import { TimeAxisBySentenceVo, parseTimeAxisBySentenceVo } from './TimeAxisBySentenceVo';
import { TimeAxisByWordVo, parseTimeAxisByWordVo } from './TimeAxisByWordVo';
import { get } from '../../utils/futil';
import { parserResUrl } from '../../utils/resUrl';

export class ResourceVo {
  id: string;
  mime: string;
  audioPath: string;
  skeletonPath: string;
  atlasPath?: string;
  imagePath: string;
  videoPath: string;
  timeAxisBySentence: TimeAxisBySentenceVo[];
  timeAxisByWord: { [key: string]: TimeAxisByWordVo };
}

export function parseResourceVo(raw: any, resUrlPrefix: string = ''): ResourceVo {
  const ret = new ResourceVo();
  const attributes = get(raw, 'attributes', {});
  const tabs = get(attributes, ['additional-attributes', 'time-axis-by-sentence']);
  const tabw = get(attributes, ['additional-attributes', 'time-axis-by-word']);
  ret.id = '' + get(raw, 'id', '');
  ret.mime = get(attributes, 'mime', '');
  ret.audioPath = parserResUrl(resUrlPrefix, get(attributes, 'audio-path', ''));
  // skeleton-path-v1 表示升级过的骨骼动画资源，如果没有，使用老的skeleton-path
  ret.skeletonPath = parserResUrl(
    resUrlPrefix,
    get(attributes, 'skeleton-path-v1', undefined) || get(attributes, 'skeleton-path', ''),
  );
  ret.atlasPath = parserResUrl(resUrlPrefix, get(attributes, 'atlas-path', ''));
  ret.imagePath = parserResUrl(resUrlPrefix, get(attributes, 'image-path', ''));
  ret.videoPath = parserResUrl(resUrlPrefix, get(attributes, 'video-path', ''));
  ret.timeAxisBySentence = Array.isArray(tabs) ? tabs.map(parseTimeAxisBySentenceVo) : [];
  const timeAxisByWordArr = Array.isArray(tabw) ? tabw.map(parseTimeAxisByWordVo) : [];
  ret.timeAxisByWord = timeAxisByWordArr.reduce(
    (map: { [key: string]: TimeAxisByWordVo }, value) => {
      map[value.word] = value;
      return map;
    },
    {},
  );
  return ret;
}
