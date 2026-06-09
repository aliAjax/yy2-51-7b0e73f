import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { DreamLocation } from '@/types';
import { useDreamStore } from '@/store/dreamStore';
import { hexToRgba, getContrastColor } from '@/utils/storage';

interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface DreamNodeProps {
  location: DreamLocation;
  viewTransform: ViewTransform;
  mapContainerRef: React.RefObject<HTMLDivElement>;
  isDraggable?: boolean;
}

export function DreamNode({ location, viewTransform, mapContainerRef, isDraggable = true }: DreamNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const selectLocation = useDreamStore((state) => state.selectLocation);
  const updatePosition = useDreamStore((state) => state.updatePosition);
  const selectedLocationId = useDreamStore((state) => state.selectedLocationId);
  const selectedRelationId = useDreamStore((state) => state.selectedRelationId);
  const relations = useDreamStore((state) => state.relations);

  const isSelected = selectedLocationId === location.id;

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
    if (!isDraggable) return;
    e.preventDefault();
    e.stopPropagation();
    const container = mapContainerRef.current;
    if (container) {
      container.dispatchEvent(new CustomEvent('dreamNodeDragStart'));
    }
    const rect = nodeRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2,
      });
      setIsDragging(true);
    }
  }, [isDraggable, mapContainerRef]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isDraggable) return;
    if (e.touches.length !== 1) {
      setIsDragging(false);
      return;
    }
    e.stopPropagation();
    const container = mapContainerRef.current;
    if (container) {
      container.dispatchEvent(new CustomEvent('dreamNodeDragStart'));
    }
    const touch = e.touches[0];
    const rect = nodeRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: touch.clientX - rect.left - rect.width / 2,
        y: touch.clientY - rect.top - rect.height / 2,
      });
      setIsDragging(true);
    }
  }, [isDraggable, mapContainerRef]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = mapContainerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const { scale, offsetX, offsetY } = viewTransform;

      const nodeCenterScreenX = e.clientX - dragOffset.x;
      const nodeCenterScreenY = e.clientY - dragOffset.y;

      const x = ((nodeCenterScreenX - containerRect.left - offsetX) / scale / containerRect.width) * 100;
      const y = ((nodeCenterScreenY - containerRect.top - offsetY) / scale / containerRect.height) * 100;

      const clampedX = Math.max(5, Math.min(95, x));
      const clampedY = Math.max(5, Math.min(95, y));

      updatePosition(location.id, clampedX, clampedY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        setIsDragging(false);
        return;
      }
      const touch = e.touches[0];
      const container = mapContainerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const { scale, offsetX, offsetY } = viewTransform;

      const nodeCenterScreenX = touch.clientX - dragOffset.x;
      const nodeCenterScreenY = touch.clientY - dragOffset.y;

      const x = ((nodeCenterScreenX - containerRect.left - offsetX) / scale / containerRect.width) * 100;
      const y = ((nodeCenterScreenY - containerRect.top - offsetY) / scale / containerRect.height) * 100;

      const clampedX = Math.max(5, Math.min(95, x));
      const clampedY = Math.max(5, Math.min(95, y));

      updatePosition(location.id, clampedX, clampedY);
    };

    const handleEnd = () => {
      const container = mapContainerRef.current;
      if (container) {
        container.dispatchEvent(new CustomEvent('dreamNodeDragEnd'));
      }
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
  }, [isDragging, dragOffset, location.id, updatePosition, viewTransform, mapContainerRef]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging) {
      selectLocation(location.id);
    }
  };

  const textColor = getContrastColor(location.emotionColor);

  const hasSelection = selectedLocationId || selectedRelationId;
  const isDimmed = hasSelection && !isSelected && !isRelated;

  return (
    <div
      ref={nodeRef}
      className={`dream-node absolute select-none transition-all duration-300 ${
        isDraggable
          ? isDragging
            ? 'cursor-grabbing z-50 scale-110'
            : 'cursor-grab z-10 hover:scale-105'
          : 'cursor-pointer z-10 hover:scale-105'
      } ${isSelected ? 'z-20 scale-105' : ''} ${isRelated ? 'z-15 scale-102' : ''}`}
      style={{
        left: `${location.positionX}%`,
        top: `${location.positionY}%`,
        transform: 'translate(-50%, -50%)',
        animation: isSelected || isDragging ? 'none' : 'float 6s ease-in-out infinite',
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
          filter: `drop-shadow(0 0 ${isRelated || isSelected ? '25px' : '20px'} ${hexToRgba(location.emotionColor, isRelated || isSelected ? 0.8 : 0.6)}) drop-shadow(0 0 40px ${hexToRgba(location.emotionColor, isRelated || isSelected ? 0.5 : 0.3)})`,
        }}
      >
        <div
          className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-xs md:text-sm font-medium transition-all duration-300 ${
            isSelected ? 'ring-4 ring-white/30' : ''
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
