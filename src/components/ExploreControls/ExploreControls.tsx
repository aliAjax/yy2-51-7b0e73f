import { X, Network, GitBranch } from 'lucide-react';
import { useDreamStore, type ExploreDepth } from '@/store/dreamStore';
import { RELATION_TYPES, RELATION_TYPE_COLORS } from '@/types';
import { hexToRgba } from '@/utils/storage';

export function ExploreControls() {
  const isExploreMode = useDreamStore((state) => state.isExploreMode);
  const exploreCenterId = useDreamStore((state) => state.exploreCenterId);
  const exploreDepth = useDreamStore((state) => state.exploreDepth);
  const visibleRelationTypes = useDreamStore((state) => state.visibleRelationTypes);
  const locations = useDreamStore((state) => state.locations);
  const exitExploreMode = useDreamStore((state) => state.exitExploreMode);
  const setExploreDepth = useDreamStore((state) => state.setExploreDepth);
  const toggleRelationTypeVisibility = useDreamStore((state) => state.toggleRelationTypeVisibility);

  if (!isExploreMode) return null;

  const centerLocation = locations.find((l) => l.id === exploreCenterId);

  const handleDepthChange = (depth: ExploreDepth) => {
    setExploreDepth(depth);
  };

  return (
    <div
      className="absolute left-1/2 top-4 -translate-x-1/2 z-40 animate-fade-in"
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="flex flex-col gap-3 p-4 rounded-2xl min-w-[320px]"
        style={{
          background: `linear-gradient(145deg, ${hexToRgba('#1e1e3f', 0.95)} 0%, ${hexToRgba('#0f0f2a', 0.98)} 100%)`,
          border: '1px solid rgba(155, 89, 182, 0.3)',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(155, 89, 182, 0.15)',
          backdropFilter: 'blur(15px)',
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(155, 89, 182, 0.4) 0%, rgba(100, 50, 150, 0.4) 100%)',
                border: '1px solid rgba(155, 89, 182, 0.5)',
              }}
            >
              <Network size={16} className="text-purple-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">关系探索模式</p>
              {centerLocation && (
                <p className="text-xs text-purple-300/60">
                  中心：<span className="text-purple-200">{centerLocation.name}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={exitExploreMode}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-purple-300/60 hover:text-purple-200 hover:bg-white/10 transition-all"
            title="退出探索模式"
          >
            <X size={18} />
          </button>
        </div>

        <div className="h-px bg-purple-300/10" />

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-purple-300/60 text-xs uppercase tracking-wider">
            <GitBranch size={12} />
            <span>关联深度</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleDepthChange(1)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                exploreDepth === 1
                  ? 'text-white'
                  : 'text-purple-300/60 hover:text-purple-200 hover:bg-white/5'
              }`}
              style={{
                background: exploreDepth === 1 ? 'linear-gradient(135deg, rgba(155, 89, 182, 0.4) 0%, rgba(100, 50, 150, 0.4) 100%)' : 'transparent',
                border: exploreDepth === 1 ? '1px solid rgba(155, 89, 182, 0.5)' : '1px solid rgba(150, 130, 200, 0.1)',
              }}
            >
              一度关联
            </button>
            <button
              onClick={() => handleDepthChange(2)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                exploreDepth === 2
                  ? 'text-white'
                  : 'text-purple-300/60 hover:text-purple-200 hover:bg-white/5'
              }`}
              style={{
                background: exploreDepth === 2 ? 'linear-gradient(135deg, rgba(155, 89, 182, 0.4) 0%, rgba(100, 50, 150, 0.4) 100%)' : 'transparent',
                border: exploreDepth === 2 ? '1px solid rgba(155, 89, 182, 0.5)' : '1px solid rgba(150, 130, 200, 0.1)',
              }}
            >
              二度关联
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-purple-300/60 text-xs uppercase tracking-wider">关系类型</p>
          <div className="grid grid-cols-2 gap-2">
            {RELATION_TYPES.map((type) => {
              const isVisible = visibleRelationTypes.includes(type);
              const color = RELATION_TYPE_COLORS[type];
              return (
                <button
                  key={type}
                  onClick={() => toggleRelationTypeVisibility(type)}
                  className={`flex items-center gap-2 py-2 px-3 rounded-lg text-sm transition-all ${
                    isVisible
                      ? 'text-white'
                      : 'text-purple-300/30 hover:text-purple-300/50'
                  }`}
                  style={{
                    background: isVisible ? hexToRgba(color, 0.15) : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isVisible ? hexToRgba(color, 0.4) : 'rgba(150, 130, 200, 0.1)'}`,
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 transition-all"
                    style={{
                      backgroundColor: isVisible ? color : 'transparent',
                      border: `1.5px solid ${color}`,
                      opacity: isVisible ? 1 : 0.4,
                    }}
                  />
                  <span>{type}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
