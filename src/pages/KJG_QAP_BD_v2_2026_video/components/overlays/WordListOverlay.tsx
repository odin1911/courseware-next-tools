import { useMemo, useState } from 'react';
import {
  WordListOverlay as SharedWordListOverlay,
  type SharedWordListEntry,
} from '@/shared/components/result-chain-overlays';
import type { BDWordItem } from '../../sceneTypes';
import { BD_DRAGONBONES_ARMATURE } from '../../logic/runtime';

export interface WordListOverlayProps {
  entries: BDWordItem[];
  onHome(): void;
  onReset(): void;
}

export default function WordListOverlay({ entries, onHome, onReset }: WordListOverlayProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const wordListEntries = useMemo<SharedWordListEntry[]>(() => {
    return entries.map((entry, index) => ({
      id: `${entry.word}-${index}`,
      text: entry.word,
      audioUrl: entry.audioUrl,
      resource: {
        imageUrl: entry.imageUrl,
        skeletonUrl: entry.skeletonUrl,
        animationType: entry.animationType,
      },
    }));
  }, [entries, pageIndex]);

  return (
    <div
      data-overlay="word-list-pop"
      style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 30 }}
    >
      <SharedWordListOverlay
        entries={wordListEntries}
        pageIndex={pageIndex}
        onPageChange={setPageIndex}
        onHome={onHome}
        onReset={onReset}
        previewArmature={BD_DRAGONBONES_ARMATURE}
        overlayTestId="bdv2-word-list-overlay"
      />
    </div>
  );
}
