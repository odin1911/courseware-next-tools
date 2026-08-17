import { describe, expect, it } from 'vitest';
import { buildAnimationCatalog, resolveSelectedAnimation } from './animationCatalog';

const assets = buildAnimationCatalog({
  './heart.zip': '/assets/heart.zip',
  './BD_laki.zip': '/assets/BD_laki.zip',
});

describe('animation catalog', () => {
  it('把 zip 模块整理成按文件名排序的可展示资源', () => {
    expect(assets).toEqual([
      {
        fileName: 'BD_laki.zip',
        title: 'laki',
        zipUrl: '/assets/BD_laki.zip',
      },
      {
        fileName: 'heart.zip',
        title: 'heart',
        zipUrl: '/assets/heart.zip',
      },
    ]);
  });

  it('只为存在的 asset 查询参数打开详情', () => {
    expect(resolveSelectedAnimation('?asset=heart.zip', assets)?.title).toBe('heart');
    expect(resolveSelectedAnimation('?asset=missing.zip', assets)).toBeUndefined();
    expect(resolveSelectedAnimation('', assets)).toBeUndefined();
  });
});
