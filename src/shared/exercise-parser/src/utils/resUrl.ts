let shortName = true;

export function useResShortName(v: boolean = true): void {
  shortName = v;
}

// 保留 tamic-common 的公开签名；当前资源前缀已包含分辨率路径，因此无需额外处理。
export function setResScale(scale: number): void;
export function setResScale(): void {}

export function parserResUrl(prefix: string, url: string): string {
  if (!prefix || !url || url.substring(0, 4) === 'http') {
    return url;
  }
  const prefixStr = prefix + (shortName ? url.substring(0, 3) + '/' : '');
  const ext = url.match(/\.([\w.]+)$/);
  if (ext && ext[1] === 'zip') {
    return prefixStr + url.replace('.zip', '.zip');
  } else if (ext && ext[1] === 'png.zip') {
    return prefixStr + url.replace('.png.zip', '.png');
  }
  return prefixStr + url;
}
