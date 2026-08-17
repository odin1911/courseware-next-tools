export type AnimationAsset = {
  fileName: string;
  title: string;
  zipUrl: string;
};

export function buildAnimationCatalog(modules: Record<string, string>): AnimationAsset[] {
  return Object.entries(modules)
    .map(([path, zipUrl]) => {
      const fileName = path.slice(path.lastIndexOf('/') + 1);
      const title = fileName.replace(/\.zip$/i, '').replace(/^BD_/, '').replace(/_/g, ' ');

      return { fileName, title, zipUrl };
    })
    .sort((left, right) => left.fileName.localeCompare(right.fileName));
}

export function resolveSelectedAnimation(search: string, assets: AnimationAsset[]) {
  const fileName = new URLSearchParams(search).get('asset');
  return assets.find((asset) => asset.fileName === fileName);
}
