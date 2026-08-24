import { useRef, useState } from 'react';
import DragonBonesPlayer from '@/shared/components/dragonbones-player';
import type { DragonBonesHandle } from '@/shared/components/dragonbones-player';
import { DEFAULT_ARMATURE } from '../dragonbones-tool/armatureSelection';
import { buildAnimationCatalog, resolveSelectedAnimation } from './animationCatalog';
import type { AnimationAsset } from './animationCatalog';
import AnimationFrameExporter from './AnimationFrameExporter';
import exportProfiles from './exportProfiles.json';
import './App.css';

const animationModules = import.meta.glob('./assets/*.zip', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const animationAssets = buildAnimationCatalog(animationModules);

const EXPORT_PROFILES = exportProfiles as Record<
  string,
  { origin: { x: number; y: number }; loopActions: string[] }
>;

function LivePreview({ asset, showDebugBounds }: { asset: AnimationAsset; showDebugBounds: boolean }) {
  const [error, setError] = useState('');

  return (
    <div className="live-preview">
      {error ? (
        <span className="preview-error">无法加载</span>
      ) : (
        <DragonBonesPlayer
          zipUrl={asset.zipUrl}
          armature={DEFAULT_ARMATURE}
          width={320}
          height={220}
          fitSize
          fitMode="animation-bounds"
          showDebugBounds={showDebugBounds}
          forceCanvas
          onError={setError}
          className="list-player"
          style={{ width: '100%', height: 'auto' }}
        />
      )}
      <span className="live-badge">LIVE</span>
    </div>
  );
}

function DetailPreview({ asset, showDebugBounds }: { asset: AnimationAsset; showDebugBounds: boolean }) {
  const playerRef = useRef<DragonBonesHandle | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [armature, setArmature] = useState(DEFAULT_ARMATURE);
  const [armatures, setArmatures] = useState<string[]>([]);
  const [animations, setAnimations] = useState<string[]>([]);
  const [currentAnimation, setCurrentAnimation] = useState('');

  const play = (animationName: string) => {
    playerRef.current?.play(animationName, true);
    setCurrentAnimation(animationName);
  };

  return (
    <main className="detail-layout">
      <a className="back-link" href="./">
        <span aria-hidden="true">←</span> 返回动画列表
      </a>

      <header className="detail-header">
        <div>
          <p className="eyebrow">DRAGONBONES / {asset.fileName}</p>
          <h1>{asset.title}</h1>
        </div>
        <span className={`status-badge status-${status}`}>
          {status === 'loading' ? '加载中' : status === 'ready' ? '播放中' : '加载失败'}
        </span>
      </header>

      <section className="detail-workbench" aria-label={`${asset.title} 动画预览`}>
        <div className="detail-stage">
          {status === 'error' ? (
            <p className="detail-error">{error}</p>
          ) : (
            <DragonBonesPlayer
              key={armature}
              ref={playerRef}
              zipUrl={asset.zipUrl}
              armature={armature}
              width={760}
              height={520}
              fitSize
              fitMode="animation-bounds"
              showDebugBounds={showDebugBounds}
              autoPlay={false}
              className="detail-player"
              onReady={() => {
                const nextArmatures = playerRef.current?.getArmatureNames() ?? [];
                setArmatures(nextArmatures);

                if (nextArmatures.length > 0 && !nextArmatures.includes(armature)) {
                  setArmature(nextArmatures[0]);
                  return;
                }

                const nextAnimations = playerRef.current?.getAnimationList() ?? [];
                const firstAnimation = nextAnimations[0] ?? '';
                setAnimations(nextAnimations);
                setCurrentAnimation(firstAnimation);
                setStatus('ready');

                if (firstAnimation) {
                  playerRef.current?.play(firstAnimation, true);
                }
              }}
              onError={(message) => {
                setError(message);
                setStatus('error');
              }}
            />
          )}
        </div>

        <aside className="detail-controls">
          <div className="control-group">
            <p className="control-label">文件</p>
            <p className="file-name">{asset.fileName}</p>
          </div>

          {armatures.length > 1 && (
            <div className="control-group">
              <p className="control-label">骨架</p>
              <div className="button-list">
                {armatures.map((name) => (
                  <button
                    className={name === armature ? 'is-active' : ''}
                    key={name}
                    type="button"
                    onClick={() => {
                      setStatus('loading');
                      setAnimations([]);
                      setCurrentAnimation('');
                      setArmature(name);
                    }}
                  >
                    {name.replace(/^armatures\//, '')}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="control-group">
            <p className="control-label">动作</p>
            {animations.length > 0 ? (
              <div className="button-list">
                {animations.map((name) => (
                  <button
                    className={name === currentAnimation ? 'is-active' : ''}
                    key={name}
                    type="button"
                    onClick={() => play(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted-copy">{status === 'loading' ? '正在读取动作…' : '没有可播放动作'}</p>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

function CatalogPage({ showDebugBounds }: { showDebugBounds: boolean }) {
  return (
    <main className="catalog-layout">
      <header className="catalog-header">
        <div>
          <p className="eyebrow">LIVE ASSET CONTACT SHEET</p>
          <h1>DragonBones 动画库</h1>
          <p className="catalog-intro">直接查看默认动作，点击卡片进入单资源详情。</p>
        </div>
        <div className="asset-count">
          <strong>{animationAssets.length}</strong>
          <span>个资源</span>
        </div>
      </header>

      <section className="catalog-grid" aria-label="DragonBones 动画资源">
        {animationAssets.map((asset) => (
          <a
            className="catalog-card"
            href={`?asset=${encodeURIComponent(asset.fileName)}`}
            key={asset.fileName}
            aria-label={`打开 ${asset.title} 详情`}
          >
            <LivePreview asset={asset} showDebugBounds={showDebugBounds} />
            <div className="card-copy">
              <div>
                <h2>{asset.title}</h2>
                <p>{asset.fileName}</p>
              </div>
              <span className="open-mark" aria-hidden="true">↗</span>
            </div>
          </a>
        ))}
      </section>
    </main>
  );
}

function MissingAsset({ fileName }: { fileName: string }) {
  return (
    <main className="missing-layout">
      <p className="eyebrow">ASSET NOT FOUND</p>
      <h1>没有找到 {fileName}</h1>
      <p>文件可能已改名或移出 animations 目录。</p>
      <a className="back-link" href="./">← 返回动画列表</a>
    </main>
  );
}

export default function App() {
  const [showDebugBounds, setShowDebugBounds] = useState(true);
  const search = typeof window === 'undefined' ? '' : window.location.search;
  const selectedFileName = new URLSearchParams(search).get('asset');
  const exportFileName = new URLSearchParams(search).get('export');
  const exportAsset = animationAssets.find((asset) => asset.fileName === exportFileName);
  const selectedAsset = resolveSelectedAnimation(search, animationAssets);

  if (exportAsset) {
    return (
      <AnimationFrameExporter
        asset={exportAsset}
        origin={EXPORT_PROFILES[exportAsset.fileName].origin}
      />
    );
  }

  if (exportFileName) {
    return <MissingAsset fileName={exportFileName} />;
  }

  if (selectedAsset) {
    return (
      <>
        <DebugBoundsToggle checked={showDebugBounds} onChange={setShowDebugBounds} />
        <DetailPreview asset={selectedAsset} showDebugBounds={showDebugBounds} />
      </>
    );
  }

  if (selectedFileName) {
    return <MissingAsset fileName={selectedFileName} />;
  }

  return (
    <>
      <DebugBoundsToggle checked={showDebugBounds} onChange={setShowDebugBounds} />
      <CatalogPage showDebugBounds={showDebugBounds} />
    </>
  );
}

function DebugBoundsToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="debug-bounds-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      显示参考框
    </label>
  );
}
