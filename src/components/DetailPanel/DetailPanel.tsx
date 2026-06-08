import { X, Edit3, Trash2, Calendar, Users, Sparkles, Clock, Tag, Link, Plus } from 'lucide-react';
import { useDreamStore } from '@/store/dreamStore';
import { FREQUENCY_OPTIONS, RELATION_TYPE_COLORS } from '@/types';
import { hexToRgba } from '@/utils/storage';

export function DetailPanel() {
  const selectedLocationId = useDreamStore((state) => state.selectedLocationId);
  const locations = useDreamStore((state) => state.locations);
  const relations = useDreamStore((state) => state.relations);
  const selectLocation = useDreamStore((state) => state.selectLocation);
  const openForm = useDreamStore((state) => state.openForm);
  const deleteLocation = useDreamStore((state) => state.deleteLocation);
  const toggleTagFilter = useDreamStore((state) => state.toggleTagFilter);
  const setSidebarOpen = useDreamStore((state) => state.setSidebarOpen);
  const openRelationForm = useDreamStore((state) => state.openRelationForm);
  const deleteRelation = useDreamStore((state) => state.deleteRelation);
  const selectRelation = useDreamStore((state) => state.selectRelation);
  const selectedRelationId = useDreamStore((state) => state.selectedRelationId);

  const location = locations.find((loc) => loc.id === selectedLocationId);

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

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-purple-300/60 text-xs uppercase tracking-wider">
              <Clock size={12} />
              <span>出现频率</span>
            </div>
            <div className="flex gap-2">
              {FREQUENCY_OPTIONS.map((freq, index) => (
                <div
                  key={freq}
                  className="flex-1 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      index <= FREQUENCY_OPTIONS.indexOf(location.frequency as (typeof FREQUENCY_OPTIONS)[number])
                        ? location.emotionColor
                        : 'rgba(255, 255, 255, 0.1)',
                    transition: 'background-color 0.3s',
                  }}
                />
              ))}
            </div>
            <p className="text-sm text-purple-200/80">{location.frequency}</p>
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
            <p className="text-sm text-purple-100/90 leading-relaxed">
              {location.relatedPeople || '暂无记录'}
            </p>
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
                    onClick={() => {
                      toggleTagFilter(tag);
                      setSidebarOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-full text-xs text-white transition-all hover:scale-105"
                    style={{
                      backgroundColor: hexToRgba(location.emotionColor, 0.25),
                      border: `1px solid ${hexToRgba(location.emotionColor, 0.5)}`,
                    }}
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
              <button
                onClick={() => openRelationForm(undefined, location.id)}
                className="p-1.5 rounded-lg text-purple-300/60 hover:text-purple-200 hover:bg-white/10 transition-all"
                title="添加关系"
              >
                <Plus size={14} />
              </button>
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

                  return (
                    <div
                      key={rel.id}
                      className={`p-3 rounded-lg transition-all cursor-pointer group ${
                        isSelected ? 'bg-white/10' : 'bg-white/5 hover:bg-white/10'
                      }`}
                      style={{
                        border: `1px solid ${isSelected ? hexToRgba(typeColor, 0.5) : 'rgba(150, 130, 200, 0.1)'}`,
                      }}
                      onClick={() => {
                        selectRelation(rel.id);
                        selectLocation(null);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                          style={{
                            backgroundColor: hexToRgba(relatedLoc.emotionColor, 0.2),
                            border: `1px solid ${hexToRgba(relatedLoc.emotionColor, 0.4)}`,
                          }}
                        >
                          <Sparkles size={14} style={{ color: relatedLoc.emotionColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">
                            {relatedLoc.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{
                                backgroundColor: hexToRgba(typeColor, 0.15),
                                color: typeColor,
                                border: `1px solid ${hexToRgba(typeColor, 0.3)}`,
                              }}
                            >
                              {rel.type}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openRelationForm(rel);
                            }}
                            className="p-1.5 rounded-lg text-purple-300/60 hover:text-purple-200 hover:bg-white/10 transition-all"
                            title="编辑"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRelation(rel.id);
                            }}
                            className="p-1.5 rounded-lg text-red-400/70 hover:text-red-300 hover:bg-red-500/10 transition-all"
                            title="删除"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      {rel.description && (
                        <p className="mt-2 text-xs text-purple-200/60 line-clamp-2 pl-11">
                          {rel.description}
                        </p>
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
