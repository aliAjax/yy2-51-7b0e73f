import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Plus, Calendar, Moon, Sparkles, Edit3, MapPin, SearchX, Tag, X } from 'lucide-react';
import { useDreamStore, initializeDreamStore, filterLocations } from '@/store/dreamStore';
import { hexToRgba } from '@/utils/storage';
import { LocationForm } from '@/components/LocationForm/LocationForm';
import { FREQUENCY_OPTIONS } from '@/types';

interface TimelineEvent {
  id: string;
  locationId: string;
  locationName: string;
  emotionColor: string;
  tags: string[];
  type: 'create' | 'update';
  date: string;
  timestamp: number;
  description: string;
}

export default function TimelinePage() {
  const navigate = useNavigate();
  const locations = useDreamStore((state) => state.locations);
  const filters = useDreamStore((state) => state.filters);
  const selectLocation = useDreamStore((state) => state.selectLocation);
  const openForm = useDreamStore((state) => state.openForm);
  const setFrequencyFilter = useDreamStore((state) => state.setFrequencyFilter);
  const toggleTagFilter = useDreamStore((state) => state.toggleTagFilter);
  const clearTagFilter = useDreamStore((state) => state.clearTagFilter);
  const toggleTimelineEventType = useDreamStore((state) => state.toggleTimelineEventType);
  const clearTimelineEventTypes = useDreamStore((state) => state.clearTimelineEventTypes);
  const clearFilters = useDreamStore((state) => state.clearFilters);

  useEffect(() => {
    initializeDreamStore();
  }, []);

  const filteredLocations = useMemo(
    () => filterLocations(locations, { ...filters, searchText: '' }),
    [locations, filters]
  );

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    locations.forEach((location) => {
      location.tags.forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [locations]);

  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];

    filteredLocations.forEach((location) => {
      events.push({
        id: `${location.id}-create`,
        locationId: location.id,
        locationName: location.name,
        emotionColor: location.emotionColor,
        tags: location.tags || [],
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
          type: 'update',
          date: location.updatedAt,
          timestamp: new Date(location.updatedAt).getTime(),
          description: '更新了梦境记录',
        });
      }
    });

    return events.sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredLocations]);

  const filteredTimelineEvents = useMemo(() => {
    if (filters.timelineEventTypes.length === 0) {
      return timelineEvents;
    }

    return timelineEvents.filter((event) => filters.timelineEventTypes.includes(event.type));
  }, [filters.timelineEventTypes, timelineEvents]);

  const groupedByMonth = useMemo(() => {
    const groups = new Map<string, TimelineEvent[]>();

    filteredTimelineEvents.forEach((event) => {
      const date = new Date(event.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(event);
    });

    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTimelineEvents]);

  const hasActiveFilters = !!filters.frequency || filters.selectedTags.length > 0 || filters.timelineEventTypes.length > 0;
  const hasResults = filteredTimelineEvents.length > 0;
  const eventTypeOptions: Array<{ type: 'create' | 'update'; label: string }> = [
    { type: 'create', label: '创建' },
    { type: 'update', label: '更新' },
  ];

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
                  {filteredTimelineEvents.length}
                </p>
                <p className="text-xs text-purple-300/50">
                  {hasActiveFilters ? `筛选结果 / ${timelineEvents.length}` : '时间轴事件'}
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

          {locations.length > 0 && (
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-purple-300/60">出现频率</label>
                  {filters.frequency && (
                    <button
                      onClick={() => setFrequencyFilter('')}
                      className="text-xs text-purple-300/50 hover:text-purple-200 transition-colors"
                    >
                      清除
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-2">
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
                  {FREQUENCY_OPTIONS.map((frequency) => (
                    <button
                      key={frequency}
                      onClick={() => setFrequencyFilter(frequency)}
                      className={`py-1.5 px-2 rounded-md text-xs transition-all ${
                        filters.frequency === frequency
                          ? 'text-white bg-purple-500/30 border border-purple-400/50'
                          : 'text-purple-300/60 bg-white/5 border border-purple-300/20 hover:text-purple-200 hover:bg-white/10'
                      }`}
                    >
                      {frequency}
                    </button>
                  ))}
                </div>
              </div>

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
                {allTags.length > 0 ? (
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
                ) : (
                  <p className="text-xs text-purple-300/40">暂无可筛选标签</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-purple-300/60">事件类型</label>
                  {filters.timelineEventTypes.length > 0 && (
                    <button
                      onClick={clearTimelineEventTypes}
                      className="text-xs text-purple-300/50 hover:text-purple-200 transition-colors"
                    >
                      清除
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={clearTimelineEventTypes}
                    className={`py-1.5 px-2 rounded-md text-xs transition-all ${
                      filters.timelineEventTypes.length === 0
                        ? 'text-white bg-purple-500/30 border border-purple-400/50'
                        : 'text-purple-300/60 bg-white/5 border border-purple-300/20 hover:text-purple-200 hover:bg-white/10'
                    }`}
                  >
                    全部
                  </button>
                  {eventTypeOptions.map((option) => (
                    <button
                      key={option.type}
                      onClick={() => toggleTimelineEventType(option.type)}
                      className={`py-1.5 px-2 rounded-md text-xs transition-all ${
                        filters.timelineEventTypes.includes(option.type)
                          ? 'text-white bg-purple-500/30 border border-purple-400/50'
                          : 'text-purple-300/60 bg-white/5 border border-purple-300/20 hover:text-purple-200 hover:bg-white/10'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {hasActiveFilters && (
                <div className="lg:col-span-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-purple-300/50">
                    显示 {filteredTimelineEvents.length} / {timelineEvents.length} 条事件
                  </p>
                  <button
                    onClick={clearFilters}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs text-purple-300/70 bg-white/5 border border-purple-300/20 hover:text-purple-200 hover:bg-white/10 transition-all"
                  >
                    <X size={12} />
                    清空所有筛选
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {locations.length === 0 ? (
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
          ) : !hasResults && hasActiveFilters ? (
            <div className="h-full flex items-center justify-center px-4">
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
