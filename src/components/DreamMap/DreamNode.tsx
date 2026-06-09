import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { DreamLocation } from '@/types';
import { useDreamStore } from '@/store/dreamStore';
import { hexToRgba, getContrastColor } from '@/utils/storage';

interface DreamNodeProps {
  location: DreamLocation;
}

export function DreamNode({ location }: DreamNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const selectLocation = useDreamStore((state) => state.selectLocation);
  const updatePosition = useDreamStore((state) => state.updatePosition);
  const selectedLocationId = useDreamStore((state) => state.selectedLocationId);
  const selectedRelationId = useDreamStore((state) => state.selectedRelationId);
  const isExploreMode = useDreamStore((state) => state.isExploreMode);
  const exploreCenterId = useDreamStore((state) => state.exploreCenterId);
  const getExploreDistance = useDreamStore((state) => state.getExploreDistance);
  const relations = useDreamStore((state) => state.relations);

  const isSelected = selectedLocationId === location.id;
  const exploreDistance = getExploreDistance(location.id);
  const isExploreCenter = isExploreMode && exploreCenterId === location.id;

  const isRelated = useMemo(() => {
    if (!selectedLocationId && !selectedRelationId) return false;
    if (selectedLocationId === location.id) return false;

    if (selectedLocationId) {
      return relations.some(
        (rel) =>
          (rel.fromId === selectedLocationId && rel.toId === location.id) ||
          (rel.toId === selectedLocationId && rel.fromId === location.id)
      );
    }

    if (selectedRelationId) {
      const rel = relations.find((r) => r.id === selectedRelationId);
      return rel && (rel.fromId === location.id || rel.toId === location.id);
    }

    return false;
  }, [selectedLocationId, selectedRelationId, relations, location.id]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = nodeRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2,
      });
      setIsDragging(true);
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const rect = nodeRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: touch.clientX - rect.left - rect.width / 2,
        y: touch.clientY - rect.top - rect.height / 2,
      });
      setIsDragging(true);
    }
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const mapContainer = nodeRef.current?.parentElement;
      if (!mapContainer) return;

      const mapRect = mapContainer.getBoundingClientRect();
      const x = ((e.clientX - mapRect.left - dragOffset.x) / mapRect.width) * 100;
      const y = ((e.clientY - mapRect.top - dragOffset.y) / mapRect.height) * 100;

      const clampedX = Math.max(5, Math.min(95, x));
      const clampedY = Math.max(5, Math.min(95, y));

      updatePosition(location.id, clampedX, clampedY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const mapContainer = nodeRef.current?.parentElement;
      if (!mapContainer) return;

      const mapRect = mapContainer.getBoundingClientRect();
      const x = ((touch.clientX - mapRect.left - dragOffset.x) / mapRect.width) * 100;
      const y = ((touch.clientY - mapRect.top - dragOffset.y) / mapRect.height) * 100;

      const clampedX = Math.max(5, Math.min(95, x));
      const clampedY = Math.max(5, Math.min(95, y));

      updatePosition(location.id, clampedX, clampedY);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, dragOffset, location.id, updatePosition]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging) {
      selectLocation(location.id);
    }
  };

  const textColor = getContrastColor(location.emotionColor);

  const hasSelection = selectedLocationId || selectedRelationId;
  const isDimmed = isExploreMode
    ? exploreDistance === null
    : hasSelection && !isSelected && !isRelated;

  return (
    <div
      ref={nodeRef}
      className={`absolute cursor-grab select-none transition-all duration-300 ${
        isDragging ? 'cursor-grabbing z-50 scale-110' : 'z-10 hover:scale-105'
      } ${isSelected ? 'z-20 scale-105' : ''} ${isRelated ? 'z-15 scale-102' : ''}`}
      style={{
        left: `${location.positionX}%`,
        top: `${location.positionY}%`,
        transform: 'translate(-50%, -50%)',
        animation: isSelected || isDragging || isExploreCenter ? 'none' : 'float 6s ease-in-out infinite',
        animationDelay: `${parseInt(location.id.slice(-2), 36) % 10 * 0.3}s`,
        opacity: isDimmed ? 0.3 : 1,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
    >
      <div
        className="relative group"
        style={{
          filter: `drop-shadow(0 0 ${isRelated || isSelected || isExploreCenter ? '28px' : '20px'} ${hexToRgba(location.emotionColor, isRelated || isSelected || isExploreCenter ? 0.85 : 0.6)}) drop-shadow(0 0 40px ${hexToRgba(location.emotionColor, isRelated || isSelected || isExploreCenter ? 0.55 : 0.3)})`,
        }}
      >
        <div
          className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-xs md:text-sm font-medium transition-all duration-300 ${
            isSelected ? 'ring-4 ring-white/30' : ''
          } ${isExploreCenter ? 'ring-4 ring-cyan-200/50' : ''
          } ${isRelated ? 'ring-2 ring-white/20' : ''}`}
          style={{
            backgroundColor: location.emotionColor,
            color: textColor,
            boxShadow: `inset 0 2px 10px ${hexToRgba('#ffffff', 0.3)}, inset 0 -2px 10px ${hexToRgba('#000000', 0.2)}`,
          }}
        >
          <span className="text-center leading-tight px-1 font-serif">
            {location.name.length > 4 ? location.name.slice(0, 4) + '...' : location.name}
          </span>
        </div>

        <div
          className="absolute inset-0 rounded-full animate-ping opacity-20"
          style={{ backgroundColor: location.emotionColor }}
        />

        {isExploreCenter && (
          <div className="absolute -inset-3 rounded-full border border-cyan-200/40 animate-pulse" />
        )}

        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{
            backgroundColor: 'rgba(26, 26, 46, 0.9)',
            color: '#fff',
            backdropFilter: 'blur(10px)',
          }}
        >
          {location.name}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid rgba(26, 26, 46, 0.9)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
