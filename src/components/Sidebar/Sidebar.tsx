import { useMemo } from 'react';
import { BookOpen, Plus, ChevronLeft, ChevronRight, SearchX, Network } from 'lucide-react';
import { useDreamStore, filterLocations } from '@/store/dreamStore';
import { hexToRgba } from '@/utils/storage';
import { SearchFilter } from '@/components/SearchFilter/SearchFilter';

export function Sidebar() {
  const locations = useDreamStore((state) => state.locations);
  const filters = useDreamStore((state) => state.filters);
  const clearFilters = useDreamStore((state) => state.clearFilters);
  const selectedLocationId = useDreamStore((state) => state.selectedLocationId);
  const selectLocation = useDreamStore((state) => state.selectLocation);
  const openForm = useDreamStore((state) => state.openForm);
  const isSidebarOpen = useDreamStore((state) => state.isSidebarOpen);
  const toggleSidebar = useDreamStore((state) => state.toggleSidebar);
  const isExploreMode = useDreamStore((state) => state.isExploreMode);
  const exploreCenterId = useDreamStore((state) => state.exploreCenterId);
  const getExploreLocations = useDreamStore((state) => state.getExploreLocations);
  const getExploreDistance = useDreamStore((state) => state.getExploreDistance);

  const filteredLocations = useMemo(
    () => filterLocations(locations, filters),
    [locations, filters]
  );
  const exploreLocations = useDreamStore(() => getExploreLocations());
  const visibleLocations = useMemo(() => {
    if (!isExploreMode) return filteredLocations;
    return [...exploreLocations].sort((a, b) => {
      const aDistance = getExploreDistance(a.id);
      const bDistance = getExploreDistance(b.id);
      return (aDistance ?? 99) - (bDistance ?? 99) || a.name.localeCompare(b.name);
    });
  }, [isExploreMode, filteredLocations, exploreLocations, getExploreDistance]);
  const exploreCenter = locations.find((loc) => loc.id === exploreCenterId);

  const hasActiveFilters = !!filters.searchText.trim() || !!filters.frequency || filters.selectedTags.length > 0;
  const hasResults = visibleLocations.length > 0;

  return (
    <>
      <div
        className={`absolute top-0 left-0 h-full z-20 transition-all duration-300 ease-out ${
          isSidebarOpen ? 'w-64' : 'w-0'
        }`}
      >
        <div
          className={`h-full flex flex-col overflow-hidden transition-opacity duration-200 ${
            isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            background: 'linear-gradient(180deg, rgba(20, 20, 50, 0.95) 0%, rgba(10, 10, 30, 0.98) 100%)',
            backdropFilter: 'blur(15px)',
            borderRight: '1px solid rgba(150, 130, 200, 0.15)',
            boxShadow: '5px 0 30px rgba(0, 0, 0, 0.3)',
          }}
        >
          {!isExploreMode && <SearchFilter />}

          <div className="p-5 border-b border-purple-300/10">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(155, 89, 182, 0.3) 0%, rgba(100, 50, 150, 0.3) 100%)',
                  border: '1px solid rgba(155, 89, 182, 0.3)',
                }}
              >
                {isExploreMode ? (
                  <Network size={20} className="text-cyan-200" />
                ) : (
                  <BookOpen size={20} className="text-purple-300" />
                )}
              </div>
              <div>
                <h2 className="text-sm font-serif text-white font-medium">
                  {isExploreMode ? '关系探索' : '梦境档案'}
                </h2>
                <p className="text-xs text-purple-300/50">
                  {isExploreMode
                    ? `围绕「${exploreCenter?.name || '未知地点'}」`
                    : hasActiveFilters
                      ? `${filteredLocations.length} / ${locations.length} 个地点`
                      : `${locations.length} 个地点`}
                </p>
              </div>
            </div>
          </div>

          <div className="p-3">
            <button
              onClick={() => openForm()}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, rgba(155, 89, 182, 0.5) 0%, rgba(100, 50, 150, 0.5) 100%)',
                border: '1px solid rgba(155, 89, 182, 0.4)',
              }}
            >
              <Plus size={16} />
              记录新地点
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
            {locations.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-purple-300/40 italic">档案为空</p>
                <p className="text-xs text-purple-300/30 mt-1">点击上方按钮记录</p>
              </div>
            ) : !hasResults ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center bg-purple-500/10">
                  <SearchX size={20} className="text-purple-300/50" />
                </div>
                <p className="text-xs text-purple-300/50 italic">未找到匹配的地点</p>
                <p className="text-xs text-purple-300/30 mt-1">
                  试试调整搜索条件
                </p>
                <button
                  onClick={clearFilters}
                  className="mt-3 px-4 py-1.5 rounded-md text-xs text-purple-300/70 bg-white/5 border border-purple-300/20 hover:text-purple-200 hover:bg-white/10 transition-all"
                >
                  清空筛选
                </button>
              </div>
            ) : (
              visibleLocations.map((location) => {
                const distance = getExploreDistance(location.id);
                const distanceLabel =
                  distance === 0 ? '中心' : distance === 1 ? '一度' : distance === 2 ? '二度' : null;

                return (
                <button
                  key={location.id}
                  onClick={() => selectLocation(location.id)}
                  className={`w-full p-3 rounded-lg text-left transition-all group ${
                    selectedLocationId === location.id
                      ? 'bg-white/10'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 mt-1 transition-transform group-hover:scale-125"
                      style={{
                        backgroundColor: location.emotionColor,
                        boxShadow: `0 0 8px ${hexToRgba(location.emotionColor, 0.6)}`,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm truncate ${
                          selectedLocationId === location.id
                            ? 'text-white'
                            : 'text-purple-100/80'
                        }`}
                      >
                        {location.name}
                      </p>
                      <p className="text-xs text-purple-300/40 truncate">
                        {location.frequency}
                      </p>
                      {distanceLabel && (
                        <span
                          className="mt-1.5 inline-flex rounded-full px-1.5 py-0.5 text-[10px]"
                          style={{
                            color: distance === 0 ? '#67e8f9' : distance === 1 ? '#c4b5fd' : '#f0abfc',
                            backgroundColor:
                              distance === 0
                                ? 'rgba(34, 211, 238, 0.12)'
                                : distance === 1
                                  ? 'rgba(167, 139, 250, 0.12)'
                                  : 'rgba(232, 121, 249, 0.12)',
                          }}
                        >
                          {distanceLabel}
                        </span>
                      )}
                      {location.tags && location.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {location.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 rounded-full text-[10px] text-purple-200/70 bg-white/5 border border-purple-300/15"
                            >
                              {tag}
                            </span>
                          ))}
                          {location.tags.length > 3 && (
                            <span className="px-1.5 py-0.5 text-[10px] text-purple-300/40">
                              +{location.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <button
        onClick={toggleSidebar}
        className="absolute top-1/2 z-20 -translate-y-1/2 w-6 h-20 flex items-center justify-center text-purple-300/50 hover:text-purple-200 transition-all hover:bg-white/5 rounded-r-lg"
        style={{
          left: isSidebarOpen ? '16rem' : '0',
          background: 'rgba(20, 20, 50, 0.8)',
          border: '1px solid rgba(150, 130, 200, 0.15)',
          borderLeft: 'none',
        }}
      >
        {isSidebarOpen ? (
          <ChevronLeft size={16} />
        ) : (
          <ChevronRight size={16} />
        )}
      </button>
    </>
  );
}
