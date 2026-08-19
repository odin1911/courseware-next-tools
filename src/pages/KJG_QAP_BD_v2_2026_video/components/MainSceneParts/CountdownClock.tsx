import AtlasSprite from '@/shared/components/atlas-sprite';
import atlasData from '../../assets/textures/KJG_QAP_BD_v2.json';

const ATLAS_URL = new URL('../../assets/textures/KJG_QAP_BD_v2.png', import.meta.url).href;

export interface CountdownClockProps {
  totalMs: number;
  remainingMs: number;
  warning: boolean;
  left: number;
  top: number;
  size?: number;
  showDigits?: boolean;
}

const BASE_CLOCK_SIZE = 158;
const BASE_CLOCK_CENTER = BASE_CLOCK_SIZE / 2;
const BASE_CLOCK_RADIUS = 76;
const BASE_CLOCK_BG_OFFSET = 2;
const BASE_CLOCK_FONT_SIZE = 24;
const BASE_CLOCK_FONT_TOP = 58;
const BASE_CLOCK_STROKE_WIDTH = 6;

function getArcColor(elapsedRatio: number): string {
  if (elapsedRatio < 0.5) {
    const r = Math.round(elapsedRatio * 2 * 255);
    return `rgb(${r}, 255, 0)`;
  }
  const g = Math.round((1 - elapsedRatio) * 2 * 255);
  return `rgb(255, ${g}, 0)`;
}

export default function CountdownClock({
  totalMs,
  remainingMs,
  warning,
  left,
  top,
  size = BASE_CLOCK_SIZE,
  showDigits = true,
}: CountdownClockProps) {
  const ratio = totalMs <= 0 ? 0 : Math.max(0, Math.min(1, remainingMs / totalMs));
  const elapsedRatio = 1 - ratio;
  const arcColor = getArcColor(elapsedRatio);
  const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
  const scale = size / BASE_CLOCK_SIZE;
  const arcCircumference = 2 * Math.PI * BASE_CLOCK_RADIUS;
  const arcDashLength = arcCircumference * elapsedRatio;

  return (
    <div
      data-role="wait-circle"
      data-render-mode="svg-arc"
      data-asset-source="atlas"
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: BASE_CLOCK_SIZE,
          height: BASE_CLOCK_SIZE,
          transform: `scale(${scale})`,
          transformOrigin: 'left top',
        }}
      >
        {/* AtlasSprite 不能直接改宽高，否则会把 background atlas 裁坏，所以整块按基准尺寸缩放 */}
        <AtlasSprite
          atlasUrl={ATLAS_URL}
          atlasData={atlasData}
          frameName="KJG_QAP_BD_v2_circle_bg"
          style={{
            position: 'absolute',
            left: BASE_CLOCK_BG_OFFSET,
            top: BASE_CLOCK_BG_OFFSET,
          }}
        />
        <AtlasSprite
          atlasUrl={ATLAS_URL}
          atlasData={atlasData}
          frameName="KJG_QAP_BD_v2_circle_img_white"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
          }}
        />
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${BASE_CLOCK_SIZE} ${BASE_CLOCK_SIZE}`}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: BASE_CLOCK_SIZE,
            height: BASE_CLOCK_SIZE,
          }}
        >
          <circle
            cx={BASE_CLOCK_CENTER}
            cy={BASE_CLOCK_CENTER}
            r={BASE_CLOCK_RADIUS}
            fill="none"
            stroke={arcColor}
            strokeWidth={BASE_CLOCK_STROKE_WIDTH}
            strokeDasharray={`${arcDashLength} ${arcCircumference}`}
            transform={`rotate(-90 ${BASE_CLOCK_CENTER} ${BASE_CLOCK_CENTER})`}
          />
        </svg>
        {showDigits ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: BASE_CLOCK_FONT_TOP,
              width: BASE_CLOCK_SIZE,
              textAlign: 'center',
              fontSize: BASE_CLOCK_FONT_SIZE,
              fontWeight: 700,
              color: warning ? '#ffe7e4' : '#4a2917',
            }}
          >
            {seconds}
          </div>
        ) : null}
      </div>
    </div>
  );
}
