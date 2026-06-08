import { useEffect, useMemo } from 'react';
import { ArrowLeft, CalendarClock, Clock, MapPin, PencilLine, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { initializeDreamStore, useDreamStore } from '@/store/dreamStore';
import type { DreamLocation } from '@/types';
import { hexToRgba } from '@/utils/storage';

type TimelineEvent = {
  id: string;
  location: DreamLocation;
  type: 'created' | 'updated';
  date: Date;
};

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
});

const monthFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
});

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildTimeline(locations: DreamLocation[]): TimelineEvent[] {
  return locations
    .flatMap((location) => {
      const createdAt = parseDate(location.createdAt);
      const updatedAt = parseDate(location.updatedAt);
      const events: TimelineEvent[] = [];

      if (createdAt) {
        events.push({
          id: `${location.id}-created`,
          location,
          type: 'created',
          date: createdAt,
        });
      }

      if (updatedAt && (!createdAt || updatedAt.getTime() !== createdAt.getTime())) {
        events.push({
          id: `${location.id}-updated`,
          location,
          type: 'updated',
          date: updatedAt,
        });
      }

      return events;
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export default function TimelinePage() {
  const navigate = useNavigate();
  const locations = useDreamStore((state) => state.locations);
  const selectLocation = useDreamStore((state) => state.selectLocation);
  const clearFilters = useDreamStore((state) => state.clearFilters);

  useEffect(() => {
    initializeDreamStore();
  }, []);

  const events = useMemo(() => buildTimeline(locations), [locations]);
  const groupedEvents = useMemo(() => {
    return events.reduce<Record<string, TimelineEvent[]>>((groups, event) => {
      const month = monthFormatter.format(event.date);
      groups[month] = groups[month] ?? [];
      groups[month].push(event);
      return groups;
    }, {});
  }, [events]);

  const handleBackToMap = () => {
    navigate('/');
  };

  const handleSelectEvent = (event: TimelineEvent) => {
    clearFilters();
    selectLocation(event.location.id);
    navigate('/');
  };

  return (
    <main className="h-screen w-screen overflow-y-auto bg-[#090913] text-purple-50">
      <div
        className="min-h-full"
        style={{
          background:
            'radial-gradient(circle at 20% 10%, rgba(155, 89, 182, 0.18), transparent 30%), radial-gradient(circle at 80% 0%, rgba(64, 120, 180, 0.12), transparent 28%), linear-gradient(135deg, #090913 0%, #15102b 45%, #070711 100%)',
        }}
      >
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 border-b border-purple-200/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleBackToMap}
                aria-label="返回梦境地图"
                title="返回梦境地图"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-purple-200/20 bg-white/8 text-purple-100 transition hover:border-purple-200/40 hover:bg-white/12 active:scale-95"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-purple-300/60">
                  <CalendarClock size={14} />
                  梦境记录时间轴
                </p>
                <h1 className="mt-1 text-2xl font-serif text-white sm:text-3xl">
                  梦境地点时间线
                </h1>
              </div>
            </div>
            <div className="rounded-lg border border-purple-200/15 bg-white/8 px-4 py-2 text-sm text-purple-100">
              {locations.length}个地点 / {events.length}条记录
            </div>
          </header>

          {events.length === 0 ? (
            <section className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-purple-200/20 bg-white/8">
                <Sparkles size={26} className="text-purple-200" />
              </div>
              <div>
                <h2 className="text-xl font-serif text-white">还没有可回看的梦境记录</h2>
                <p className="mt-2 max-w-md text-sm text-purple-200/70">
                  回到地图记录第一个梦境地点后，这里会按创建和更新时间整理成时间线。
                </p>
              </div>
              <button
                type="button"
                onClick={handleBackToMap}
                className="mt-2 rounded-lg border border-purple-200/20 bg-purple-300/20 px-4 py-2 text-sm font-medium text-purple-50 transition hover:bg-purple-300/30"
              >
                返回地图
              </button>
            </section>
          ) : (
            <section className="space-y-8 py-6">
              {Object.entries(groupedEvents).map(([month, monthEvents]) => (
                <div key={month} className="grid gap-4 md:grid-cols-[140px_1fr]">
                  <div className="pt-1">
                    <h2 className="text-sm font-semibold text-purple-100">{month}</h2>
                  </div>
                  <ol className="relative space-y-4 border-l border-purple-200/15 pl-5">
                    {monthEvents.map((event) => {
                      const isUpdated = event.type === 'updated';
                      const Icon = isUpdated ? PencilLine : MapPin;
                      const eventLabel = isUpdated ? '更新地点' : '创建地点';

                      return (
                        <li key={event.id} className="relative">
                          <span
                            className="absolute -left-[29px] top-4 flex h-4 w-4 rounded-full border-2 border-[#141026]"
                            style={{ backgroundColor: event.location.emotionColor }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSelectEvent(event)}
                            className="group w-full rounded-lg border border-purple-200/12 bg-white/8 p-4 text-left transition hover:-translate-y-0.5 hover:border-purple-200/30 hover:bg-white/12 active:translate-y-0"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex min-w-0 gap-3">
                                <div
                                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border"
                                  style={{
                                    color: event.location.emotionColor,
                                    borderColor: hexToRgba(event.location.emotionColor, 0.35),
                                    backgroundColor: hexToRgba(event.location.emotionColor, 0.14),
                                  }}
                                >
                                  <Icon size={19} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-purple-300/70">{eventLabel}</p>
                                  <h3 className="mt-1 truncate text-lg font-serif text-white">
                                    {event.location.name}
                                  </h3>
                                  <p className="mt-2 line-clamp-2 text-sm text-purple-100/70">
                                    {event.location.memoryFragment || event.location.atmosphere || '一处仍在梦里发光的地点'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-2 text-sm text-purple-200/75 sm:flex-col sm:items-end sm:gap-1">
                                <span>{dateFormatter.format(event.date)}</span>
                                <span className="flex items-center gap-1 text-xs text-purple-300/55">
                                  <Clock size={12} />
                                  {timeFormatter.format(event.date)}
                                </span>
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
