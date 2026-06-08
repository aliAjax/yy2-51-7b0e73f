import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Play, SearchX } from 'lucide-react';
import { DreamNode } from './DreamNode';
import { DreamPlayback } from './DreamPlayback';
import { RelationLines } from './RelationLines';
import { useDreamStore, filterLocations } from '@/store/dreamStore';
import { FREQUENCY_OPTIONS } from '@/types';
import type { PlaybackSortMode } from './DreamPlayback';

interface PlaybackSelectionSnapshot {
  locationId: string | null;
  relationId: string | null;
}

const frequencyRank = new Map(FREQUENCY_OPTIONS.map((frequency, index) => [frequency, index]));

function sortPlaybackLocations(
  locations: ReturnType<typeof filterLocations>,
  mode: PlaybackSortMode
) {
  return [...locations].sort((a, b) => {
    if (mode === 'frequency') {
      const rankDiff =
        (frequencyRank.get(b.frequency as (typeof FREQUENCY_OPTIONS)[number]) ?? -1) -
        (frequencyRank.get(a.frequency as (typeof FREQUENCY_OPTIONS)[number]) ?? -1);
      if (rankDiff !== 0) return rankDiff;
    }

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function DreamMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const locations = useDreamStore((state) => state.locations);
  const filters = useDreamStore((state) => state.filters);
  const clearFilters = useDreamStore((state) => state.clearFilters);
  const selectLocation = useDreamStore((state) => state.selectLocation);
  const selectedLocationId = useDreamStore((state) => state.selectedLocationId);
  const selectedRelationId = useDreamStore((state) => state.selectedRelationId);
  const selectRelation = useDreamStore((state) => state.selectRelation);
  const [isPlaybackMode, setIsPlaybackMode] = useState(false);
  const [isPlaybackPaused, setIsPlaybackPaused] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [sortMode, setSortMode] = useState<PlaybackSortMode>('createdAt');
  const selectionSnapshotRef = useRef<PlaybackSelectionSnapshot | null>(null);

  const filteredLocations = useMemo(
    () => filterLocations(locations, filters),
    [locations, filters]
  );

  const hasActiveFilters = !!filters.searchText.trim() || !!filters.frequency || filters.selectedTags.length > 0;
  const hasResults = filteredLocations.length > 0;

  const playbackLocations = useMemo(() => {
    return sortPlaybackLocations(filteredLocations, sortMode);
  }, [filteredLocations, sortMode]);

  const currentPlaybackLocation = playbackLocations[playbackIndex] || null;

  const stopPlayback = useCallback(() => {
    const snapshot = selectionSnapshotRef.current;
    setIsPlaybackMode(false);
    setIsPlaybackPaused(false);
    selectionSnapshotRef.current = null;
    selectLocation(snapshot?.locationId ?? null);
    selectRelation(snapshot?.relationId ?? null);
  }, [selectLocation, selectRelation]);

  const startPlayback = () => {
    if (playbackLocations.length === 0) return;

    selectionSnapshotRef.current = {
      locationId: selectedLocationId,
      relationId: selectedRelationId,
    };
    setPlaybackIndex(0);
    setIsPlaybackPaused(false);
    setIsPlaybackMode(true);
    selectRelation(null);
    selectLocation(playbackLocations[0].id);
  };

  const goToPrevious = useCallback(() => {
    setPlaybackIndex((index) => Math.max(0, index - 1));
  }, []);

  const goToNext = useCallback(() => {
    setPlaybackIndex((index) => Math.min(playbackLocations.length - 1, index + 1));
  }, [playbackLocations.length]);

  const handleSortModeChange = (mode: PlaybackSortMode) => {
    if (mode === sortMode) return;

    const currentId = currentPlaybackLocation?.id;
    setSortMode(mode);

    if (!currentId) {
      setPlaybackIndex(0);
      return;
    }

    const nextOrder = sortPlaybackLocations(filteredLocations, mode);
    setPlaybackIndex(Math.max(0, nextOrder.findIndex((location) => location.id === currentId)));
  };

  useEffect(() => {
    if (!isPlaybackMode) return;

    if (playbackLocations.length === 0) {
      stopPlayback();
      return;
    }

    if (playbackIndex >= playbackLocations.length) {
      setPlaybackIndex(playbackLocations.length - 1);
    }
  }, [isPlaybackMode, playbackIndex, playbackLocations.length, stopPlayback]);

  useEffect(() => {
    if (!isPlaybackMode || !currentPlaybackLocation) return;

    selectRelation(null);
    selectLocation(currentPlaybackLocation.id);
  }, [currentPlaybackLocation, isPlaybackMode, selectLocation, selectRelation]);

  useEffect(() => {
    if (!isPlaybackMode || isPlaybackPaused || playbackLocations.length <= 1) return;
    if (playbackIndex >= playbackLocations.length - 1) return;

    const timer = window.setTimeout(() => {
      setPlaybackIndex((index) => Math.min(playbackLocations.length - 1, index + 1));
    }, 4800);

    return () => window.clearTimeout(timer);
  }, [isPlaybackMode, isPlaybackPaused, playbackIndex, playbackLocations.length]);

  useEffect(() => {
    if (!isPlaybackMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        stopPlayback();
      }

      if (event.key === ' ') {
        event.preventDefault();
        setIsPlaybackPaused((paused) => !paused);
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPrevious();
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious, isPlaybackMode, stopPlayback]);

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

  const handleMapClick = () => {
    if (isPlaybackMode) return;
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

      <RelationLines locations={filteredLocations} />

      {filteredLocations.map((location) => (
        <DreamNode key={location.id} location={location} isPlaybackMode={isPlaybackMode} />
      ))}

      {hasResults && !isPlaybackMode && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            startPlayback();
          }}
          className="absolute right-4 bottom-4 md:right-6 md:bottom-6 z-30 inline-flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-white border border-purple-300/30 bg-white/10 hover:bg-white/15 backdrop-blur-md transition-all"
          title="梦境回顾"
        >
          <Play size={17} />
          <span>梦境回顾</span>
        </button>
      )}

      {isPlaybackMode && currentPlaybackLocation && (
        <DreamPlayback
          currentLocation={currentPlaybackLocation}
          currentIndex={playbackIndex}
          totalCount={playbackLocations.length}
          isPaused={isPlaybackPaused}
          sortMode={sortMode}
          onTogglePause={() => setIsPlaybackPaused((paused) => !paused)}
          onPrevious={goToPrevious}
          onNext={goToNext}
          onExit={stopPlayback}
          onSortModeChange={handleSortModeChange}
        />
      )}
    </div>
  );
}
