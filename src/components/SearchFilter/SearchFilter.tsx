import { useState, useMemo } from 'react';
import { Search, X, Filter, ChevronDown, Tag } from 'lucide-react';
import { useDreamStore, filterLocations } from '@/store/dreamStore';
import { FREQUENCY_OPTIONS } from '@/types';

export function SearchFilter() {
  const [isExpanded, setIsExpanded] = useState(false);
  const locations = useDreamStore((state) => state.locations);
  const filters = useDreamStore((state) => state.filters);
  const setSearchText = useDreamStore((state) => state.setSearchText);
  const setFrequencyFilter = useDreamStore((state) => state.setFrequencyFilter);
  const toggleTagFilter = useDreamStore((state) => state.toggleTagFilter);
  const clearTagFilter = useDreamStore((state) => state.clearTagFilter);
  const clearFilters = useDreamStore((state) => state.clearFilters);

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    locations.forEach((loc) => {
      loc.tags.forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [locations]);

  const filteredLocations = useMemo(
    () => filterLocations(locations, filters),
    [locations, filters]
  );

  const filteredCount = filteredLocations.length;
  const totalCount = locations.length;
  const hasActiveFilters = !!filters.searchText.trim() || !!filters.frequency || filters.selectedTags.length > 0;

  return (
    <div className="border-b border-purple-300/10">
      <div className="p-4 space-y-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300/50"
          />
          <input
            type="text"
            value={filters.searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索地点、氛围、人物..."
            className="w-full pl-9 pr-8 py-2 rounded-lg text-sm text-white placeholder-purple-300/40 bg-white/5 border border-purple-300/20 focus:border-purple-500/50 focus:bg-white/10 focus:outline-none transition-all"
          />
          {filters.searchText && (
            <button
              onClick={() => setSearchText('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/10 text-purple-300/50 hover:text-purple-200 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-purple-200/70 bg-white/5 border border-purple-300/20 hover:bg-white/10 transition-all"
        >
          <div className="flex items-center gap-2">
            <Filter size={14} />
            <span>筛选</span>
            {hasActiveFilters && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-purple-500/30 text-purple-200">
                已应用
              </span>
            )}
          </div>
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isExpanded && (
          <div className="space-y-3 pt-1 animate-fade-in">
            <div className="space-y-2">
              <label className="text-xs text-purple-300/60 block">出现频率</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFrequencyFilter('')}
                  className={`py-1.5 px-2 rounded-md text-xs transition-all ${
                    !filters.frequency
                      ? 'text-white bg-purple-500/30 border border-purple-400/50'
                      : 'text-purple-300/60 bg-white/5 border border-purple-300/20 hover:text-purple-200 hover:bg-white/10'
                  }`}
                >
                  全部
                </button>
                {FREQUENCY_OPTIONS.map((freq) => (
                  <button
                    key={freq}
                    onClick={() => setFrequencyFilter(freq)}
                    className={`py-1.5 px-2 rounded-md text-xs transition-all ${
                      filters.frequency === freq
                        ? 'text-white bg-purple-500/30 border border-purple-400/50'
                        : 'text-purple-300/60 bg-white/5 border border-purple-300/20 hover:text-purple-200 hover:bg-white/10'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>

            {allTags.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-purple-300/60 flex items-center gap-1">
                    <Tag size={12} />
                    标签筛选
                  </label>
                  {filters.selectedTags.length > 0 && (
                    <button
                      onClick={clearTagFilter}
                      className="text-xs text-purple-300/50 hover:text-purple-200 transition-colors"
                    >
                      清除
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTagFilter(tag)}
                      className={`px-2 py-1 rounded-full text-xs transition-all ${
                        filters.selectedTags.includes(tag)
                          ? 'text-white bg-purple-500/40 border border-purple-400/60'
                          : 'text-purple-300/60 bg-white/5 border border-purple-300/20 hover:text-purple-200 hover:bg-white/10'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-purple-300/70 bg-white/5 border border-purple-300/20 hover:text-purple-200 hover:bg-white/10 transition-all"
              >
                <X size={12} />
                清空所有筛选
              </button>
            )}
          </div>
        )}

        {hasActiveFilters && (
          <div className="text-xs text-purple-300/50">
            显示 {filteredCount} / {totalCount} 个地点
          </div>
        )}
      </div>
    </div>
  );
}
