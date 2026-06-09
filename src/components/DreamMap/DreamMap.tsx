import { useRef, useEffect, useMemo, useState } from 'react';
import { Map, Network, SearchX } from 'lucide-react';
import { DreamNode } from './DreamNode';
import { RelationLines } from './RelationLines';
import { useDreamStore, filterLocations } from '@/store/dreamStore';
import { buildDreamClusters } from '@/utils/clustering';
import { hexToRgba } from '@/utils/storage';

type MapViewMode = 'map' | 'cluster';

export function DreamMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<MapViewMode>('map');
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
  const isClusterView = viewMode === 'cluster';

  const clusterResult = useMemo(
    () => buildDreamClusters(filteredLocations),
    [filteredLocations]
  );

  const visibleLocations = isClusterView ? clusterResult.locations : filteredLocations;

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

  const handleMapClick = () => {
    selectLocation(null);
    selectRelation(null);
  };

  return (
    <div
      ref={mapRef}
      className="relative w-full h-full"
      onClick={handleMapClick}
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

      {locations.length > 0 && (
        <div className="absolute top-24 left-1/2 z-40 flex -translate-x-1/2 items-center rounded-xl bg-[#120f24]/75 border border-purple-300/20 p-1 backdrop-blur-md shadow-lg shadow-purple-950/20 md:top-28">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setViewMode('map');
            }}
            className={`flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-all ${
              !isClusterView
                ? 'bg-purple-400/20 text-white shadow-inner shadow-white/5'
                : 'text-purple-200/65 hover:text-purple-100 hover:bg-white/5'
            }`}
            title="普通地图"
            aria-pressed={!isClusterView}
          >
            <Map size={15} />
            <span className="hidden sm:inline">普通地图</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setViewMode('cluster');
            }}
            className={`flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-all ${
              isClusterView
                ? 'bg-purple-400/20 text-white shadow-inner shadow-white/5'
                : 'text-purple-200/65 hover:text-purple-100 hover:bg-white/5'
            }`}
            title="聚类视图"
            aria-pressed={isClusterView}
          >
            <Network size={15} />
            <span className="hidden sm:inline">聚类视图</span>
          </button>
        </div>
      )}

      {isClusterView && hasResults && (
        <div className="absolute inset-0 pointer-events-none z-[5]">
          {clusterResult.clusters.map((cluster) => (
            <div
              key={cluster.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed"
              style={{
                left: `${cluster.centerX}%`,
                top: `${cluster.centerY}%`,
                width: `${Math.max(150, 92 + cluster.locationIds.length * 18)}px`,
                height: `${Math.max(150, 92 + cluster.locationIds.length * 18)}px`,
                borderColor: hexToRgba(cluster.color, 0.35),
                background: `radial-gradient(circle, ${hexToRgba(cluster.color, 0.12)} 0%, ${hexToRgba(cluster.color, 0.04)} 45%, transparent 72%)`,
              }}
            >
              <div
                className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium"
                style={{
                  color: cluster.color,
                  backgroundColor: hexToRgba('#100d22', 0.82),
                  border: `1px solid ${hexToRgba(cluster.color, 0.28)}`,
                }}
              >
                {cluster.name}
              </div>
              <div className="absolute left-1/2 top-8 -translate-x-1/2 max-w-32 text-center text-[10px] leading-4 text-purple-100/45">
                {cluster.keywords.join(' / ')}
              </div>
            </div>
          ))}
        </div>
      )}

      <RelationLines locations={visibleLocations} />

      {visibleLocations.map((location) => (
        <DreamNode key={location.id} location={location} draggable={!isClusterView} />
      ))}
    </div>
  );
}
