import { useMemo, useState } from 'react';
import { useDreamStore } from '@/store/dreamStore';
import { RELATION_TYPE_COLORS } from '@/types';
import { hexToRgba } from '@/utils/storage';
import type { DreamRelation, DreamLocation } from '@/types';

interface RelationLinesProps {
  locations: DreamLocation[];
}

export function RelationLines({ locations }: RelationLinesProps) {
  const relations = useDreamStore((state) => state.relations);
  const selectedLocationId = useDreamStore((state) => state.selectedLocationId);
  const selectedRelationId = useDreamStore((state) => state.selectedRelationId);
  const selectRelation = useDreamStore((state) => state.selectRelation);
  const selectLocation = useDreamStore((state) => state.selectLocation);
  const openRelationForm = useDreamStore((state) => state.openRelationForm);
  const isExploreMode = useDreamStore((state) => state.isExploreMode);
  const exploreCenterId = useDreamStore((state) => state.exploreCenterId);
  const visibleRelationTypes = useDreamStore((state) => state.visibleRelationTypes);
  const selectedRelationTypes = useDreamStore((state) => state.filters.selectedRelationTypes);

  const [hoveredRelationId, setHoveredRelationId] = useState<string | null>(null);

  const locationMap = useMemo(() => {
    const map = new Map<string, DreamLocation>();
    locations.forEach((loc) => map.set(loc.id, loc));
    return map;
  }, [locations]);

  const visibleRelations = useMemo(() => {
    return relations.filter((rel) => {
      if (!locationMap.has(rel.fromId) || !locationMap.has(rel.toId)) {
        return false;
      }
      if (isExploreMode && !visibleRelationTypes.includes(rel.type)) {
        return false;
      }
      if (!isExploreMode && selectedRelationTypes.length > 0 && !selectedRelationTypes.includes(rel.type)) {
        return false;
      }
      return true;
    });
  }, [relations, locationMap, isExploreMode, visibleRelationTypes, selectedRelationTypes]);

  const relatedRelationIds = useMemo(() => {
    const locationId = selectedLocationId;
    if (!locationId) return new Set();
    const related = new Set<string>();
    visibleRelations.forEach((rel) => {
      if (rel.fromId === locationId || rel.toId === locationId) {
        related.add(rel.id);
      }
    });
    return related;
  }, [selectedLocationId, visibleRelations]);

  const generateCurvePath = (
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): { path: string; midPoint: { x: number; y: number } } => {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const curvature = distance * 0.2;

    const normalX = -dy / distance;
    const normalY = dx / distance;

    const ctrlX = midX + normalX * curvature;
    const ctrlY = midY + normalY * curvature;

    const t = 0.5;
    const mt = 1 - t;
    const labelX = mt * mt * x1 + 2 * mt * t * ctrlX + t * t * x2;
    const labelY = mt * mt * y1 + 2 * mt * t * ctrlY + t * t * y2;

    return {
      path: `M ${x1} ${y1} Q ${ctrlX} ${ctrlY} ${x2} ${y2}`,
      midPoint: { x: labelX, y: labelY },
    };
  };

  const handleLineClick = (e: React.MouseEvent, relation: DreamRelation) => {
    e.stopPropagation();
    selectRelation(relation.id);
    selectLocation(null);
  };

  const handleLineDoubleClick = (e: React.MouseEvent, relation: DreamRelation) => {
    e.stopPropagation();
    openRelationForm(relation);
  };

  const isRelationHighlighted = (rel: DreamRelation): boolean => {
    if (selectedRelationId === rel.id) return true;
    if (hoveredRelationId === rel.id) return true;
    if (selectedLocationId && relatedRelationIds.has(rel.id)) return true;
    if (isExploreMode && exploreCenterId) {
      if (rel.fromId === exploreCenterId || rel.toId === exploreCenterId) {
        return true;
      }
    }
    return false;
  };

  const isRelationDimmed = (rel: DreamRelation): boolean => {
    if (selectedRelationId || selectedLocationId) {
      return !isRelationHighlighted(rel);
    }
    if (isExploreMode && exploreCenterId) {
      return !isRelationHighlighted(rel);
    }
    return false;
  };

  if (visibleRelations.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-5"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {visibleRelations.map((rel) => {
          return (
            <filter key={`glow-${rel.id}`} id={`glow-${rel.id}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          );
        })}
      </defs>

      {visibleRelations.map((rel) => {
        const fromLoc = locationMap.get(rel.fromId);
        const toLoc = locationMap.get(rel.toId);
        if (!fromLoc || !toLoc) return null;

        const color = RELATION_TYPE_COLORS[rel.type];
        const highlighted = isRelationHighlighted(rel);
        const dimmed = isRelationDimmed(rel);
        const hovered = hoveredRelationId === rel.id;

        const strokeWidth = highlighted ? 3 : 2;
        const opacity = dimmed ? 0.15 : highlighted ? 0.9 : 0.4;
        const labelVisible = highlighted || hovered;

        const { path, midPoint } = generateCurvePath(
          fromLoc.positionX,
          fromLoc.positionY,
          toLoc.positionX,
          toLoc.positionY
        );

        return (
          <g key={rel.id} className="relation-line-group">
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              style={{
                cursor: 'pointer',
                pointerEvents: 'stroke',
              }}
              className="pointer-events-auto"
              onClick={(e) => handleLineClick(e, rel)}
              onDoubleClick={(e) => handleLineDoubleClick(e, rel)}
              onMouseEnter={() => setHoveredRelationId(rel.id)}
              onMouseLeave={() => setHoveredRelationId(null)}
            />

            <path
              d={path}
              fill="none"
              stroke={hexToRgba(color, 0.15)}
              strokeWidth={strokeWidth + 6}
              strokeLinecap="round"
              style={{
                transition: 'all 0.3s ease',
                opacity: opacity * 0.5,
              }}
            />

            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              style={{
                transition: 'all 0.3s ease',
                opacity,
                filter: highlighted ? `drop-shadow(0 0 6px ${hexToRgba(color, 0.6)})` : 'none',
              }}
            />

            {highlighted && (
              <path
                d={path}
                fill="none"
                stroke="white"
                strokeWidth={1}
                strokeLinecap="round"
                strokeDasharray="5 5"
                style={{
                  opacity: 0.3,
                  animation: 'dash 20s linear infinite',
                }}
              />
            )}

            {labelVisible && (
              <g>
                <rect
                  x={midPoint.x}
                  y={midPoint.y - 10}
                  width={rel.type.length * 14 + 16}
                  height={20}
                  rx={10}
                  fill={hexToRgba('#1a1a35', 0.9)}
                  stroke={hexToRgba(color, 0.4)}
                  strokeWidth={1}
                  style={{
                    transform: `translate(${-rel.type.length * 7 - 8}px, 0)`,
                    backdropFilter: 'blur(4px)',
                  }}
                />
                <text
                  x={midPoint.x}
                  y={midPoint.y + 4}
                  textAnchor="middle"
                  fill={color}
                  fontSize={11}
                  fontWeight={500}
                  style={{
                    pointerEvents: 'none',
                  }}
                >
                  {rel.type}
                </text>
              </g>
            )}
          </g>
        );
      })}

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -100;
          }
        }
      `}</style>
    </svg>
  );
}
