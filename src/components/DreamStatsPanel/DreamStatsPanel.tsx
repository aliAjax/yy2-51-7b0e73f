import { useEffect, useMemo } from 'react';
import {
  X,
  BarChart3,
  Users,
  Palette,
  MapPin,
  TrendingUp,
  Calendar,
  Clock,
  Sparkles,
  Star,
  Moon,
  Tag,
  Link,
} from 'lucide-react';
import { useDreamStore } from '@/store/dreamStore';
import { FREQUENCY_OPTIONS, RELATION_TYPES, RELATION_TYPE_COLORS } from '@/types';
import { hexToRgba } from '@/utils/storage';

interface DreamStatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FrequencyStat {
  label: string;
  count: number;
  percentage: number;
}

interface PersonStat {
  name: string;
  count: number;
  percentage: number;
}

interface ColorStat {
  color: string;
  count: number;
  percentage: number;
}

interface TagStat {
  tag: string;
  count: number;
  percentage: number;
}

interface RelationTypeStat {
  type: string;
  color: string;
  count: number;
  percentage: number;
}

interface TimeStats {
  earliest: string | null;
  latest: string | null;
  daysSpan: number;
}

export function DreamStatsPanel({ isOpen, onClose }: DreamStatsPanelProps) {
  const locations = useDreamStore((state) => state.locations);
  const relations = useDreamStore((state) => state.relations);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const stats = useMemo(() => {
    const totalCount = locations.length;

    const frequencyStats: FrequencyStat[] = FREQUENCY_OPTIONS.map((freq) => {
      const count = locations.filter((loc) => loc.frequency === freq).length;
      return {
        label: freq,
        count,
        percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
      };
    });

    const personMap = new Map<string, number>();
    locations.forEach((loc) => {
      if (loc.relatedPeople && loc.relatedPeople.trim()) {
        const people = loc.relatedPeople
          .split(/[,，、\s]+/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0);
        people.forEach((person) => {
          personMap.set(person, (personMap.get(person) || 0) + 1);
        });
      }
    });

    const personStats: PersonStat[] = Array.from(personMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const colorMap = new Map<string, number>();
    locations.forEach((loc) => {
      if (loc.emotionColor) {
        colorMap.set(loc.emotionColor, (colorMap.get(loc.emotionColor) || 0) + 1);
      }
    });

    const colorStats: ColorStat[] = Array.from(colorMap.entries())
      .map(([color, count]) => ({
        color,
        count,
        percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const mostFrequent = frequencyStats.reduce(
      (max, curr) => (curr.count > max.count ? curr : max),
      frequencyStats[0]
    );

    const topColor = colorStats[0] || null;

    let timeStats: TimeStats = {
      earliest: null,
      latest: null,
      daysSpan: 0,
    };

    if (locations.length > 0) {
      const dates = locations.map((loc) => new Date(loc.createdAt).getTime());
      const earliest = new Date(Math.min(...dates));
      const latest = new Date(Math.max(...dates));
      const daysSpan = Math.ceil(
        (latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)
      );

      timeStats = {
        earliest: earliest.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        latest: latest.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        daysSpan,
      };
    }

    const avgFrequencyLevel = (() => {
      if (totalCount === 0) return 0;
      const levelMap = new Map<string, number>(FREQUENCY_OPTIONS.map((f, i) => [f, i + 1]));
      const totalLevel = locations.reduce(
        (sum, loc) => sum + (levelMap.get(loc.frequency) || 0),
        0
      );
      return totalLevel / totalCount;
    })();

    const atmosphereWordMap = new Map<string, number>();
    locations.forEach((loc) => {
      if (loc.atmosphere && loc.atmosphere.trim()) {
        const words = loc.atmosphere
          .split(/[，,。.\s]+/)
          .map((w) => w.trim())
          .filter((w) => w.length > 1);
        words.forEach((word) => {
          atmosphereWordMap.set(word, (atmosphereWordMap.get(word) || 0) + 1);
        });
      }
    });
    const atmosphereWords = Array.from(atmosphereWordMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([word, count]) => ({ word, count }));

    const tagMap = new Map<string, number>();
    locations.forEach((loc) => {
      if (loc.tags && loc.tags.length > 0) {
        loc.tags.forEach((tag) => {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
        });
      }
    });
    const tagStats: TagStat[] = Array.from(tagMap.entries())
      .map(([tag, count]) => ({
        tag,
        count,
        percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const totalTagCount = tagStats.reduce((sum, t) => sum + t.count, 0);

    const totalRelations = relations.length;
    const relationTypeStats: RelationTypeStat[] = RELATION_TYPES.map((type) => {
      const count = relations.filter((rel) => rel.type === type).length;
      return {
        type,
        color: RELATION_TYPE_COLORS[type],
        count,
        percentage: totalRelations > 0 ? (count / totalRelations) * 100 : 0,
      };
    });

    return {
      totalCount,
      frequencyStats,
      personStats,
      colorStats,
      tagStats,
      totalTagCount,
      mostFrequent,
      topColor,
      timeStats,
      avgFrequencyLevel,
      atmosphereWords,
      totalRelations,
      relationTypeStats,
    };
  }, [locations, relations]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl animate-scale-in"
        style={{
          background: `linear-gradient(145deg, ${hexToRgba('#1e1e3f', 0.95)} 0%, ${hexToRgba('#0f0f2a', 0.98)} 100%)`,
          border: '1px solid rgba(150, 130, 200, 0.2)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 100px rgba(100, 50, 150, 0.2)',
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{
            background: 'linear-gradient(90deg, rgba(155, 89, 182, 0.8), rgba(100, 50, 150, 0.8), rgba(155, 89, 182, 0.8))',
          }}
        />

        <div className="absolute top-10 left-8 opacity-20">
          <Moon size={24} className="text-purple-300" />
        </div>
        <div className="absolute top-16 right-12 opacity-10">
          <Star size={16} className="text-yellow-200" />
        </div>
        <div className="absolute top-8 right-24 opacity-15">
          <Sparkles size={12} className="text-purple-200" />
        </div>

        <div className="relative h-16 flex items-center justify-between px-6 border-b border-purple-300/10">
          <h2 className="text-lg font-serif text-white flex items-center gap-2">
            <BarChart3 size={20} className="text-purple-300" />
            梦境统计
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-purple-300/40 hidden sm:inline">按 ESC 关闭</span>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-4rem)]">
          {stats.totalCount === 0 ? (
            <div className="py-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center bg-purple-500/10">
                <Moon size={32} className="text-purple-300/50" />
              </div>
              <p className="text-purple-200/60 text-sm">还没有记录任何梦境</p>
              <p className="text-purple-300/40 text-xs mt-1">开始记录你的第一个梦境地点吧</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-4 rounded-xl bg-white/5 border border-purple-300/10 text-center relative overflow-hidden group hover:bg-white/10 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center bg-purple-500/20">
                      <MapPin size={18} className="text-purple-300" />
                    </div>
                    <p className="text-2xl font-serif text-white">{stats.totalCount}</p>
                    <p className="text-xs text-purple-300/60 mt-1">梦境地点</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-purple-300/10 text-center relative overflow-hidden group hover:bg-white/10 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center bg-blue-500/20">
                      <Users size={18} className="text-blue-300" />
                    </div>
                    <p className="text-2xl font-serif text-white">{stats.personStats.length}</p>
                    <p className="text-xs text-purple-300/60 mt-1">相关人物</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-purple-300/10 text-center relative overflow-hidden group hover:bg-white/10 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center bg-pink-500/20">
                      <Palette size={18} className="text-pink-300" />
                    </div>
                    <p className="text-2xl font-serif text-white">{stats.colorStats.length}</p>
                    <p className="text-xs text-purple-300/60 mt-1">情绪色彩</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-purple-300/10 text-center relative overflow-hidden group hover:bg-white/10 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center bg-amber-500/20">
                      <Tag size={18} className="text-amber-300" />
                    </div>
                    <p className="text-2xl font-serif text-white">{stats.tagStats.length}</p>
                    <p className="text-xs text-purple-300/60 mt-1">标签总数</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-purple-300/10 text-center relative overflow-hidden group hover:bg-white/10 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center bg-green-500/20">
                      <TrendingUp size={18} className="text-green-300" />
                    </div>
                    <p className="text-lg font-serif text-white">{stats.mostFrequent?.label || '-'}</p>
                    <p className="text-xs text-purple-300/60 mt-1">最多频率</p>
                  </div>
                </div>
              </div>

              {stats.timeStats.earliest && (
                <div className="p-4 rounded-xl bg-white/5 border border-purple-300/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar size={16} className="text-purple-300" />
                    <h3 className="text-sm font-medium text-white">记录时间线</h3>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <p className="text-xs text-purple-300/60 mb-1">最早记录</p>
                      <p className="text-sm text-purple-100/90 font-medium">{stats.timeStats.earliest}</p>
                    </div>
                    <div className="flex-1 flex flex-col items-center">
                      <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500/50 via-purple-400/80 to-purple-500/50 rounded-full" />
                      <p className="text-xs text-purple-300/50 mt-2">
                        跨越 {stats.timeStats.daysSpan} 天
                      </p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-xs text-purple-300/60 mb-1">最新记录</p>
                      <p className="text-sm text-purple-100/90 font-medium">{stats.timeStats.latest}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-purple-300" />
                    <h3 className="text-sm font-medium text-white">出现频率分布</h3>
                  </div>
                  <span className="text-xs text-purple-300/50">
                    平均频率 {stats.avgFrequencyLevel.toFixed(1)}/4
                  </span>
                </div>
                <div className="space-y-2">
                  {stats.frequencyStats.map((freq) => (
                    <div key={freq.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-purple-200/80">{freq.label}</span>
                        <span className="text-purple-300/60">
                          {freq.count} 个 ({freq.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${freq.percentage}%`,
                            background: 'linear-gradient(90deg, rgba(155, 89, 182, 0.9) 0%, rgba(100, 50, 150, 0.9) 100%)',
                            boxShadow: '0 0 10px rgba(155, 89, 182, 0.3)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-purple-300" />
                  <h3 className="text-sm font-medium text-white">常见相关人物</h3>
                </div>
                {stats.personStats.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {stats.personStats.map((person, index) => (
                      <div
                        key={person.name}
                        className="p-3 rounded-lg bg-white/5 border border-purple-300/10 flex items-center justify-between hover:bg-white/10 transition-all group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] text-purple-400/60 font-serif">
                            #{index + 1}
                          </span>
                          <span className="text-sm text-purple-100/90 truncate">{person.name}</span>
                        </div>
                        <span className="text-xs text-purple-300/60 flex-shrink-0 ml-2">
                          {person.count} 次
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-purple-300/50 text-center py-4">暂无相关人物记录</p>
                )}
              </div>

              {stats.atmosphereWords.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-300" />
                    <h3 className="text-sm font-medium text-white">高频氛围词</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {stats.atmosphereWords.map((item) => (
                      <span
                        key={item.word}
                        className="px-3 py-1.5 rounded-full text-xs bg-purple-500/10 border border-purple-400/20 text-purple-200/80"
                      >
                        {item.word}
                        <span className="ml-1.5 text-purple-400/50">{item.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {stats.tagStats.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag size={16} className="text-amber-300" />
                      <h3 className="text-sm font-medium text-white">热门标签</h3>
                    </div>
                    <span className="text-xs text-purple-300/50">
                      共 {stats.totalTagCount} 次标记
                    </span>
                  </div>
                  <div className="space-y-2">
                    {stats.tagStats.slice(0, 8).map((tagStat) => (
                      <div key={tagStat.tag} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-purple-200/80">{tagStat.tag}</span>
                          <span className="text-purple-300/60">
                            {tagStat.count} 个 ({tagStat.percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${tagStat.percentage}%`,
                              background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.9) 0%, rgba(217, 119, 6, 0.9) 100%)',
                              boxShadow: '0 0 8px rgba(245, 158, 11, 0.3)',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette size={16} className="text-purple-300" />
                    <h3 className="text-sm font-medium text-white">情绪颜色分布</h3>
                  </div>
                  {stats.topColor && (
                    <span className="text-xs text-purple-300/50 flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: stats.topColor.color }}
                      />
                      主色调
                    </span>
                  )}
                </div>
                {stats.colorStats.length > 0 ? (
                  <div className="space-y-2">
                    {stats.colorStats.map((colorStat) => (
                      <div key={colorStat.color} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: colorStat.color,
                                boxShadow: `0 0 8px ${colorStat.color}50`,
                              }}
                            />
                            <span className="text-purple-200/80">{colorStat.color}</span>
                          </div>
                          <span className="text-purple-300/60">
                            {colorStat.count} 个 ({colorStat.percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${colorStat.percentage}%`,
                              backgroundColor: colorStat.color,
                              boxShadow: `0 0 10px ${colorStat.color}40`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-purple-300/50 text-center py-4">暂无情绪颜色记录</p>
                )}
              </div>

              {stats.topColor && (
                <div
                  className="p-4 rounded-xl relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${hexToRgba(stats.topColor.color, 0.15)} 0%, ${hexToRgba(stats.topColor.color, 0.05)} 100%)`,
                    border: `1px solid ${hexToRgba(stats.topColor.color, 0.3)}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: hexToRgba(stats.topColor.color, 0.3),
                        border: `2px solid ${hexToRgba(stats.topColor.color, 0.5)}`,
                        boxShadow: `0 0 20px ${hexToRgba(stats.topColor.color, 0.3)}`,
                      }}
                    >
                      <Star size={20} style={{ color: stats.topColor.color }} />
                    </div>
                    <div>
                      <p className="text-xs text-purple-300/60 mb-0.5">主导情绪色彩</p>
                      <p className="text-base font-medium" style={{ color: stats.topColor.color }}>
                        {stats.topColor.color}
                      </p>
                      <p className="text-xs text-purple-300/50 mt-0.5">
                        出现在 {stats.topColor.count} 个梦境地点中
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link size={16} className="text-purple-300" />
                    <h3 className="text-sm font-medium text-white">关系类型分布</h3>
                  </div>
                  <span className="text-xs text-purple-300/50">
                    共 {stats.totalRelations} 条关系
                  </span>
                </div>
                {stats.totalRelations > 0 ? (
                  <div className="space-y-2">
                    {stats.relationTypeStats.map((relStat) => (
                      <div key={relStat.type} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-purple-200/80 flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: relStat.color }}
                            />
                            {relStat.type}
                          </span>
                          <span className="text-purple-300/60">
                            {relStat.count} 条 ({relStat.percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${relStat.percentage}%`,
                              backgroundColor: relStat.color,
                              boxShadow: `0 0 10px ${hexToRgba(relStat.color, 0.4)}`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-purple-300/50 text-center py-4">暂无关系数据</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
