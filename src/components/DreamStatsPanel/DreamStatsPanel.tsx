import { useEffect, useMemo } from 'react';
import { BarChart3, Palette, Sparkles, Users, X } from 'lucide-react';
import type { DreamLocation } from '@/types';
import { FREQUENCY_OPTIONS } from '@/types';
import { hexToRgba } from '@/utils/storage';

interface DreamStatsPanelProps {
  locations: DreamLocation[];
  onClose: () => void;
}

interface CountItem {
  label: string;
  count: number;
}

function parsePeople(value: string): string[] {
  return value
    .split(/[、,，;；\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function countBy(items: string[]): CountItem[] {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh-CN'));
}

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-purple-200/10 bg-white/[0.06] p-4">
      <div className="mb-3 flex items-center gap-2 text-purple-200/60">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="font-serif text-2xl text-white">{value}</div>
      <div className="mt-1 text-xs text-purple-200/45">{detail}</div>
    </div>
  );
}

function EmptyMetric({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-purple-200/15 bg-white/[0.03] px-4 py-6 text-center text-sm text-purple-200/45">
      {text}
    </div>
  );
}

export function DreamStatsPanel({ locations, onClose }: DreamStatsPanelProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const stats = useMemo(() => {
    const frequencyCounts = FREQUENCY_OPTIONS.map((frequency) => ({
      label: frequency,
      count: locations.filter((location) => location.frequency === frequency).length,
    }));
    const peopleCounts = countBy(locations.flatMap((location) => parsePeople(location.relatedPeople))).slice(0, 8);
    const colorCounts = countBy(locations.map((location) => location.emotionColor).filter(Boolean));
    const totalPeopleMentions = peopleCounts.reduce((sum, item) => sum + item.count, 0);
    const dominantFrequency = [...frequencyCounts].sort((a, b) => b.count - a.count)[0];
    const dominantColor = colorCounts[0];

    return {
      frequencyCounts,
      peopleCounts,
      colorCounts,
      totalPeopleMentions,
      dominantFrequency,
      dominantColor,
    };
  }, [locations]);

  const maxFrequencyCount = Math.max(...stats.frequencyCounts.map((item) => item.count), 1);
  const maxPeopleCount = Math.max(...stats.peopleCounts.map((item) => item.count), 1);
  const maxColorCount = Math.max(...stats.colorCounts.map((item) => item.count), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <button
        type="button"
        aria-label="点击遮罩关闭梦境统计"
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="dream-stats-title"
        className="relative flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-purple-200/15 bg-[#111126]/95 shadow-2xl animate-scale-in"
        style={{
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.65), 0 0 80px rgba(155, 89, 182, 0.18)',
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-purple-200/10 px-5 py-4 md:px-6">
          <div>
            <p className="text-xs text-purple-200/50">梦境档案概览</p>
            <h2 id="dream-stats-title" className="font-serif text-xl text-white md:text-2xl">
              梦境统计
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭梦境统计"
            className="rounded-full bg-white/5 p-2 text-purple-100/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 md:px-6">
          <div className="grid gap-3 md:grid-cols-4">
            <StatCard
              icon={<Sparkles size={16} />}
              label="地点数量"
              value={locations.length}
              detail="当前locations记录"
            />
            <StatCard
              icon={<BarChart3 size={16} />}
              label="最常频率"
              value={stats.dominantFrequency?.count ? stats.dominantFrequency.label : '暂无'}
              detail={stats.dominantFrequency?.count ? `${stats.dominantFrequency.count}个地点` : '等待记录'}
            />
            <StatCard
              icon={<Users size={16} />}
              label="人物提及"
              value={stats.totalPeopleMentions}
              detail={`${stats.peopleCounts.length}位常见人物`}
            />
            <StatCard
              icon={<Palette size={16} />}
              label="情绪颜色"
              value={stats.colorCounts.length}
              detail={stats.dominantColor ? `主色${stats.dominantColor.label}` : '等待记录'}
            />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-purple-200/10 bg-white/[0.045] p-4">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-purple-100">
                <BarChart3 size={16} />
                出现频率分布
              </h3>
              <div className="space-y-3">
                {stats.frequencyCounts.map((item) => {
                  const width = `${(item.count / maxFrequencyCount) * 100}%`;
                  const percent = locations.length ? Math.round((item.count / locations.length) * 100) : 0;

                  return (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-purple-100/80">{item.label}</span>
                        <span className="text-purple-200/45">
                          {item.count}个 / {percent}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-300 to-fuchsia-300 transition-all"
                          style={{ width }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-purple-200/10 bg-white/[0.045] p-4">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-purple-100">
                <Users size={16} />
                常见相关人物
              </h3>
              {stats.peopleCounts.length ? (
                <div className="space-y-2">
                  {stats.peopleCounts.map((item, index) => (
                    <div key={item.label} className="flex items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-300/15 text-xs text-purple-100">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-purple-50">{item.label}</span>
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-cyan-200/80"
                          style={{ width: `${(item.count / maxPeopleCount) * 100}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs text-purple-200/50">{item.count}次</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyMetric text="还没有相关人物记录" />
              )}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-purple-200/10 bg-white/[0.045] p-4">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-purple-100">
              <Palette size={16} />
              情绪颜色分布
            </h3>
            {stats.colorCounts.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {stats.colorCounts.map((item) => {
                  const percent = Math.round((item.count / locations.length) * 100);

                  return (
                    <div key={item.label} className="rounded-lg bg-white/[0.04] p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-4 w-4 flex-shrink-0 rounded-full"
                            style={{
                              backgroundColor: item.label,
                              boxShadow: `0 0 14px ${hexToRgba(item.label, 0.6)}`,
                            }}
                          />
                          <span className="truncate text-sm text-purple-50">{item.label}</span>
                        </div>
                        <span className="text-xs text-purple-200/50">
                          {item.count}个 / {percent}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(item.count / maxColorCount) * 100}%`,
                            backgroundColor: item.label,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyMetric text="还没有情绪颜色记录" />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
