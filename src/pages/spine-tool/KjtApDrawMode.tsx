import type { ReactNode } from 'react';

import SpineToolShell from './SpineToolShell';

type KjtApDrawModeAsset = {
  id: string;
};

interface KjtApDrawModeProps<T extends KjtApDrawModeAsset> {
  visibleAssets: readonly T[];
  mainUrl: string;
  title: string;
  description: string;
  backLabel: string;
  renderCard: (asset: T) => ReactNode;
}

export default function KjtApDrawMode<T extends KjtApDrawModeAsset>({
  visibleAssets,
  mainUrl,
  title,
  description,
  backLabel,
  renderCard,
}: KjtApDrawModeProps<T>) {
  return (
    <SpineToolShell
      title={title}
      description={description}
      visibleCount={visibleAssets.length}
      links={[
        {
          href: mainUrl,
          label: backLabel,
        },
      ]}
    >
      {visibleAssets.map((asset) => (
        <div key={asset.id}>{renderCard(asset)}</div>
      ))}
    </SpineToolShell>
  );
}
