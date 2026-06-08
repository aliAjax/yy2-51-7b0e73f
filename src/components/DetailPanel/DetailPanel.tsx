import { X, Edit3, Trash2, Calendar, Users, Sparkles, Clock } from 'lucide-react';
import { useDreamStore } from '@/store/dreamStore';
import { hexToRgba } from '@/utils/storage';

export function DetailPanel() {
  const selectedLocationId = useDreamStore((state) => state.selectedLocationId);
  const locations = useDreamStore((state) => state.locations);
  const selectLocation = useDreamStore((state) => state.selectLocation);
  const openForm = useDreamStore((state) => state.openForm);
  const deleteLocation = useDreamStore((state) => state.deleteLocation);

  const location = locations.find((loc) => loc.id === selectedLocationId);

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
              {['偶尔', '经常', '频繁', '每次都会'].map((freq, index) => (
                <div
                  key={freq}
                  className="flex-1 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      index <= ['偶尔', '经常', '频繁', '每次都会'].indexOf(location.frequency as any)
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
