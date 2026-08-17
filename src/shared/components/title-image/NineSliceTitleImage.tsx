import React, { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

type Slice = [top: number, right: number, bottom: number, left: number];

const TitleBox = styled.div`
  font-size: 26px;
`;
interface NineSliceTitleImageProps {
  /** 背景图片 URL */
  src?: string;
  /**
   * 九宫格切片像素值 [top, right, bottom, left]
   * @default [18, 76, 18, 88]
   */
  slice?: Slice;
  /** 纹理原图尺寸 [width, height]，默认 [400, 76] */
  textureSize?: [width: number, height: number];
  /** 最小宽度，默认 200px */
  minWidth?: number;
  children?: React.ReactNode;
  className?: string;
  style?: CSSProperties;
}

interface StageTitleProps {
  src?: string;
  scale?: number;
  children?: React.ReactNode;
}

const STAGE_TITLE_LEFT = 32;
const STAGE_TITLE_TOP = 80;
const STAGE_TITLE_BASE_SCALE = 0.76;
const STAGE_TITLE_MIN_WIDTH = 100;
const STAGE_TITLE_PADDING_RIGHT = 44;

/**
 * 九宫格边框组件 —— 使用离屏 Canvas 绘制九宫格后转为单张图片显示，
 * 避免 CSS border-image 在浏览器缩放时出现拼接缝隙。
 */
const NineSliceTitleImage: React.FC<NineSliceTitleImageProps> = ({
  src,
  slice = [18, 88, 18, 88],
  textureSize = [400, 76],
  minWidth = 200,
  children,
  className,
  style,
}) => {
  const [t, r, b, l] = slice;
  const [texW, texH] = textureSize;

  const wrapRef = useRef<HTMLDivElement>(null);
  const textureRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [frame, setFrame] = useState({ src: '', revision: 0 });

  const renderFrame = useCallback(() => {
    const wrap = wrapRef.current;
    const texture = textureRef.current;
    if (!wrap || !texture || !texture.complete || !texture.naturalWidth) return;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const boxWidth = wrap.offsetWidth;
    const boxHeight = wrap.offsetHeight;
    const centerWidth = Math.max(0, boxWidth - l - r);
    const middleHeight = Math.max(0, boxHeight - t - b);

    const sourceWidths = [l, Math.max(0, texW - l - r), r];
    const sourceHeights = [t, Math.max(0, texH - t - b), b];
    const targetWidths = [l, centerWidth, r];
    const targetHeights = [t, middleHeight, b];
    const sourceOffsetsX = [0, l, texW - r];
    const sourceOffsetsY = [0, t, texH - b];
    const targetOffsetsX = [0, l, boxWidth - r];
    const targetOffsetsY = [0, t, boxHeight - b];

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(boxWidth * dpr));
    canvas.height = Math.max(1, Math.round(boxHeight * dpr));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, boxWidth, boxHeight);
    ctx.imageSmoothingEnabled = true;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const sw = sourceWidths[col];
        const sh = sourceHeights[row];
        const tw = targetWidths[col];
        const th = targetHeights[row];
        if (sw <= 0 || sh <= 0 || tw <= 0 || th <= 0) continue;
        ctx.drawImage(
          texture,
          sourceOffsetsX[col],
          sourceOffsetsY[row],
          sw,
          sh,
          targetOffsetsX[col],
          targetOffsetsY[row],
          tw,
          th,
        );
      }
    }

    setFrame((current) => ({
      src: canvas.toDataURL('image/png'),
      revision: current.revision + 1,
    }));
  }, [t, r, b, l, texW, texH]);

  // 加载纹理图片
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      textureRef.current = img;
      renderFrame();
    };
    img.src = src;
    return () => {
      img.onload = null;
    };
  }, [src, renderFrame]);

  // 监听容器尺寸变化，重新渲染
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    // 低版本浏览器可能不支持 ResizeObserver，降级为 window resize
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => renderFrame());
      ro.observe(wrap);
      return () => ro.disconnect();
    }

    const onResize = () => renderFrame();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [renderFrame]);

  useEffect(() => {
    const redrawAfterForeground = () => {
      if (document.visibilityState !== 'hidden') renderFrame();
    };

    document.addEventListener('visibilitychange', redrawAfterForeground);
    window.addEventListener('pageshow', redrawAfterForeground);
    return () => {
      document.removeEventListener('visibilitychange', redrawAfterForeground);
      window.removeEventListener('pageshow', redrawAfterForeground);
    };
  }, [renderFrame]);

  const wrapStyle: CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    minWidth,
    padding: `${t}px ${r}px ${b}px ${l}px`,
    ...style,
  };
  if (!src || !children) return <div></div>; // src 为空时不渲染任何内容
  return (
    <div ref={wrapRef} className={className} style={wrapStyle}>
      {/* 九宫格背景帧 */}
      {frame.src && (
        <img
          key={frame.revision}
          src={frame.src}
          alt=""
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            objectFit: 'fill',
            pointerEvents: 'none',
          }}
        />
      )}
      {/* 内容层 */}
      <TitleBox style={{ position: 'relative', zIndex: 1 }}>{children}</TitleBox>
    </div>
  );
};

export function StageTitle({ src, scale = 1, children }: StageTitleProps) {
  return (
    <div
      data-stage-title="true"
      style={{
        position: 'absolute',
        left: STAGE_TITLE_LEFT,
        top: STAGE_TITLE_TOP,
        transform: `scale(${STAGE_TITLE_BASE_SCALE * scale})`,
        transformOrigin: 'left top',
        overflow: 'visible',
      }}
    >
      <NineSliceTitleImage
        src={src}
        minWidth={STAGE_TITLE_MIN_WIDTH}
        style={{ paddingRight: STAGE_TITLE_PADDING_RIGHT }}
      >
        {children}
      </NineSliceTitleImage>
    </div>
  );
}

export default NineSliceTitleImage;
