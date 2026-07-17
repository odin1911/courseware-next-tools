import type { CSSProperties } from 'react';
import { useState } from 'react';
import DemoCard from './DemoCard';
import FrameExportPage from './FrameExportPage';
import { count2FarmAsset, dragonbonesToolAssets } from './demoAssets';

const TOOL_FEATURES = [
  {
    title: '全量资源巡检',
    description: '把 DDVK 常用 DragonBones zip 资源集中展示，进入页面即可逐张检查加载状态。',
  },
  {
    title: '多骨架切换',
    description: '自动读取 zip 内 armature 列表；当资源包含多个骨架时，可直接在卡片内切换验证。',
  },
  {
    title: '动画回放',
    description: '自动提取动画名并生成播放按钮，支持默认动画启动、逐条点播与当前动画重播。',
  },
  {
    title: '问题定位',
    description: '每张卡片都暴露加载状态、当前骨架和动画数量，并支持整页重新挂载做二次复核。',
  },
  {
    title: '动作最大区域分析',
    description:
      '对当前动作做多轮重播并逐帧采样，过滤极端值后输出稳定样本的最大包围盒和四边安全区。',
  },
  {
    title: '现状对比',
    description:
      '若已录入页面当前 padding 与 offset，工具会直接比较 required vs current，标记裁切风险和位置漂移。',
  },
  {
    title: '动画嵌字',
    description: '在 Pixi 渲染树中注入文本，支持舞台层、骨架根层和 slot.display 替换三种调试路径。',
  },
] as const;

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  color: '#5a2508',
  fontFamily: 'Primer Print, heiti, sans-serif',
  background:
    'radial-gradient(circle at top left, rgba(255, 255, 255, 0.92), rgba(255, 242, 227, 0.88) 32%, rgba(255, 168, 111, 0.9) 68%, #ff7539 100%)',
};

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 80,
  padding: '6px 12px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.04em',
};

const buttonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 999,
  padding: '8px 12px',
  background: '#ff7c42',
  color: '#fffaf3',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1,
};

const featureCardStyle: CSSProperties = {
  display: 'grid',
  gap: 6,
  borderRadius: 16,
  padding: '14px 16px',
  background: 'rgba(255, 255, 255, 0.72)',
  boxShadow: 'inset 0 0 0 1px rgba(180, 79, 22, 0.08)',
};

function getPageState() {
  if (typeof window === 'undefined') {
    return {
      feature: '',
      focusedMode: '',
      count2Url: '',
      frameExportUrl: '',
      mainUrl: '',
    };
  }

  const url = new URL(window.location.href);
  const feature = url.searchParams.get('feature') ?? '';
  const focusedMode = url.searchParams.get('mode') ?? '';

  url.searchParams.set('mode', count2FarmAsset.id);
  url.searchParams.delete('feature');
  const count2Url = `${url.pathname}${url.search}`;

  url.searchParams.delete('mode');
  url.searchParams.set('feature', 'frame-export');
  const frameExportUrl = `${url.pathname}${url.search}`;

  url.searchParams.delete('feature');

  return {
    feature,
    focusedMode,
    count2Url,
    frameExportUrl,
    mainUrl: `${url.pathname}${url.search}`,
  };
}

export default function App() {
  const [remountSeed, setRemountSeed] = useState(0);
  const { feature, focusedMode, count2Url, frameExportUrl, mainUrl } = getPageState();
  const isFrameExportFeature = feature === 'frame-export';
  const focusedAsset = [count2FarmAsset, ...dragonbonesToolAssets].find(
    (asset) => asset.id === focusedMode,
  );
  const isFocusedMode = !!focusedAsset;
  const visibleAssets = focusedAsset ? [focusedAsset] : dragonbonesToolAssets;

  if (isFrameExportFeature) {
    return <FrameExportPage mainUrl={mainUrl} />;
  }

  return (
    <div style={pageStyle} data-testid="dragonbones-demo-root">
      <div
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '24px 18px 40px',
          display: 'grid',
          gap: 18,
        }}
      >
        <header
          style={{
            display: 'grid',
            gap: 12,
            borderRadius: 18,
            padding: 20,
            background: 'rgba(255, 250, 244, 0.72)',
            boxShadow: '0 10px 28px rgba(116, 41, 0, 0.12)',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.08em', color: '#7b3412' }}>
            DRAGONBONES TOOL
          </div>
          <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.1, fontWeight: 700 }}>
            {focusedAsset ? `${focusedAsset.title} 专项验证` : '全量动画资源可视化验证'}
          </h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'rgba(90, 37, 8, 0.82)' }}>
            {focusedAsset
              ? `当前通过 URL 参数切到 ${focusedAsset.title} 单资源视图，仍属于 dragonbones-tool 本身。`
              : '这是独立工具页，不再挂在 DDVK 页面内；如需只看 Count2 Farm，可通过 URL 参数切到单资源视图。'}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              style={buttonStyle}
              onClick={() => setRemountSeed((value) => value + 1)}
            >
              重新挂载全部
            </button>
            <a
              href={isFocusedMode ? mainUrl : count2Url}
              style={{
                ...buttonStyle,
                textDecoration: 'none',
              }}
            >
              {isFocusedMode ? '返回全部资源' : '切到 Count2 Farm'}
            </a>
            <a
              href={frameExportUrl}
              style={{
                ...buttonStyle,
                textDecoration: 'none',
              }}
            >
              动画转图片
            </a>
            <span
              style={{
                ...badgeStyle,
                background: 'rgba(255, 255, 255, 0.7)',
                color: '#7b3412',
              }}
            >
              资源总数: {visibleAssets.length}
            </span>
          </div>
          <section style={{ display: 'grid', gap: 10 }} aria-label="功能说明">
            <div
              style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', color: '#7b3412' }}
            >
              功能说明
            </div>
            <div
              style={{
                display: 'grid',
                gap: 12,
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              }}
            >
              {TOOL_FEATURES.map((feature) => (
                <article key={feature.title} style={featureCardStyle}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#5a2508' }}>
                    {feature.title}
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(90, 37, 8, 0.78)' }}>
                    {feature.description}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </header>

        <section
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          }}
        >
          {visibleAssets.map((asset) => (
            <div key={`${asset.id}-${remountSeed}`}>
              <DemoCard asset={asset} />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
