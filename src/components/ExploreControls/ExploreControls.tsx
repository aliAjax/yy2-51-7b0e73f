import { Network, X } from 'lucide-react';
import { useDreamStore } from '@/store/dreamStore';
import { RELATION_TYPES, RELATION_TYPE_COLORS } from '@/types';
import { hexToRgba } from '@/utils/storage';
import type { ExploreDepth } from '@/store/dreamStore';

export function ExploreControls() {
  const isExploreMode = useDreamStore((state) => state.isExploreMode);
  const exploreCenterId = useDreamStore((state) => state.exploreCenterId);
  const exploreDepth = useDreamStore((state) => state.exploreDepth);
  const visibleRelationTypes = useDreamStore((state) => state.visibleRelationTypes);
  const locations = useDreamStore((state) => state.locations);
  const setExploreDepth = useDreamStore((state) => state.setExploreDepth);
  const toggleRelationTypeVisibility = useDreamStore((state) => state.toggleRelationTypeVisibility);
  const exitExploreMode = useDreamStore((state) => state.exitExploreMode);
  const getExploreLocations = useDreamStore((state) => state.getExploreLocations);

  if (!isExploreMode || !exploreCenterId) return null;

  const center = locations.find((loc) => loc.id === exploreCenterId);
  const exploreCount = getExploreLocations().length;

  return (
    <div className="absolute top-24 left-1/2 z-30 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2">
      <div
        className="rounded-lg border px-4 py-3 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(16, 22, 48, 0.94), rgba(32, 22, 58, 0.94))',
          borderColor: 'rgba(150, 130, 200, 0.28)',
          backdropFilter: 'blur(18px)',
        }}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-white">
              <Network size={16} className="text-cyan-200" />
              <p className="truncate text-sm font-medium">关系探索：{center?.name || '未知地点'}</p>
            </div>
            <p className="mt-1 text-xs text-purple-200/55">当前显示 {exploreCount} 个关联地点</p>
          </div>

          <div className="flex items-center gap-2">
            {([1, 2] as ExploreDepth[]).map((depth) => (
              <button
                key={depth}
                onClick={() => setExploreDepth(depth)}
                className={`h-8 rounded-md px-3 text-xs transition-all ${
                  exploreDepth === depth
                    ? 'bg-cyan-300/20 text-cyan-100 border border-cyan-200/40'
                    : 'bg-white/5 text-purple-200/70 border border-white/10 hover:bg-white/10'
                }`}
              >
                {depth === 1 ? '一度' : '二度'}
              </button>
            ))}
            <button
              onClick={exitExploreMode}
              className="h-8 w-8 rounded-md border border-white/10 bg-white/5 text-purple-200/70 transition-all hover:bg-white/10 hover:text-white"
              title="退出探索模式"
            >
              <X size={15} className="mx-auto" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {RELATION_TYPES.map((type) => {
            const active = visibleRelationTypes.includes(type);
            const color = RELATION_TYPE_COLORS[type];

            return (
              <button
                key={type}
                onClick={() => toggleRelationTypeVisibility(type)}
                className="flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs transition-all"
                style={{
                  color: active ? color : 'rgba(216, 200, 255, 0.42)',
                  backgroundColor: active ? hexToRgba(color, 0.14) : 'rgba(255, 255, 255, 0.04)',
                  borderColor: active ? hexToRgba(color, 0.42) : 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: active ? color : 'rgba(216, 200, 255, 0.3)' }}
                />
                {type}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
