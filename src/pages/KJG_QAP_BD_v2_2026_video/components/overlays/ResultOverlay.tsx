import RasterSuccessOverlay from './RasterSuccessOverlay';

export interface ResultOverlayProps {
  result: 'success' | 'fail';
  onConfirm(): void;
}

export default function ResultOverlay({ result, onConfirm }: ResultOverlayProps) {
  return (
    <div
      data-overlay="result-pop"
      data-result={result}
      style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 30 }}
    >
      <RasterSuccessOverlay result={result} onConfirm={onConfirm} />
    </div>
  );
}
