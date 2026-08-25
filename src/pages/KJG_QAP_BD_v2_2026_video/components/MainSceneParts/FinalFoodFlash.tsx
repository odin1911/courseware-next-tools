import { getRasterAsset } from '../../rasterAssets';
import RasterAnimationPlayer from '../raster-animation/RasterAnimationPlayer';

const FLASH_ASSET = getRasterAsset('BD_flash');
const FLASH_VIEWPORT_WIDTH = 562;
const FLASH_VIEWPORT_HEIGHT = 556;

export default function FinalFoodFlash() {
  const fitScale = Math.min(
    FLASH_VIEWPORT_WIDTH / FLASH_ASSET.manifest.canvas.width,
    FLASH_VIEWPORT_HEIGHT / FLASH_ASSET.manifest.canvas.height,
    1,
  );

  return (
    <RasterAnimationPlayer
      manifest={FLASH_ASSET.manifest}
      files={FLASH_ASSET.files}
      action="start"
      loop
      style={{
        left:
          -201 + (FLASH_VIEWPORT_WIDTH - FLASH_ASSET.manifest.canvas.width * fitScale) / 2,
        top:
          -238 + (FLASH_VIEWPORT_HEIGHT - FLASH_ASSET.manifest.canvas.height * fitScale) / 2,
        transform: `scale(${fitScale})`,
        transformOrigin: 'top left',
      }}
    />
  );
}
