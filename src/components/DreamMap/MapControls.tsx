import { ZoomIn, ZoomOut, Maximize2, Play, Grid3X3, Map, Home } from 'lucide-react';
import { hexToRgba } from '@/utils/storage';
import type { ViewMode } from '@/store/dreamStore';

interface MapControlsProps {
  scale: number;
  minScale: number;
  maxScale: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomChange: (scale: number) => void;
  onReset: () => void;
  onFitAll: () => void;
  onStartPlayback?: () => void;
  canPlayback?: boolean;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export function MapControls({
  scale,
  minScale,
  maxScale,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
  onZoomChange,
  onReset,
  onFitAll,
  onStartPlayback,
  canPlayback,
  viewMode = 'map',
  onViewModeChange,
}: MapControlsProps) {
  const scalePercentage = Math.round(scale * 100);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newScale = parseFloat(e.target.value);
    onZoomChange(newScale);
  };

  const buttonBaseClass =
    'w-10 h-10 rounded-lg flex items-center justify-center transition-all';
  const buttonActiveClass =
    'text-purple-200/70 hover:text-purple-100 hover:bg-white/10';
  const buttonDisabledClass =
    'text-purple-300/20 cursor-not-allowed';

  return (
    <div
      className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2"
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="flex flex-col gap-1 p-1 rounded-xl"
        style={{
          background: `linear-gradient(145deg, ${hexToRgba('#1e1e3f', 0.9)} 0%, ${hexToRgba('#0f0f2a', 0.95)} 100%)`,
          border: '1px solid rgba(150, 130, 200, 0.2)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onZoomIn}
          disabled={!canZoomIn}
          className={`${buttonBaseClass} ${canZoomIn ? buttonActiveClass : buttonDisabledClass}`}
          title="放大 (+)"
        >
          <ZoomIn size={18} />
        </button>

        <div className="px-2 py-1.5">
          <input
            type="range"
            min={minScale}
            max={maxScale}
            step={0.05}
            value={scale}
            onChange={handleSliderChange}
            className="w-24 h-1.5 appearance-none rounded-full cursor-pointer"
            style={{
              writingMode: 'vertical-lr',
              direction: 'rtl',
              width: '32px',
              height: '60px',
              background: `linear-gradient(to top, rgba(150, 100, 220, 0.6) 0%, rgba(150, 100, 220, 0.6) ${((scale - minScale) / (maxScale - minScale)) * 100}%, rgba(255, 255, 255, 0.1) ${((scale - minScale) / (maxScale - minScale)) * 100}%, rgba(255, 255, 255, 0.1) 100%)`,
              borderRadius: '4px',
              outline: 'none',
              WebkitAppearance: 'slider-vertical',
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <button
          onClick={onZoomOut}
          disabled={!canZoomOut}
          className={`${buttonBaseClass} ${canZoomOut ? buttonActiveClass : buttonDisabledClass}`}
          title="缩小 (-)"
        >
          <ZoomOut size={18} />
        </button>

        <div className="px-2 py-0.5">
          <div className="h-px bg-purple-300/10" />
        </div>

        <button
          onClick={onReset}
          className={`${buttonBaseClass} ${buttonActiveClass}`}
          title="回到全图 (R / 0)"
        >
          <Home size={18} />
        </button>

        <button
          onClick={onFitAll}
          className={`${buttonBaseClass} ${buttonActiveClass}`}
          title="适配所有节点 (F)"
        >
          <Maximize2 size={18} />
        </button>

        {onViewModeChange && (
          <>
            <div className="px-2 py-0.5">
              <div className="h-px bg-purple-300/10" />
            </div>

            <button
              onClick={() => onViewModeChange(viewMode === 'map' ? 'cluster' : 'map')}
              className={`${buttonBaseClass} ${buttonActiveClass} ${viewMode === 'cluster' ? 'bg-white/10' : ''}`}
              title={viewMode === 'map' ? '切换到聚类视图' : '切换到地图视图'}
            >
              {viewMode === 'map' ? <Grid3X3 size={18} /> : <Map size={18} />}
            </button>
          </>
        )}

        {onStartPlayback && (
          <>
            <div className="px-2 py-0.5">
              <div className="h-px bg-purple-300/10" />
            </div>

            <button
              onClick={onStartPlayback}
              disabled={!canPlayback}
              className={`${buttonBaseClass} ${canPlayback ? buttonActiveClass : buttonDisabledClass}`}
              title="梦境回顾播放"
            >
              <Play size={18} />
            </button>
          </>
        )}
      </div>

      <div
        className="text-center text-xs text-purple-300/50 font-mono py-1"
        style={{ pointerEvents: 'none' }}
      >
        {scalePercentage}%
      </div>
    </div>
  );
}
