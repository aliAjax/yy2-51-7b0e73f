import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Save, Plus, Tag } from 'lucide-react';
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
  const locations = useDreamStore((state) => state.locations);

  const [formData, setFormData] = useState({
    name: '',
    atmosphere: '',
    frequency: '偶尔' as string,
    relatedPeople: '',
    memoryFragment: '',
    emotionColor: '#9b59b6',
    tags: [] as string[],
  });

  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const [errors, setErrors] = useState<{ name?: string }>({});

  const existingTags = useMemo(() => {
    const tagsSet = new Set<string>();
    locations.forEach((loc) => {
      loc.tags.forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [locations]);

  const tagSuggestions = useMemo(() => {
    const input = tagInput.trim().toLowerCase();
    if (!input) {
      return existingTags.filter(
        (tag) => !formData.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
      );
    }
    return existingTags
      .filter((tag) => {
        const tagLower = tag.toLowerCase();
        const alreadySelected = formData.tags.some((t) => t.toLowerCase() === tagLower);
        return !alreadySelected && tagLower.includes(input);
      })
      .sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const aStartsWith = aLower.startsWith(input);
        const bStartsWith = bLower.startsWith(input);
        if (aStartsWith !== bStartsWith) return aStartsWith ? -1 : 1;
        return aLower.localeCompare(bLower);
      });
  }, [tagInput, existingTags, formData.tags]);

  const caseVariantWarning = useMemo(() => {
    const input = tagInput.trim();
    if (!input) return null;
    const inputLower = input.toLowerCase();
    const existingMatch = existingTags.find(
      (tag) => tag.toLowerCase() === inputLower && tag !== input
    );
    if (existingMatch && !formData.tags.some((t) => t.toLowerCase() === inputLower)) {
      return existingMatch;
    }
    return null;
  }, [tagInput, existingTags, formData.tags]);

  useEffect(() => {
    if (editingLocation) {
      setFormData({
        name: editingLocation.name,
        atmosphere: editingLocation.atmosphere,
        frequency: editingLocation.frequency,
        relatedPeople: editingLocation.relatedPeople,
        memoryFragment: editingLocation.memoryFragment,
        emotionColor: editingLocation.emotionColor,
        tags: editingLocation.tags || [],
      });
    } else {
      setFormData({
        name: '',
        atmosphere: '',
        frequency: '偶尔',
        relatedPeople: '',
        memoryFragment: '',
        emotionColor: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
        tags: [],
      });
    }
    setTagInput('');
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setErrors({});
  }, [editingLocation, isFormOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        tagInputRef.current &&
        !tagInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestions]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [tagInput]);

  if (!isFormOpen) return null;

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const addTagFromSuggestion = (tag: string) => {
    if (!formData.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setTagInput('');
    setHighlightedIndex(-1);
    setShowSuggestions(true);
    tagInputRef.current?.focus();
  };

  const addTag = () => {
    const trimmedTag = tagInput.trim();
    if (!trimmedTag) {
      setShowSuggestions(false);
      return;
    }

    const inputLower = trimmedTag.toLowerCase();
    const exactExisting = existingTags.find((tag) => tag.toLowerCase() === inputLower);

    const finalTag = exactExisting || trimmedTag;

    if (!formData.tags.some((t) => t.toLowerCase() === inputLower)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, finalTag] }));
    }
    setTagInput('');
    setHighlightedIndex(-1);
    setShowSuggestions(true);
    tagInputRef.current?.focus();
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (tagSuggestions.length > 0) {
        setShowSuggestions(true);
        setHighlightedIndex((prev) =>
          prev < tagSuggestions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (tagSuggestions.length > 0) {
        setShowSuggestions(true);
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : tagSuggestions.length - 1
        );
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showSuggestions && highlightedIndex >= 0 && tagSuggestions[highlightedIndex]) {
        addTagFromSuggestion(tagSuggestions[highlightedIndex]);
      } else {
        addTag();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    } else if (e.key === 'Backspace' && !tagInput && formData.tags.length > 0) {
      removeTag(formData.tags[formData.tags.length - 1]);
    }
  };

  const highlightTagMatch = (tag: string, input: string) => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return tag;
    const lowerTag = tag.toLowerCase();
    const lowerInput = trimmedInput.toLowerCase();
    const index = lowerTag.indexOf(lowerInput);
    if (index === -1) return tag;
    return (
      <>
        {tag.slice(0, index)}
        <span className="text-purple-300 font-medium">
          {tag.slice(index, index + trimmedInput.length)}
        </span>
        {tag.slice(index + trimmedInput.length)}
      </>
    );
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
        tags: formData.tags,
      });
    } else {
      addLocation({
        name: formData.name.trim(),
        atmosphere: formData.atmosphere.trim(),
        frequency: formData.frequency,
        relatedPeople: formData.relatedPeople.trim(),
        memoryFragment: formData.memoryFragment.trim(),
        emotionColor: formData.emotionColor,
        tags: formData.tags,
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
            <label className="text-sm text-purple-200/70 block flex items-center gap-2">
              <Tag size={14} />
              标签
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-white"
                  style={{
                    backgroundColor: hexToRgba(formData.emotionColor, 0.25),
                    border: `1px solid ${hexToRgba(formData.emotionColor, 0.5)}`,
                  }}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 hover:text-white/70 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="relative">
              <div className="flex gap-2">
                <input
                  ref={tagInputRef}
                  type="text"
                  value={tagInput}
                  onChange={(e) => {
                    setTagInput(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="输入标签，按回车添加..."
                  className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-purple-300/30 bg-white/5 border border-purple-300/20 focus:border-purple-500/50 focus:bg-white/10 focus:outline-none transition-all"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-3 py-2 rounded-lg text-sm text-white bg-purple-500/30 border border-purple-400/50 hover:bg-purple-500/50 transition-all flex items-center gap-1"
                >
                  <Plus size={16} />
                  添加
                </button>
              </div>

              {showSuggestions && (tagSuggestions.length > 0 || caseVariantWarning) && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-10 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-purple-300/20"
                  style={{
                    background: 'linear-gradient(145deg, rgba(30, 30, 63, 0.98) 0%, rgba(15, 15, 42, 0.99) 100%)',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 30px rgba(100, 50, 150, 0.15)',
                  }}
                >
                  {caseVariantWarning && (
                    <div
                      className="px-3 py-2 border-b border-purple-300/10"
                    >
                      <div className="text-xs text-amber-300/80 mb-1">
                        检测到相似标签，建议使用已有标签：
                      </div>
                      <button
                        type="button"
                        onClick={() => addTagFromSuggestion(caseVariantWarning)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white hover:scale-105 transition-transform"
                        style={{
                          backgroundColor: hexToRgba('#f39c12', 0.25),
                          border: `1px solid ${hexToRgba('#f39c12', 0.5)}`,
                        }}
                      >
                        {caseVariantWarning}
                      </button>
                    </div>
                  )}

                  {tagSuggestions.length > 0 && (
                    <div className="py-1">
                      {!caseVariantWarning && (
                        <div className="px-3 py-1 text-xs text-purple-300/50">
                          {tagInput.trim() ? '匹配的标签建议' : '已有标签'}
                        </div>
                      )}
                      {tagSuggestions.map((tag, index) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => addTagFromSuggestion(tag)}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          className={`w-full flex items-center justify-between px-3 py-1.5 text-sm text-left transition-colors ${
                            index === highlightedIndex
                              ? 'bg-purple-500/20 text-white'
                              : 'text-purple-200/70 hover:bg-white/5 hover:text-purple-100'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Tag size={12} className="text-purple-400/60" />
                            {highlightTagMatch(tag, tagInput)}
                          </span>
                          {index === highlightedIndex && (
                            <span className="text-xs text-purple-300/50">
                              Enter 添加
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-purple-300/40">
              输入时会显示已有标签建议，避免重复和大小写不一致。↑↓ 选择，Enter 添加
            </p>
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
