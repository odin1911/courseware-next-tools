import type { LeavingMaluState } from './mainSceneTypes';
import MaluCharacter from './MaluCharacter';
import type { MaluCharacterProps } from './MaluCharacter';

export interface MaluLayerProps {
  hasCurrentWord: boolean;
  leavingMalus: LeavingMaluState[];
  showCurrentMalu: boolean;
  currentMaluName: string;
  currentMaluAnimation: MaluCharacterProps['animationName'];
  focusX: number;
  entryToken: number;
  paused: boolean;
}

export default function MaluLayer({
  hasCurrentWord,
  leavingMalus,
  showCurrentMalu,
  currentMaluName,
  currentMaluAnimation,
  focusX,
  entryToken,
  paused,
}: MaluLayerProps) {
  if (!hasCurrentWord) {
    return null;
  }

  return (
    <>
      {leavingMalus.map((malu) => (
        <MaluCharacter
          key={`leaving-${malu.token}`}
          charName={malu.charName}
          animationName="enter"
          posX={malu.endX}
          startX={malu.startX}
          entryKey={malu.token}
          paused={paused}
          zIndex={0}
        />
      ))}
      {showCurrentMalu ? (
        <MaluCharacter
          key={`current-${currentMaluName}-${entryToken}`}
          charName={currentMaluName}
          animationName={currentMaluAnimation}
          posX={focusX}
          entryKey={entryToken}
          paused={paused}
          zIndex={1}
        />
      ) : null}
    </>
  );
}
