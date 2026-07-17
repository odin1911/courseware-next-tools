import KjtApDrawMode from './KjtApDrawMode';
import OverviewMode from './OverviewMode';
import { SpineRuntimeCard } from './SpineRuntimeCard';
import {
  COUNT2_FARM_MODE,
  KJT_AP_DRAW_MODE,
  getPageState,
  getVisibleAssets,
  spineAssets,
} from './spineToolConfig';

export default function App() {
  const { focusedMode, count2Url, kjtApDrawUrl, mainUrl } = getPageState();
  const isCount2Mode = focusedMode === COUNT2_FARM_MODE;
  const isKjtApDrawMode = focusedMode === KJT_AP_DRAW_MODE;
  const visibleAssets = getVisibleAssets(focusedMode, spineAssets);

  if (isKjtApDrawMode) {
    return (
      <KjtApDrawMode
        visibleAssets={visibleAssets}
        mainUrl={mainUrl}
        title={'KJT_AP_DRAW_v2 Draw 专项验证'}
        description={
          '当前通过 URL 参数切到 Draw 专项模式，聚焦 3 个三角板资源是否符合 Draw 模板契约。'
        }
        backLabel={'返回全部资源'}
        renderCard={(asset) => <SpineRuntimeCard key={asset.id} asset={asset} />}
      />
    );
  }

  return (
    <OverviewMode
      isCount2Mode={isCount2Mode}
      visibleAssets={visibleAssets}
      mainUrl={mainUrl}
      count2Url={count2Url}
      kjtApDrawUrl={kjtApDrawUrl}
      renderCard={(asset) => <SpineRuntimeCard key={asset.id} asset={asset} />}
    />
  );
}
