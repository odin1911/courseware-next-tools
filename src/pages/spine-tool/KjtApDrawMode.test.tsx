import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import KjtApDrawMode from './KjtApDrawMode';

describe('KjtApDrawMode', () => {
  it('把卡片列表作为 React children 渲染，不抛运行时错误', () => {
    const visibleAssets = [{ id: 'shape_draw_triangle_sign' }];

    expect(() =>
      renderToStaticMarkup(
        <KjtApDrawMode
          visibleAssets={visibleAssets}
          mainUrl={'/src/pages/spine-tool/index.html'}
          title={'KJT_AP_DRAW_v2 Draw 专项验证'}
          description={'测试用描述'}
          backLabel={'返回全部资源'}
          renderCard={(asset) => <article>{asset.id}</article>}
        />,
      ),
    ).not.toThrow();
  });
});
