import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Plus, Calendar, Moon, Sparkles, Edit3, MapPin, Filter, ChevronDown, Tag, SearchX, X, Search } from 'lucide-react';
import { useDreamStore, initializeDreamStore, filterLocations, EventTypeFilter } from '@/store/dreamStore';
import { hexToRgba } from '@/utils/storage';
import { FREQUENCY_OPTIONS } from '@/types';
import { LocationForm } from '@/components/LocationForm/LocationForm';

interface TimelineEvent {
  id: string;
  locationId: string;
  locationName: string;
  emotionColor: string;
  tags: string[];
  frequency: string;
  type: 'create' | 'update';
  date: string;
  timestamp: number;
  description: string;
}

const EVENT_TYPES: { value: EventTypeFilter; label: string }[] = [
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
];

export default function TimelinePage() {
  const navigate = useNavigate();
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const locations = useDreamStore((state) => state.locations);
  const filters = useDreamStore((state) => state.filters);
  const selectLocation = useDreamStore((state) => state.selectLocation);
  const openForm = useDreamStore((state) => state.openForm);
  const setSearchText = useDreamStore((state) => state.setSearchText);
  const setFrequencyFilter = useDreamStore((state) => state.setFrequencyFilter);
  const toggleTagFilter = useDreamStore((state) => state.toggleTagFilter);
  const clearTagFilter = useDreamStore((state) => state.clearTagFilter);
  const toggleTimelineEventType = useDreamStore((state) => state.toggleTimelineEventType);
  const clearTimelineEventTypes = useDreamStore((state) => state.clearTimelineEventTypes);
  const clearFilters = useDreamStore((state) => state.clearFilters);

  useEffect(() => {
    initializeDreamStore();
  }, []);

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

  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];

    filteredLocations.forEach((location) => {
      events.push({
        id: `${location.id}-create`,
        locationId: location.id,
        locationName: location.name,
        emotionColor: location.emotionColor,
        tags: location.tags || [],
        frequency: location.frequency,
        type: 'create',
        date: location.createdAt,
        timestamp: new Date(location.createdAt).getTime(),
        description: '创建了这个梦境地点',
      });

      if (location.createdAt !== location.updatedAt) {
        events.push({
          id: `${location.id}-update`,
          locationId: location.id,
          locationName: location.name,
          emotionColor: location.emotionColor,
          tags: location.tags || [],
          frequency: location.frequency,
          type: 'update',
          date: location.updatedAt,
          timestamp: new Date(location.updatedAt).getTime(),
          description: '更新了梦境记录',
        });
      }
    });

    const filteredEvents = filters.timelineEventTypes.length > 0
      ? events.filter((event) => filters.timelineEventTypes.includes(event.type))
      : events;

    return filteredEvents.sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredLocations, filters.timelineEventTypes]);

  const groupedByMonth = useMemo(() => {
    const groups = new Map<string, TimelineEvent[]>();

    timelineEvents.forEach((event) => {
      const date = new Date(event.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(event);
    });

    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [timelineEvents]);

  const totalFilteredEvents = useMemo(() => {
    let count = 0;
    filteredLocations.forEach((location) => {
      count++;
      if (location.createdAt !== location.updatedAt) {
        count++;
      }
    });
    return count;
  }, [filteredLocations]);

  const hasActiveFilters = !!filters.searchText.trim() || !!filters.frequency || filters.selectedTags.length > 0 || filters.timelineEventTypes.length > 0;

  const formatMonth = (key: string) => {
    const [year, month] = key.split('-');
    return `${year}年${parseInt(month)}月`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleEventClick = (locationId: string) => {
    selectLocation(locationId);
    navigate('/');
  };

  const handleBackToMap = () => {
    navigate('/');
  };

  const renderFilterSection = () => (
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
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
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
              isFilterExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isFilterExpanded && (
          <div className="space-y-3 pt-1 animate-fade-in">
            <div className="space-y-2">
              <label className="text-xs text-purple-300/60 block">出现频率</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

            <div className="space-y-2">
              <label className="text-xs text-purple-300/60 block">事件类型</label>
              <div className="flex items-center justify-between mb-1">
                {filters.timelineEventTypes.length > 0 && (
                  <button
                    onClick={clearTimelineEventTypes}
                    className="text-xs text-purple-300/50 hover:text-purple-200 transition-colors"
                  >
                    清除
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (filters.timelineEventTypes.length === 0) {
                      EVENT_TYPES.forEach((t) => toggleTimelineEventType(t.value));
                    } else {
                      clearTimelineEventTypes();
                    }
                  }}
                  className={`py-1.5 px-2 rounded-md text-xs transition-all ${
                    filters.timelineEventTypes.length === 0
                      ? 'text-white bg-purple-500/30 border border-purple-400/50'
                      : 'text-purple-300/60 bg-white/5 border border-purple-300/20 hover:text-purple-200 hover:bg-white/10'
                  }`}
                >
                  全部
                </button>
                {EVENT_TYPES.map((eventType) => (
                  <button
                    key={eventType.value}
                    onClick={() => toggleTimelineEventType(eventType.value)}
                    className={`py-1.5 px-2 rounded-md text-xs transition-all ${
                      filters.timelineEventTypes.includes(eventType.value)
                        ? 'text-white bg-purple-500/30 border border-purple-400/50'
                        : 'text-purple-300/60 bg-white/5 border border-purple-300/20 hover:text-purple-200 hover:bg-white/10'
                    }`}
                  >
                    {eventType.label}
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
            显示 {timelineEvents.length} / {totalFilteredEvents} 条事件
          </div>
        )}
      </div>
    </div>
  );

  const renderEmptyDataState = () => (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 bg-purple-500/10">
        <Moon size={40} className="text-purple-300/50" />
      </div>
      <p className="text-purple-200/60 text-base mb-2">还没有任何梦境记录</p>
      <p className="text-purple-300/40 text-sm mb-6">点击右上角按钮开始记录你的梦境之旅</p>
      <button
        onClick={() => openForm()}
        className="px-6 py-3 rounded-xl text-sm font-medium text-white flex items-center gap-2 transition-all hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, rgba(155, 89, 182, 0.8) 0%, rgba(100, 50, 150, 0.8) 100%)',
          border: '1px solid rgba(155, 89, 182, 0.5)',
          boxShadow: '0 4px 15px rgba(155, 89, 182, 0.3)',
        }}
      >
        <Plus size={18} />
        记录第一个梦境
      </button>
    </div>
  );

  const renderEmptyFilterState = () => (
    <div className="py-8 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center bg-purple-500/10">
        <SearchX size={20} className="text-purple-300/50" />
      </div>
      <p className="text-xs text-purple-300/50 italic">未找到匹配的时间轴事件</p>
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
  );

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(30, 30, 80, 0.4) 0%, rgba(10, 10, 30, 1) 60%, rgba(5, 5, 20, 1) 100%)',
        }}
      />

      <div className="absolute top-20 left-20 w-32 h-32 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(155, 89, 182, 0.4) 0%, transparent 70%)' }} />
      <div className="absolute bottom-32 right-32 w-48 h-48 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, rgba(100, 150, 255, 0.3) 0%, transparent 70%)' }} />
      <div className="absolute top-1/3 right-1/4 w-24 h-24 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, rgba(255, 200, 100, 0.4) 0%, transparent 70%)' }} />

      <div className="relative h-full flex flex-col">
        <div className="flex-shrink-0 p-4 md:p-6 border-b border-purple-300/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToMap}
                className="p-2.5 rounded-xl text-purple-200/70 bg-white/5 border border-purple-300/20 hover:text-purple-100 hover:bg-white/10 transition-all group"
                title="返回地图"
              >
                <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
              </button>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Clock size={18} className="text-purple-300" />
                  <h1 className="text-xl md:text-2xl font-serif text-white tracking-wide">
                    梦境时间轴
                  </h1>
                </div>
                <p className="text-xs text-purple-300/60 italic">
                  记录梦境的每一个瞬间
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-lg font-serif text-white">
                  {timelineEvents.length}
                </p>
                <p className="text-xs text-purple-300/50">
                  时间轴事件
                </p>
              </div>

              <button
                onClick={() => openForm()}
                className="group relative px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, rgba(155, 89, 182, 0.8) 0%, rgba(100, 50, 150, 0.8) 100%)',
                  border: '1px solid rgba(155, 89, 182, 0.5)',
                  boxShadow: '0 4px 15px rgba(155, 89, 182, 0.3)',
                }}
              >
                <Plus size={18} className="transition-transform group-hover:rotate-90" />
                <span className="hidden sm:inline">记录梦境</span>
              </button>
            </div>
          </div>
        </div>

        {renderFilterSection()}

        <div className="flex-1 overflow-y-auto">
          {locations.length === 0 ? (
            renderEmptyDataState()
          ) : timelineEvents.length === 0 ? (
            renderEmptyFilterState()
          ) : (
            <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
              {groupedByMonth.map(([monthKey, events]) => (
                <div key={monthKey} className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-purple-300" />
                      <h2 className="text-sm font-medium text-purple-200/80">
                        {formatMonth(monthKey)}
                      </h2>
                    </div>
                    <span className="text-xs text-purple-300/40">
                      {events.length} 条记录
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-purple-500/30 to-transparent" />
                  </div>

                  <div className="relative pl-8">
                    <div
                      className="absolute left-2.5 top-0 bottom-0 w-0.5"
                      style={{
                        background: 'linear-gradient(180deg, rgba(155, 89, 182, 0.3) 0%, rgba(155, 89, 182, 0.1) 100%)',
                      }}
                    />

                    <div className="space-y-4">
                      {events.map((event) => (
                        <button
                          key={event.id}
                          onClick={() => handleEventClick(event.locationId)}
                          className="w-full text-left group"
                        >
                          <div className="relative">
                            <div
                              className="absolute -left-6 top-4 w-3 h-3 rounded-full border-2 transition-all group-hover:scale-125"
                              style={{
                                backgroundColor: event.type === 'create' ? event.emotionColor : hexToRgba(event.emotionColor, 0.3),
                                borderColor: event.emotionColor,
                                boxShadow: `0 0 10px ${hexToRgba(event.emotionColor, 0.5)}`,
                              }}
                            />

                            <div
                              className="p-4 rounded-xl transition-all hover:scale-[1.01] hover:shadow-lg"
                              style={{
                                background: `linear-gradient(135deg, ${hexToRgba('#1a1a3e', 0.6)} 0%, ${hexToRgba('#0d0d1f', 0.8)} 100%)`,
                                border: `1px solid ${hexToRgba(event.emotionColor, 0.2)}`,
                                backdropFilter: 'blur(10px)',
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center transition-transform group-hover:scale-110"
                                  style={{
                                    backgroundColor: hexToRgba(event.emotionColor, 0.15),
                                    border: `1px solid ${hexToRgba(event.emotionColor, 0.3)}`,
                                  }}
                                >
                                  {event.type === 'create' ? (
                                    <Sparkles size={18} style={{ color: event.emotionColor }} />
                                  ) : (
                                    <Edit3 size={18} style={{ color: event.emotionColor }} />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h3 className="text-base font-medium text-white truncate">
                                        {event.locationName}
                                      </h3>
                                      <span
                                        className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                                        style={{
                                          backgroundColor: hexToRgba(event.emotionColor, 0.15),
                                          color: event.emotionColor,
                                          border: `1px solid ${hexToRgba(event.emotionColor, 0.3)}`,
                                        }}
                                      >
                                        {event.type === 'create' ? '创建' : '更新'}
                                      </span>
                                    </div>

                                    <p className="text-sm text-purple-200/60 mb-2">
                                      {event.description}
                                    </p>

                                    {event.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mb-2">
                                        {event.tags.slice(0, 4).map((tag) => (
                                          <span
                                            key={tag}
                                            className="px-2 py-0.5 rounded-full text-[10px]"
                                            style={{
                                              backgroundColor: hexToRgba(event.emotionColor, 0.12),
                                              color: event.emotionColor,
                                              border: `1px solid ${hexToRgba(event.emotionColor, 0.25)}`,
                                            }}
                                          >
                                            {tag}
                                          </span>
                                        ))}
                                        {event.tags.length > 4 && (
                                          <span className="px-2 py-0.5 text-[10px] text-purple-300/50">
                                            +{event.tags.length - 4}
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    <div className="flex items-center gap-4 text-xs text-purple-300/50">
                                      <span className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        {formatDate(event.date)}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock size={12} />
                                        {formatTime(event.date)}
                                      </span>
                                    </div>
                                  </div>

                                <MapPin
                                  size={16}
                                  className="flex-shrink-0 text-purple-300/30 transition-all group-hover:text-purple-200/60 group-hover:translate-x-0.5"
                                />
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              <div className="text-center py-8">
                <p className="text-xs text-purple-300/30 italic">
                  — 梦境时间轴 · 共 {timelineEvents.length} 条记录 —
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <LocationForm />
    </div>
  );
}
