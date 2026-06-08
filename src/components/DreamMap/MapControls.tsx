import { Maximize2, Minus, Plus, RotateCcw } from 'lucide-react';

interface MapControlsProps {
  scale: number;
  minScale: number;
  maxScale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFitAll: () => void;
}

export function MapControls({
  scale,
  minScale,
  maxScale,
  onZoomIn,
  onZoomOut,
  onReset,
  onFitAll,
}: MapControlsProps) {
  const zoomPercent = Math.round(scale * 100);
  const canZoomIn = scale < maxScale;
  const canZoomOut = scale > minScale;

  const buttonClass =
    'w-9 h-9 flex items-center justify-center rounded-lg text-purple-100/80 bg-[#15152f]/80 border border-purple-300/20 shadow-lg shadow-black/20 backdrop-blur-md transition-all hover:text-white hover:bg-purple-500/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#15152f]/80';

  return (
    <div
      className="absolute right-4 bottom-4 z-30 flex items-center gap-2 rounded-xl border border-purple-300/20 bg-[#101028]/80 p-2 shadow-xl shadow-black/30 backdrop-blur-md"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={buttonClass}
        onClick={onZoomOut}
        disabled={!canZoomOut}
        aria-label="缩小地图"
        title="缩小地图"
      >
        <Minus size={18} />
      </button>

      <div className="min-w-14 px-2 text-center text-xs font-medium tabular-nums text-purple-100/80">
        {zoomPercent}%
      </div>

      <button
        type="button"
        className={buttonClass}
        onClick={onZoomIn}
        disabled={!canZoomIn}
        aria-label="放大地图"
        title="放大地图"
      >
        <Plus size={18} />
      </button>

      <div className="mx-1 h-6 w-px bg-purple-300/20" />

      <button
        type="button"
        className={buttonClass}
        onClick={onReset}
        aria-label="重置视角"
        title="重置视角"
      >
        <RotateCcw size={17} />
      </button>

      <button
        type="button"
        className={buttonClass}
        onClick={onFitAll}
        aria-label="适配所有节点"
        title="适配所有节点"
      >
        <Maximize2 size={17} />
      </button>
    </div>
  );
}
