import AtlasSprite from '@/shared/components/atlas-sprite';
import atlasData from '../../assets/textures/KJG_QAP_BD_v2.json';

const ATLAS_URL = new URL('../../assets/textures/KJG_QAP_BD_v2.png', import.meta.url).href;

export interface ChooseFoodOverlayProps {
  options: [string, string];
  onChoose(frameName: string): void;
}

export default function ChooseFoodOverlay({ options, onChoose }: ChooseFoodOverlayProps) {
  return (
    <div
      data-role="choose-food-panel"
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 590,
        height: 304,
        transform: 'translate(-50%, -50%)',
        animation: 'bdv2ChooseFoodIn 200ms ease-out',
        zIndex: 18,
      }}
    >
      <AtlasSprite
        atlasUrl={ATLAS_URL}
        atlasData={atlasData}
        frameName="KJG_QAP_BD_v2_choose_food_bg"
      />
      {options.map((frameName, index) => {
        const centerX = index === 0 ? 196 : 395;

        return (
          <div
            key={frameName}
            style={{ position: 'absolute', left: centerX - 79, top: 74, width: 158, height: 190 }}
          >
            <div style={{ position: 'absolute', left: 0, top: 0, width: 158, height: 158 }}>
              <div
                style={{
                  position: 'absolute',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  left: 26,
                  top: 26,
                  width: 105,
                  height: 105,
                }}
              >
                <AtlasSprite atlasUrl={ATLAS_URL} atlasData={atlasData} frameName={frameName} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChoose(frameName)}
              style={{
                position: 'absolute',
                left: 0,
                top: 150,
                width: 158,
                height: 64,
                padding: 0,
                border: 'none',
                background: 'transparent',
              }}
            >
              <AtlasSprite
                atlasUrl={ATLAS_URL}
                atlasData={atlasData}
                frameName="KJG_QAP_BD_v2_btn_get"
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
