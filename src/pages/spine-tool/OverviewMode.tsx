import type { ReactNode } from 'react';

import SpineToolShell from './SpineToolShell';

type OverviewModeAsset = {
  id: string;
};

interface OverviewModeProps<T extends OverviewModeAsset> {
  isCount2Mode: boolean;
  visibleAssets: readonly T[];
  mainUrl: string;
  count2Url: string;
  kjtApDrawUrl: string;
  renderCard: (asset: T) => ReactNode;
}

export default function OverviewMode<T extends OverviewModeAsset>({
  isCount2Mode,
  visibleAssets,
  mainUrl,
  count2Url,
  kjtApDrawUrl,
  renderCard,
}: OverviewModeProps<T>) {
  return (
    <SpineToolShell
      title={isCount2Mode ? 'Count2 Farm 专项验证' : 'Spine Runtime 基础验证'}
      description={
        isCount2Mode
          ? '当前通过 URL 参数切到 Count2 Farm 单资源视图，仍属于 spine-tool 本身。'
          : '目标：不依赖项目 Spine 封装，只用基础 runtime 判断资源是否可显示'
      }
      visibleCount={visibleAssets.length}
      links={[
        {
          href: isCount2Mode ? mainUrl : count2Url,
          label: isCount2Mode ? '返回全部资源' : '切到 Count2 Farm',
        },
        {
          href: kjtApDrawUrl,
          label: '切到 Draw 专项',
        },
      ]}
    >
      {visibleAssets.map((asset) => (
        <div key={asset.id}>{renderCard(asset)}</div>
      ))}
    </SpineToolShell>
  );
}
