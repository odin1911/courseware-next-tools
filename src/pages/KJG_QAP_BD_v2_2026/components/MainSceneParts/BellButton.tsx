import AtlasSprite from '@/shared/components/atlas-sprite';
import atlasData from '../../assets/textures/KJG_QAP_BD_v2.json';

const ATLAS_URL = new URL('../../assets/textures/KJG_QAP_BD_v2.png', import.meta.url).href;

export interface BellButtonProps {
  enabled: boolean;
  frozen: boolean;
  onClick(): void;
}

export default function BellButton({ enabled, frozen, onClick }: BellButtonProps) {
  return (
    <button
      type="button"
      data-role="bell"
      disabled={!enabled || frozen}
      onClick={onClick}
      aria-label="提交当前答案"
      style={{
        position: 'absolute',
        left: 908,
        top: 699,
        width: 88,
        height: 61,
        padding: 0,
        border: 'none',
        background: 'transparent',
        opacity: enabled && !frozen ? 1 : 0.5,
        animation: enabled && !frozen ? 'bdv2BellShake 900ms ease-in-out infinite' : 'none',
        transformOrigin: '44px 30px',
        pointerEvents: 'auto',
        zIndex: 12,
      }}
    >
      <AtlasSprite atlasUrl={ATLAS_URL} atlasData={atlasData} frameName="KJG_QAP_BD_v2_bell" />
    </button>
  );
}
