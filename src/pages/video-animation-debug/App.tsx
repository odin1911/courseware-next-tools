import { useMemo, useState } from 'react';
import { getRasterAsset, getRasterAssetNames } from '../KJG_QAP_BD_v2_2026_video/rasterAssets';

type VideoFormat = 'webm' | 'mov';

const MIME_TYPES: Record<VideoFormat, string> = {
  webm: 'video/webm; codecs="vp9"',
  mov: 'video/quicktime; codecs="hvc1"',
};
const FORMAT_LABELS: Record<VideoFormat, string> = { webm: 'WebM', mov: 'MOV' };

const entries = getRasterAssetNames().flatMap((assetName) => {
  const asset = getRasterAsset(assetName);
  return Object.entries(asset.manifest.actions).flatMap(([actionName, action]) =>
    action.webm && action.mov
      ? [
          {
            key: `${assetName}/${actionName}`,
            assetName,
            actionName,
            webm: asset.files[action.webm],
            mov: asset.files[action.mov],
          },
        ]
      : [],
  );
});

function getSourceOrder(): VideoFormat[] {
  const probe = document.createElement('video');
  const canPlayWebm = probe.canPlayType(MIME_TYPES.webm) !== '';
  const canPlayMov = probe.canPlayType(MIME_TYPES.mov) !== '';
  const isSafari = /Safari\//.test(navigator.userAgent) &&
    !/(Chrome|Chromium|CriOS|Android)\//.test(navigator.userAgent);
  const preferred: VideoFormat = isSafari ? 'mov' : 'webm';
  const alternative: VideoFormat = preferred === 'mov' ? 'webm' : 'mov';
  const support = { webm: canPlayWebm, mov: canPlayMov };

  return support[preferred] || !support[alternative]
    ? [preferred, alternative]
    : [alternative, preferred];
}

function detectFormat(src: string): VideoFormat | null {
  if (/\.webm(?:$|[?#])/i.test(src)) return 'webm';
  if (/\.mov(?:$|[?#])/i.test(src)) return 'mov';
  return null;
}

function VideoCard({
  entry,
  sourceOrder,
}: {
  entry: (typeof entries)[number];
  sourceOrder: VideoFormat[];
}) {
  const [selected, setSelected] = useState<{ format: VideoFormat; src: string } | null>(null);
  const [failed, setFailed] = useState(false);

  return (
    <article
      className="video-card"
      data-video-card
      data-selected-format={selected?.format ?? ''}
    >
      <header>
        <strong>{entry.assetName}</strong>
        <span>{entry.actionName}</span>
      </header>
      <video
        controls
        loop
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={(event) => {
          const src = event.currentTarget.currentSrc;
          const format = detectFormat(src);
          if (format) setSelected({ format, src });
        }}
        onError={() => setFailed(true)}
      >
        {sourceOrder.map((format) => (
          <source key={format} src={entry[format]} type={MIME_TYPES[format]} />
        ))}
      </video>
      <div className={`status ${failed ? 'error' : ''}`}>
        {failed
          ? '加载失败：浏览器未能播放两种格式'
          : selected
            ? `实际使用：${FORMAT_LABELS[selected.format]}`
            : '等待浏览器选择资源…'}
      </div>
      {selected && <code title={selected.src}>{selected.src}</code>}
    </article>
  );
}

export default function App() {
  const sourceOrder = useMemo(getSourceOrder, []);

  return (
    <main>
      <h1>透明视频资源调试</h1>
      <p>
        共 {entries.length} 个动画。浏览器优先尝试 {FORMAT_LABELS[sourceOrder[0]]}，
        实际格式以每项加载后的 <code>currentSrc</code> 为准。
      </p>
      <section className="video-grid">
        {entries.map((entry) => (
          <VideoCard key={entry.key} entry={entry} sourceOrder={sourceOrder} />
        ))}
      </section>
    </main>
  );
}
