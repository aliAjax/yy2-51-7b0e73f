import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useDreamStore } from '@/store/dreamStore';
import { FREQUENCY_OPTIONS } from '@/types';
import { hexToRgba } from '@/utils/storage';

const PRESET_COLORS = [
  '#9b59b6',
  '#3498db',
  '#1abc9c',
  '#e74c3c',
  '#f39c12',
  '#e91e63',
  '#8e44ad',
  '#2ecc71',
  '#34495e',
  '#e67e22',
  '#00bcd4',
  '#673ab7',
];

export function LocationForm() {
  const isFormOpen = useDreamStore((state) => state.isFormOpen);
  const editingLocation = useDreamStore((state) => state.editingLocation);
  const closeForm = useDreamStore((state) => state.closeForm);
  const addLocation = useDreamStore((state) => state.addLocation);
  const updateLocation = useDreamStore((state) => state.updateLocation);

  const [formData, setFormData] = useState({
    name: '',
    atmosphere: '',
    frequency: '偶尔' as string,
    relatedPeople: '',
    memoryFragment: '',
    emotionColor: '#9b59b6',
  });

  const [errors, setErrors] = useState<{ name?: string }>({});

  useEffect(() => {
    if (editingLocation) {
      setFormData({
        name: editingLocation.name,
        atmosphere: editingLocation.atmosphere,
        frequency: editingLocation.frequency,
        relatedPeople: editingLocation.relatedPeople,
        memoryFragment: editingLocation.memoryFragment,
        emotionColor: editingLocation.emotionColor,
      });
    } else {
      setFormData({
        name: '',
        atmosphere: '',
        frequency: '偶尔',
        relatedPeople: '',
        memoryFragment: '',
        emotionColor: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      });
    }
    setErrors({});
  }, [editingLocation, isFormOpen]);

  if (!isFormOpen) return null;

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setErrors({ name: '请输入地点名称' });
      return;
    }

    if (editingLocation) {
      updateLocation(editingLocation.id, {
        name: formData.name.trim(),
        atmosphere: formData.atmosphere.trim(),
        frequency: formData.frequency,
        relatedPeople: formData.relatedPeople.trim(),
        memoryFragment: formData.memoryFragment.trim(),
        emotionColor: formData.emotionColor,
      });
    } else {
      addLocation({
        name: formData.name.trim(),
        atmosphere: formData.atmosphere.trim(),
        frequency: formData.frequency,
        relatedPeople: formData.relatedPeople.trim(),
        memoryFragment: formData.memoryFragment.trim(),
        emotionColor: formData.emotionColor,
      });
    }

    closeForm();
  };

  const isEditing = !!editingLocation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeForm}
      />

      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-hidden rounded-2xl animate-scale-in"
        style={{
          background: `linear-gradient(145deg, ${hexToRgba('#1e1e3f', 0.95)} 0%, ${hexToRgba('#0f0f2a', 0.98)} 100%)`,
          border: '1px solid rgba(150, 130, 200, 0.2)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 100px rgba(100, 50, 150, 0.2)',
        }}
      >
        <div
          className="relative h-20 flex items-center justify-between px-6"
          style={{
            background: `linear-gradient(135deg, ${hexToRgba(formData.emotionColor, 0.3)} 0%, transparent 100%)`,
          }}
        >
          <h2 className="text-xl font-serif text-white">
            {isEditing ? '编辑梦境地点' : '记录新的梦境地点'}
          </h2>
          <button
            onClick={closeForm}
            className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-8rem)]">
          <div className="space-y-2">
            <label className="text-sm text-purple-200/70 block">
              地点名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="比如：古老的图书馆"
              className={`w-full px-4 py-3 rounded-lg text-white placeholder-purple-300/30 focus:outline-none transition-all ${
                errors.name
                  ? 'bg-red-500/10 border border-red-500/50 focus:border-red-500'
                  : 'bg-white/5 border border-purple-300/20 focus:border-purple-500/50 focus:bg-white/10'
              }`}
              style={{ fontFamily: 'inherit' }}
            />
            {errors.name && (
              <p className="text-xs text-red-400">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-purple-200/70 block">情绪颜色</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleChange('emotionColor', color)}
                  className={`w-8 h-8 rounded-full transition-all hover:scale-110 ${
                    formData.emotionColor === color
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1e1e3f] scale-110'
                      : ''
                  }`}
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 0 12px ${hexToRgba(color, 0.5)}`,
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <input
                type="color"
                value={formData.emotionColor}
                onChange={(e) => handleChange('emotionColor', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent"
              />
              <span className="text-xs text-purple-300/50 font-mono">
                {formData.emotionColor}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-purple-200/70 block">出现频率</label>
            <div className="grid grid-cols-4 gap-2">
              {FREQUENCY_OPTIONS.map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => handleChange('frequency', freq)}
                  className={`py-2 px-3 rounded-lg text-xs transition-all ${
                    formData.frequency === freq
                      ? 'text-white'
                      : 'text-purple-300/60 hover:text-purple-200'
                  }`}
                  style={{
                    backgroundColor:
                      formData.frequency === freq
                        ? hexToRgba(formData.emotionColor, 0.3)
                        : 'rgba(255, 255, 255, 0.05)',
                    border:
                      formData.frequency === freq
                        ? `1px solid ${hexToRgba(formData.emotionColor, 0.6)}`
                        : '1px solid rgba(150, 130, 200, 0.15)',
                  }}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-purple-200/70 block">氛围描述</label>
            <input
              type="text"
              value={formData.atmosphere}
              onChange={(e) => handleChange('atmosphere', e.target.value)}
              placeholder="比如：神秘、静谧、略带不安..."
              className="w-full px-4 py-3 rounded-lg text-white placeholder-purple-300/30 bg-white/5 border border-purple-300/20 focus:border-purple-500/50 focus:bg-white/10 focus:outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-purple-200/70 block">相关人物</label>
            <input
              type="text"
              value={formData.relatedPeople}
              onChange={(e) => handleChange('relatedPeople', e.target.value)}
              placeholder="梦里出现的人..."
              className="w-full px-4 py-3 rounded-lg text-white placeholder-purple-300/30 bg-white/5 border border-purple-300/20 focus:border-purple-500/50 focus:bg-white/10 focus:outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-purple-200/70 block">醒来后的记忆片段</label>
            <textarea
              value={formData.memoryFragment}
              onChange={(e) => handleChange('memoryFragment', e.target.value)}
              placeholder="记录那些醒来后依然清晰的梦境碎片..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg text-white placeholder-purple-300/30 bg-white/5 border border-purple-300/20 focus:border-purple-500/50 focus:bg-white/10 focus:outline-none transition-all resize-none"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={closeForm}
              className="flex-1 py-3 px-4 rounded-lg text-sm font-medium text-purple-200/70 bg-white/5 border border-purple-300/20 hover:bg-white/10 transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 transition-all hover:scale-105"
              style={{
                backgroundColor: formData.emotionColor,
                boxShadow: `0 4px 15px ${hexToRgba(formData.emotionColor, 0.4)}`,
              }}
            >
              <Save size={16} />
              {isEditing ? '保存修改' : '记录梦境'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
