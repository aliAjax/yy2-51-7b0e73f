import { useState, useEffect, useMemo } from 'react';
import { X, Link, ArrowRightLeft } from 'lucide-react';
import { useDreamStore } from '@/store/dreamStore';
import { RELATION_TYPES, RELATION_TYPE_COLORS } from '@/types';
import type { RelationType } from '@/types';
import { hexToRgba } from '@/utils/storage';

export function RelationForm() {
  const isRelationFormOpen = useDreamStore((state) => state.isRelationFormOpen);
  const editingRelation = useDreamStore((state) => state.editingRelation);
  const defaultFromId = useDreamStore((state) => state.defaultFromId);
  const closeRelationForm = useDreamStore((state) => state.closeRelationForm);
  const addRelation = useDreamStore((state) => state.addRelation);
  const updateRelation = useDreamStore((state) => state.updateRelation);
  const locations = useDreamStore((state) => state.locations);
  const selectedLocationId = useDreamStore((state) => state.selectedLocationId);
  const relations = useDreamStore((state) => state.relations);

  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [type, setType] = useState<RelationType>('相似');
  const [description, setDescription] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const isEditing = !!editingRelation;

  const existingRelationIds = useMemo(() => {
    if (!fromId) return new Set<string>();
    return new Set(
      relations
        .filter((rel) => rel.fromId === fromId || rel.toId === fromId)
        .map((rel) => (rel.fromId === fromId ? rel.toId : rel.fromId))
    );
  }, [relations, fromId]);

  const availableToLocations = useMemo(() => {
    if (!fromId) return locations;
    if (isEditing) {
      return locations.filter((loc) => loc.id !== fromId);
    }
    return locations.filter((loc) => loc.id !== fromId && !existingRelationIds.has(loc.id));
  }, [locations, fromId, existingRelationIds, isEditing]);

  useEffect(() => {
    if (isRelationFormOpen) {
      if (editingRelation) {
        setFromId(editingRelation.fromId);
        setToId(editingRelation.toId);
        setType(editingRelation.type);
        setDescription(editingRelation.description);
      } else {
        const initialFromId = defaultFromId || selectedLocationId || (locations.length > 0 ? locations[0].id : '');
        setFromId(initialFromId);
        setToId('');
        setType('相似');
        setDescription('');
      }
      setShowSuccess(false);
    }
  }, [isRelationFormOpen, editingRelation, defaultFromId, selectedLocationId, locations]);

  const handleSwap = () => {
    const temp = fromId;
    setFromId(toId);
    setToId(temp);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromId || !toId || fromId === toId) {
      return;
    }

    if (editingRelation) {
      updateRelation(editingRelation.id, { type, description });
    } else {
      addRelation({ fromId, toId, type, description });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        closeRelationForm();
      }, 800);
      return;
    }

    closeRelationForm();
  };

  const fromLocation = locations.find((loc) => loc.id === fromId);
  const toLocation = locations.find((loc) => loc.id === toId);

  if (!isRelationFormOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeRelationForm} />

      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl animate-scale-in"
        style={{
          background: `linear-gradient(145deg, ${hexToRgba('#1e1e3f', 0.95)} 0%, ${hexToRgba('#0f0f2a', 0.98)} 100%)`,
          border: '1px solid rgba(150, 130, 200, 0.2)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 100px rgba(100, 50, 150, 0.2)',
        }}
      >
        <div className="relative h-16 flex items-center justify-between px-6 border-b border-purple-300/10">
          <h2 className="text-lg font-serif text-white flex items-center gap-2">
            <Link size={20} className="text-purple-300" />
            {isEditing ? '编辑关系' : '新建关系'}
          </h2>
          <button
            onClick={closeRelationForm}
            className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {showSuccess && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
            <div className="px-8 py-6 rounded-2xl bg-green-500/20 border border-green-500/40 animate-scale-in">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-500/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-green-200 font-medium">关系创建成功</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-3">
            <label className="text-xs text-purple-300/60 uppercase tracking-wider">
              连接的地点
            </label>

            <div className="relative">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <select
                      value={fromId}
                      onChange={(e) => setFromId(e.target.value)}
                      disabled={isEditing}
                      className="w-full px-3 py-2.5 rounded-lg text-sm text-white bg-white/5 border border-purple-300/20 focus:outline-none focus:border-purple-400/50 transition-colors disabled:opacity-50 appearance-none cursor-pointer"
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-center -my-1 relative z-10">
                  <button
                    type="button"
                    onClick={handleSwap}
                    disabled={isEditing || !fromId || !toId}
                    className="p-1.5 rounded-full bg-white/5 border border-purple-300/20 text-purple-300/60 hover:text-purple-200 hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    title="交换起点终点"
                  >
                    <ArrowRightLeft size={14} />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <select
                      value={toId}
                      onChange={(e) => setToId(e.target.value)}
                      disabled={isEditing}
                      className="w-full px-3 py-2.5 rounded-lg text-sm text-white bg-white/5 border border-purple-300/20 focus:outline-none focus:border-purple-400/50 transition-colors disabled:opacity-50 appearance-none cursor-pointer"
                    >
                      <option value="">选择地点...</option>
                      {availableToLocations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {fromLocation && toLocation && (
                <div
                  className="mt-4 p-3 rounded-xl text-sm"
                  style={{
                    background: `linear-gradient(90deg, ${hexToRgba(fromLocation.emotionColor, 0.1)} 0%, ${hexToRgba(toLocation.emotionColor, 0.1)} 100%)`,
                    border: '1px solid rgba(150, 130, 200, 0.15)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: fromLocation.emotionColor }}
                      />
                      <span className="text-purple-200/80">{fromLocation.name}</span>
                    </div>
                    <Link size={14} className="text-purple-400/50" />
                    <div className="flex items-center gap-2">
                      <span className="text-purple-200/80">{toLocation.name}</span>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: toLocation.emotionColor }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {!isEditing && fromId && availableToLocations.length === 0 && (
                <p className="text-xs text-orange-400/70 mt-2">
                  该地点已与其他所有地点建立了关系
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-purple-300/60 uppercase tracking-wider">
              关系类型
            </label>
            <div className="grid grid-cols-4 gap-2">
              {RELATION_TYPES.map((relType) => {
                const color = RELATION_TYPE_COLORS[relType];
                const isSelected = type === relType;
                return (
                  <button
                    key={relType}
                    type="button"
                    onClick={() => setType(relType)}
                    className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                      isSelected ? 'scale-105' : 'hover:scale-102'
                    }`}
                    style={{
                      backgroundColor: isSelected ? hexToRgba(color, 0.25) : 'rgba(255, 255, 255, 0.05)',
                      color: isSelected ? color : 'rgba(200, 180, 255, 0.7)',
                      border: `1px solid ${isSelected ? hexToRgba(color, 0.5) : 'rgba(150, 130, 200, 0.2)'}`,
                      boxShadow: isSelected ? `0 0 15px ${hexToRgba(color, 0.3)}` : 'none',
                    }}
                  >
                    {relType}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-purple-300/60 uppercase tracking-wider">
              描述（可选）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述这个关系的细节，比如梦境中的具体情节..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg text-sm text-white bg-white/5 border border-purple-300/20 focus:outline-none focus:border-purple-400/50 transition-colors resize-none placeholder:text-purple-300/30"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={closeRelationForm}
              className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-purple-200/70 bg-white/5 border border-purple-300/20 hover:bg-white/10 transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!fromId || !toId || fromId === toId}
              className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: 'linear-gradient(135deg, rgba(155, 89, 182, 0.9) 0%, rgba(100, 50, 150, 0.9) 100%)',
                boxShadow: '0 4px 15px rgba(155, 89, 182, 0.3)',
              }}
            >
              {isEditing ? '保存修改' : '创建关系'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
