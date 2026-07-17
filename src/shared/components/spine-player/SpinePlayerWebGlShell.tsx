import type { SpinePlayerWebGlShellProps } from './spineTypes';

export function SpinePlayerWebGlShell({
  backgroundImageUrl: _backgroundImageUrl,
  showBackground: _showBackground = true,
  backgroundNaturalSize: _backgroundNaturalSize = null,
  width,
  height,
  stageWidth: _stageWidth,
  stageHeight: _stageHeight,
  fitRatio: _fitRatio = 1,
  className,
  style,
  canvasRef,
  children,
}: SpinePlayerWebGlShellProps) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ position: 'relative', zIndex: 1, display: 'block' }}
      />
      {children}
    </div>
  );
}
