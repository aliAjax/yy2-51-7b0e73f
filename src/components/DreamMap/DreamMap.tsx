import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { SearchX } from 'lucide-react';
import { DreamNode } from './DreamNode';
import { MapControls } from './MapControls';
import { RelationLines } from './RelationLines';
import { useDreamStore, filterLocations } from '@/store/dreamStore';

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const ZOOM_STEP = 0.2;
const FIT_PADDING = 80;

function clampScale(scale: number) {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
}

export function DreamMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<{ x: number; y: number; translateX: number; translateY: number } | null>(null);
  const isPanningRef = useRef(false);
  const [viewTransform, setViewTransform] = useState({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });
  const [isPanning, setIsPanning] = useState(false);
  const locations = useDreamStore((state) => state.locations);
  const filters = useDreamStore((state) => state.filters);
  const clearFilters = useDreamStore((state) => state.clearFilters);
  const selectLocation = useDreamStore((state) => state.selectLocation);

  const filteredLocations = useMemo(
    () => filterLocations(locations, filters),
    [locations, filters]
  );

  const hasActiveFilters = !!filters.searchText.trim() || !!filters.frequency || filters.selectedTags.length > 0;
  const hasResults = filteredLocations.length > 0;

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const container = mapRef.current;
    if (!container) return;

    container.style.position = 'relative';
    container.style.overflow = 'hidden';

    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '0';

    container.insertBefore(canvas, container.firstChild);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const stars: { x: number; y: number; size: number; opacity: number; speed: number }[] = [];
    const starCount = 100;

    function resize() {
      if (!container || !canvas) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;

      stars.length = 0;
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.8 + 0.2,
          speed: Math.random() * 0.0005 + 0.0002,
        });
      }
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star) => {
        const twinkle = Math.sin(Date.now() * star.speed) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 180, 255, ${star.opacity * twinkle})`;
        ctx.fill();

        if (star.size > 1.5) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 180, 255, ${star.opacity * twinkle * 0.1})`;
          ctx.fill();
        }
      });

      animationId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      canvas.remove();
    };
  }, []);

  const selectRelation = useDreamStore((state) => state.selectRelation);

  const zoomAtPoint = useCallback((nextScale: number, pointX?: number, pointY?: number) => {
    const container = mapRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const focalX = pointX ?? rect.width / 2;
    const focalY = pointY ?? rect.height / 2;

    setViewTransform((current) => {
      const scale = clampScale(nextScale);
      const scaleRatio = scale / current.scale;

      return {
        scale,
        translateX: focalX - (focalX - current.translateX) * scaleRatio,
        translateY: focalY - (focalY - current.translateY) * scaleRatio,
      };
    });
  }, []);

  const handleZoomIn = useCallback(() => {
    zoomAtPoint(viewTransform.scale + ZOOM_STEP);
  }, [viewTransform.scale, zoomAtPoint]);

  const handleZoomOut = useCallback(() => {
    zoomAtPoint(viewTransform.scale - ZOOM_STEP);
  }, [viewTransform.scale, zoomAtPoint]);

  const handleResetView = useCallback(() => {
    setViewTransform({
      scale: 1,
      translateX: 0,
      translateY: 0,
    });
  }, []);

  const handleFitAll = useCallback(() => {
    const container = mapRef.current;
    if (!container || filteredLocations.length === 0) {
      handleResetView();
      return;
    }

    const rect = container.getBoundingClientRect();
    const minX = Math.min(...filteredLocations.map((location) => location.positionX));
    const maxX = Math.max(...filteredLocations.map((location) => location.positionX));
    const minY = Math.min(...filteredLocations.map((location) => location.positionY));
    const maxY = Math.max(...filteredLocations.map((location) => location.positionY));
    const contentMinX = (minX / 100) * rect.width;
    const contentMaxX = (maxX / 100) * rect.width;
    const contentMinY = (minY / 100) * rect.height;
    const contentMaxY = (maxY / 100) * rect.height;
    const contentWidth = Math.max(contentMaxX - contentMinX, 1);
    const contentHeight = Math.max(contentMaxY - contentMinY, 1);
    const availableWidth = Math.max(rect.width - FIT_PADDING * 2, rect.width * 0.4);
    const availableHeight = Math.max(rect.height - FIT_PADDING * 2, rect.height * 0.4);
    const scale = clampScale(Math.min(availableWidth / contentWidth, availableHeight / contentHeight));

    setViewTransform({
      scale,
      translateX: (rect.width - contentWidth * scale) / 2 - contentMinX * scale,
      translateY: (rect.height - contentHeight * scale) / 2 - contentMinY * scale,
    });
  }, [filteredLocations, handleResetView]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const direction = e.deltaY > 0 ? -1 : 1;
    const nextScale = viewTransform.scale + direction * ZOOM_STEP;
    zoomAtPoint(nextScale, e.clientX - rect.left, e.clientY - rect.top);
  }, [viewTransform.scale, zoomAtPoint]);

  const handleMapMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;

    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      translateX: viewTransform.translateX,
      translateY: viewTransform.translateY,
    };
    isPanningRef.current = false;
  }, [viewTransform.translateX, viewTransform.translateY]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const start = panStartRef.current;
      if (!start) return;

      const deltaX = e.clientX - start.x;
      const deltaY = e.clientY - start.y;
      if (!isPanningRef.current && Math.hypot(deltaX, deltaY) < 4) return;

      isPanningRef.current = true;
      setIsPanning(true);
      setViewTransform((current) => ({
        ...current,
        translateX: start.translateX + deltaX,
        translateY: start.translateY + deltaY,
      }));
    };

    const handleMouseUp = () => {
      panStartRef.current = null;
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMapClick = () => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    selectLocation(null);
    selectRelation(null);
  };

  return (
    <div
      ref={mapRef}
      className={`relative w-full h-full ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      onClick={handleMapClick}
      onMouseDown={handleMapMouseDown}
      onWheel={handleWheel}
      style={{
        background: 'radial-gradient(ellipse at center, #1a1a3e 0%, #0d0d1f 50%, #050510 100%)',
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(100, 50, 150, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(50, 100, 150, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(150, 100, 200, 0.05) 0%, transparent 70%)
          `,
        }}
      />

      <div className="absolute inset-0 pointer-events-none opacity-30">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dreamGrid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path
                d="M 60 0 L 0 0 0 60"
                fill="none"
                stroke="rgba(150, 130, 200, 0.1)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dreamGrid)" />
        </svg>
      </div>

      {locations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center text-purple-200/50">
            <p className="text-lg md:text-xl font-serif italic mb-2">梦境地图尚为空白</p>
            <p className="text-sm opacity-70">点击上方按钮，记录你的第一个梦境地点</p>
          </div>
        </div>
      )}

      {locations.length > 0 && !hasResults && hasActiveFilters && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center text-purple-200/50 animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-purple-500/10 border border-purple-400/20">
              <SearchX size={28} className="text-purple-300/60" />
            </div>
            <p className="text-lg md:text-xl font-serif italic mb-2">未找到匹配的梦境</p>
            <p className="text-sm opacity-70 mb-4">没有符合当前筛选条件的地点</p>
            <button
              onClick={clearFilters}
              className="px-5 py-2 rounded-lg text-sm text-purple-200/80 bg-white/5 border border-purple-300/20 hover:text-purple-100 hover:bg-white/10 transition-all"
            >
              清空筛选条件
            </button>
          </div>
        </div>
      )}

      <div
        className="absolute inset-0 z-10"
        style={{
          transform: `translate(${viewTransform.translateX}px, ${viewTransform.translateY}px) scale(${viewTransform.scale})`,
          transformOrigin: '0 0',
        }}
      >
        <RelationLines locations={filteredLocations} />

        {filteredLocations.map((location) => (
          <DreamNode key={location.id} location={location} />
        ))}
      </div>

      <MapControls
        scale={viewTransform.scale}
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleResetView}
        onFitAll={handleFitAll}
      />
    </div>
  );
}
