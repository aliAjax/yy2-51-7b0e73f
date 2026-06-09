import { X, Edit3, Trash2, Calendar, Users, Sparkles, Clock, Tag, Link, Plus, ChevronDown, ChevronUp, ArrowRight, Network } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useDreamStore } from '@/store/dreamStore';
import { FREQUENCY_OPTIONS, RELATION_TYPE_COLORS, type RelationType } from '@/types';
import { hexToRgba } from '@/utils/storage';

export function DetailPanel() {
  const [expandedRelations, setExpandedRelations] = useState<Set<string>>(new Set());
  const selectedLocationId = useDreamStore((state) => state.selectedLocationId);

  useEffect(() => {
    setExpandedRelations(new Set());
  }, [selectedLocationId]);
  const locations = useDreamStore((state) => state.locations);
  const relations = useDreamStore((state) => state.relations);
  const selectLocation = useDreamStore((state) => state.selectLocation);
  const openForm = useDreamStore((state) => state.openForm);
  const deleteLocation = useDreamStore((state) => state.deleteLocation);
  const toggleTagFilter = useDreamStore((state) => state.toggleTagFilter);
  const clearTagFilter = useDreamStore((state) => state.clearTagFilter);
  const setFrequencyFilter = useDreamStore((state) => state.setFrequencyFilter);
  const setPersonFilter = useDreamStore((state) => state.setPersonFilter);
  const toggleRelationTypeFilter = useDreamStore((state) => state.toggleRelationTypeFilter);
  const clearRelationTypeFilter = useDreamStore((state) => state.clearRelationTypeFilter);
  const setSidebarOpen = useDreamStore((state) => state.setSidebarOpen);
  const openRelationForm = useDreamStore((state) => state.openRelationForm);
  const deleteRelation = useDreamStore((state) => state.deleteRelation);
  const selectRelation = useDreamStore((state) => state.selectRelation);
  const selectedRelationId = useDreamStore((state) => state.selectedRelationId);
  const isExploreMode = useDreamStore((state) => state.isExploreMode);
  const exploreCenterId = useDreamStore((state) => state.exploreCenterId);
  const enterExploreMode = useDreamStore((state) => state.enterExploreMode);
  const exitExploreMode = useDreamStore((state) => state.exitExploreMode);

  const toggleExpandRelation = (relationId: string) => {
    setExpandedRelations((prev) => {
      const next = new Set(prev);
      if (next.has(relationId)) {
        next.delete(relationId);
      } else {
        next.add(relationId);
      }
      return next;
    });
  };

  const handleFrequencyClick = () => {
    if (!location) return;
    setFrequencyFilter(location.frequency);
    setSidebarOpen(true);
    selectLocation(null);
  };

  const handlePersonClick = (personName: string) => {
    setPersonFilter(personName);
    setSidebarOpen(true);
    selectLocation(null);
  };

  const handleTagClick = (tag: string) => {
    clearTagFilter();
    toggleTagFilter(tag);
    setSidebarOpen(true);
    selectLocation(null);
  };

  const handleRelationTypeClick = (type: RelationType, e: React.MouseEvent) => {
    e.stopPropagation();
    clearRelationTypeFilter();
    toggleRelationTypeFilter(type);
    setSidebarOpen(true);
    selectLocation(null);
    selectRelation(null);
  };

  const location = locations.find((loc) => loc.id === selectedLocationId);

  const parsedPeople = location?.relatedPeople
    ? location.relatedPeople
        .split(/[,，、\s]+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    : [];

  const locationRelations = selectedLocationId
    ? relations.filter(
        (rel) => rel.fromId === selectedLocationId || rel.toId === selectedLocationId
      )
    : [];

  const getRelatedLocation = (relationId: string) => {
    const rel = relations.find((r) => r.id === relationId);
    if (!rel) return null;
    const otherId = rel.fromId === selectedLocationId ? rel.toId : rel.fromId;
    return locations.find((loc) => loc.id === otherId);
  };

  const handleDeleteRelation = (relationId: string) => {
    if (confirm('确定要删除这条关系吗？')) {
      deleteRelation(relationId);
    }
  };

  if (!location) return null;

  const handleDelete = () => {
    if (confirm(`确定要删除「${location.name}」吗？`)) {
      deleteLocation(location.id);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="absolute top-0 right-0 h-full w-80 md:w-96 z-30 animate-slide-in">
      <div
        className="h-full flex flex-col overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba('#1a1a3e', 0.9)} 0%, ${hexToRgba('#0d0d1f', 0.95)} 100%)`,
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(150, 130, 200, 0.2)',
          boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div
          className="relative h-32 flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${hexToRgba(location.emotionColor, 0.8)} 0%, ${hexToRgba(location.emotionColor, 0.4)} 100%)`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />

          <button
            onClick={() => selectLocation(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
          >
            <X size={20} />
          </button>

          <div className="absolute bottom-4 left-6 right-6">
            <div className="flex items-center gap-2 mb-1">
              {isExploreMode && exploreCenterId === location.id && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white flex items-center gap-1"
                  style={{
                    backgroundColor: 'rgba(52, 152, 219, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                  }}
                >
                  <Network size={10} />
                  探索中心
                </span>
              )}
            </div>
            <h2 className="text-2xl font-serif text-white font-medium tracking-wide">
              {location.name}
            </h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: hexToRgba(location.emotionColor, 0.2),
                border: `2px solid ${hexToRgba(location.emotionColor, 0.5)}`,
              }}
            >
              <Sparkles size={20} style={{ color: location.emotionColor }} />
            </div>
            <div>
              <p className="text-xs text-purple-300/60 uppercase tracking-wider">情绪颜色</p>
              <p className="text-sm text-white font-medium">{location.emotionColor}</p>
            </div>
          </div>

          <div className="space-y-2 group cursor-pointer transition-colors hover:text-white" onClick={handleFrequencyClick}>
            <div className="flex items-center gap-2 text-purple-300/60 text-xs uppercase tracking-wider group-hover:text-purple-200 transition-colors">
              <Clock size={12} />
              <span>出现频率</span>
              <span className="text-[10px] text-purple-300/40 group-hover:text-purple-200/60 transition-colors">· 点击筛选</span>
            </div>
            <div className="flex gap-2">
              {FREQUENCY_OPTIONS.map((freq, index) => (
                <div
                  key={freq}
                  className="flex-1 h-2 rounded-full transition-all group-hover:h-2.5"
                  style={{
                    backgroundColor:
                      index <= FREQUENCY_OPTIONS.indexOf(location.frequency as (typeof FREQUENCY_OPTIONS)[number])
                        ? location.emotionColor
                        : 'rgba(255, 255, 255, 0.1)',
                    transition: 'background-color 0.3s, height 0.2s',
                  }}
                />
              ))}
            </div>
            <p className="text-sm text-purple-200/80 group-hover:text-white transition-colors">{location.frequency}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-purple-300/60 text-xs uppercase tracking-wider">
              <Sparkles size={12} />
              <span>氛围</span>
            </div>
            <p className="text-sm text-purple-100/90 leading-relaxed">
              {location.atmosphere || '暂无描述'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-purple-300/60 text-xs uppercase tracking-wider">
              <Users size={12} />
              <span>相关人物</span>
            </div>
            {parsedPeople.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {parsedPeople.map((person) => (
                  <button
                    key={person}
                    onClick={() => handlePersonClick(person)}
                    className="px-2.5 py-1 rounded-full text-xs text-white transition-all hover:scale-105"
                    style={{
                      backgroundColor: hexToRgba('#9b59b6', 0.2),
                      border: '1px solid rgba(155, 89, 182, 0.4)',
                    }}
                    title={`点击筛选包含「${person}」的梦境`}
                  >
                    {person}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-purple-300/40 italic">暂无记录</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-purple-300/60 text-xs uppercase tracking-wider">
              <Tag size={12} />
              <span>标签</span>
            </div>
            {location.tags && location.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {location.tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className="px-2.5 py-1 rounded-full text-xs text-white transition-all hover:scale-105"
                    style={{
                      backgroundColor: hexToRgba(location.emotionColor, 0.25),
                      border: `1px solid ${hexToRgba(location.emotionColor, 0.5)}`,
                    }}
                    title={`点击筛选包含「${tag}」标签的梦境`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-purple-300/40 italic">暂无标签</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-purple-300/60 text-xs uppercase tracking-wider">
              <Calendar size={12} />
              <span>记忆片段</span>
            </div>
            <div
              className="p-4 rounded-lg italic text-sm text-purple-100/80 leading-relaxed"
              style={{
                background: 'rgba(150, 130, 200, 0.05)',
                borderLeft: `3px solid ${location.emotionColor}`,
              }}
            >
              {location.memoryFragment || '醒来后记忆已经模糊...'}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-300/60 text-xs uppercase tracking-wider">
                <Link size={12} />
                <span>相关梦境</span>
                <span className="text-purple-300/40">({locationRelations.length})</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (isExploreMode && exploreCenterId === location.id) {
                      exitExploreMode();
                    } else {
                      enterExploreMode(location.id);
                    }
                  }}
                  className={`p-1.5 rounded-lg transition-all ${
                    isExploreMode && exploreCenterId === location.id
                      ? 'text-blue-300 bg-blue-500/20 border border-blue-400/30'
                      : 'text-purple-300/60 hover:text-purple-200 hover:bg-white/10'
                  }`}
                  title={isExploreMode && exploreCenterId === location.id ? '退出关系探索' : '进入关系探索模式'}
                >
                  <Network size={14} />
                </button>
                <button
                  onClick={() => openRelationForm(undefined, location.id)}
                  className="p-1.5 rounded-lg text-purple-300/60 hover:text-purple-200 hover:bg-white/10 transition-all"
                  title="添加关系"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {locationRelations.length === 0 ? (
              <div className="p-4 rounded-lg text-center">
                <p className="text-sm text-purple-300/40 italic">暂无关联梦境</p>
                <button
                  onClick={() => openRelationForm(undefined, location.id)}
                  className="mt-2 text-xs text-purple-300/60 hover:text-purple-200 transition-colors"
                >
                  + 添加第一条关系
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {locationRelations.map((rel) => {
                  const relatedLoc = getRelatedLocation(rel.id);
                  if (!relatedLoc) return null;
                  const typeColor = RELATION_TYPE_COLORS[rel.type];
                  const isSelected = selectedRelationId === rel.id;
                  const isExpanded = expandedRelations.has(rel.id);
                  const hasDescription = rel.description && rel.description.trim().length > 0;

                  const handleJumpToLocation = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    selectRelation(null);
                    selectLocation(relatedLoc.id);
                  };

                  const isCurrentExploreCenter = isExploreMode && exploreCenterId === relatedLoc.id;
                  return (
                    <div
                      key={rel.id}
                      className={`p-3 rounded-lg transition-all cursor-pointer group ${
                        isSelected ? 'bg-white/10' : 'bg-white/5 hover:bg-white/10'
                      }`}
                      style={{
                        border: `1px solid ${
                          isSelected
                            ? hexToRgba(typeColor, 0.5)
                            : isCurrentExploreCenter
                            ? hexToRgba('#3498db', 0.5)
                            : 'rgba(150, 130, 200, 0.1)'
                        }`,
                        backgroundColor: isCurrentExploreCenter ? hexToRgba('#3498db', 0.08) : undefined,
                      }}
                      onClick={() => {
                        selectRelation(rel.id);
                        selectLocation(null);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleJumpToLocation}
                          className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center hover:scale-110 transition-transform"
                          style={{
                            backgroundColor: hexToRgba(relatedLoc.emotionColor, 0.2),
                            border: `1px solid ${hexToRgba(relatedLoc.emotionColor, 0.4)}`,
                          }}
                          title={`跳转到 ${relatedLoc.name}`}
                        >
                          <Sparkles size={14} style={{ color: relatedLoc.emotionColor }} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={handleJumpToLocation}
                            className="text-sm text-white font-medium truncate hover:underline transition-colors text-left"
                            title={`跳转到 ${relatedLoc.name}`}
                          >
                            {relatedLoc.name}
                          </button>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <button
                              onClick={(e) => handleRelationTypeClick(rel.type, e)}
                              className="text-[10px] px-1.5 py-0.5 rounded-full transition-all hover:scale-110"
                              style={{
                                backgroundColor: hexToRgba(typeColor, 0.15),
                                color: typeColor,
                                border: `1px solid ${hexToRgba(typeColor, 0.3)}`,
                              }}
                              title={`点击筛选「${rel.type}」类型的关系`}
                            >
                              {rel.type}
                            </button>
                            {isCurrentExploreCenter && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full text-white"
                                style={{
                                  backgroundColor: 'rgba(52, 152, 219, 0.5)',
                                  border: '1px solid rgba(52, 152, 219, 0.6)',
                                }}
                              >
                                探索中心
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (hasDescription) {
                                toggleExpandRelation(rel.id);
                              }
                            }}
                            className={`p-1.5 rounded-lg transition-all ${
                              hasDescription
                                ? 'text-purple-300/60 hover:text-purple-200 hover:bg-white/10'
                                : 'text-purple-300/20 cursor-default'
                            } ${isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                            title={hasDescription ? (isExpanded ? '收起描述' : '展开描述') : '暂无描述'}
                          >
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                          <button
                            onClick={handleJumpToLocation}
                            className="p-1.5 rounded-lg text-purple-300/60 hover:text-purple-200 hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
                            title={`跳转到 ${relatedLoc.name}`}
                          >
                            <ArrowRight size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openRelationForm(rel);
                            }}
                            className="p-1.5 rounded-lg text-purple-300/60 hover:text-purple-200 hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
                            title="编辑"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRelation(rel.id);
                            }}
                            className="p-1.5 rounded-lg text-red-400/70 hover:text-red-300 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                            title="删除"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      {hasDescription && (
                        <div
                          className="pl-11 transition-all duration-300 ease-in-out"
                          style={{
                            maxHeight: isExpanded ? 'none' : '3.5rem',
                            overflow: isExpanded ? 'visible' : 'hidden',
                          }}
                        >
                          <p
                            className={`mt-2 text-xs text-purple-200/70 leading-relaxed ${
                              isExpanded ? '' : 'line-clamp-2'
                            }`}
                          >
                            {rel.description}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandRelation(rel.id);
                            }}
                            className="mt-1 text-[10px] text-purple-300/60 hover:text-purple-200 transition-colors"
                          >
                            {isExpanded ? '收起' : '展开查看完整描述'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-purple-300/10">
            <p className="text-xs text-purple-300/40">
              创建于 {formatDate(location.createdAt)}
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-purple-300/10 flex gap-3">
          <button
            onClick={() => openForm(location)}
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all hover:scale-105"
            style={{
              backgroundColor: hexToRgba(location.emotionColor, 0.2),
              color: location.emotionColor,
              border: `1px solid ${hexToRgba(location.emotionColor, 0.4)}`,
            }}
          >
            <Edit3 size={16} />
            编辑
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/30 flex items-center justify-center gap-2 transition-all hover:bg-red-500/20"
          >
            <Trash2 size={16} />
            删除
          </button>
        </div>
      </div>
    </div>
  );
}
