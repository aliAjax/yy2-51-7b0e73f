import { useEffect, useCallback, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Clock, BarChart3, Repeat } from 'lucide-react';
import type { DreamLocation } from '@/types';
import { hexToRgba, getContrastColor } from '@/utils/storage';

export type PlaybackSortMode = 'time' | 'frequency';

interface DreamPlaybackProps {
  locations: DreamLocation[];
  currentIndex: number;
  isPlaying: boolean;
  isLooping: boolean;
  sortMode: PlaybackSortMode;
  duration: number;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
  onSortModeChange: (mode: PlaybackSortMode) => void;
  onDurationChange: (duration: number) => void;
  onLoopToggle: () => void;
}

export function DreamPlayback({
  locations,
  currentIndex,
  isPlaying,
  isLooping,
  sortMode,
  duration,
  onPlayPause,
  onPrev,
  onNext,
  onExit,
  onSortModeChange,
  onDurationChange,
  onLoopToggle,
}: DreamPlaybackProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const currentLocation = locations[currentIndex];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const newIndex = Math.floor(ratio * locations.length);
      const clampedIndex = Math.max(0, Math.min(locations.length - 1, newIndex));
      if (clampedIndex !== currentIndex) {
        const diff = clampedIndex - currentIndex;
        if (diff > 0) {
          for (let i = 0; i < diff; i++) onNext();
        } else {
          for (let i = 0; i < -diff; i++) onPrev();
        }
      }
    },
    [currentIndex, locations.length, onNext, onPrev]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        onPlayPause();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPlayPause, onPrev, onNext, onExit]);

  if (!currentLocation) return null;

  const textColor = getContrastColor(currentLocation.emotionColor);
  const progress = ((currentIndex + 1) / locations.length) * 100;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        className="absolute top-0 left-0 right-0 p-4 md:p-6 pointer-events-auto"
        style={{
          background: `linear-gradient(to bottom, rgba(5, 5, 16, 0.9) 0%, rgba(5, 5, 16, 0) 100%)`,
        }}
      >
        <div className="flex items-start justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: currentLocation.emotionColor }}
            />
            <span className="text-purple-200/80 text-sm font-serif">梦境回顾</span>
            <span className="text-purple-300/50 text-xs">
              {currentIndex + 1} / {locations.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-purple-300/20">
              <button
                onClick={() => onSortModeChange('time')}
                className={`px-2 py-1 rounded text-xs transition-all ${
                  sortMode === 'time'
                    ? 'bg-purple-500/30 text-purple-100'
                    : 'text-purple-300/60 hover:text-purple-200/80'
                }`}
                title="按创建时间排序"
              >
                <Clock size={14} />
              </button>
              <button
                onClick={() => onSortModeChange('frequency')}
                className={`px-2 py-1 rounded text-xs transition-all ${
                  sortMode === 'frequency'
                    ? 'bg-purple-500/30 text-purple-100'
                    : 'text-purple-300/60 hover:text-purple-200/80'
                }`}
                title="按出现频率排序"
              >
                <BarChart3 size={14} />
              </button>
            </div>

            <select
              value={duration}
              onChange={(e) => onDurationChange(parseInt(e.target.value))}
              className="px-2 py-1.5 rounded-lg text-xs bg-white/5 border border-purple-300/20 text-purple-200/80 focus:outline-none focus:border-purple-400/40"
            >
              <option value={3}>3秒</option>
              <option value={5}>5秒</option>
              <option value={8}>8秒</option>
              <option value={10}>10秒</option>
            </select>

            <button
              onClick={onExit}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-purple-300/60 hover:text-purple-100 hover:bg-white/10 transition-all"
              title="退出播放 (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 p-4 md:p-6 pointer-events-auto"
        style={{
          background: `linear-gradient(to top, rgba(5, 5, 16, 0.95) 0%, rgba(5, 5, 16, 0) 100%)`,
        }}
      >
        <div className="max-w-4xl mx-auto">
          <div
            ref={progressRef}
            className="relative h-1.5 mb-4 rounded-full bg-white/10 cursor-pointer overflow-hidden"
            onClick={handleProgressClick}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                backgroundColor: currentLocation.emotionColor,
                boxShadow: `0 0 10px ${hexToRgba(currentLocation.emotionColor, 0.8)}`,
              }}
            />
            {isPlaying && (
              <div
                className="absolute inset-y-0 rounded-full animate-pulse"
                style={{
                  left: `${progress}%`,
                  width: '20px',
                  transform: 'translateX(-50%)',
                  background: `radial-gradient(circle, ${hexToRgba(currentLocation.emotionColor, 0.8)} 0%, transparent 70%)`,
                }}
              />
            )}
          </div>

          <div className="flex items-end justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div
                className="text-2xl md:text-3xl font-serif font-medium mb-2 truncate"
                style={{ color: currentLocation.emotionColor }}
              >
                {currentLocation.name}
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {currentLocation.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 rounded-full text-xs"
                    style={{
                      backgroundColor: hexToRgba(currentLocation.emotionColor, 0.2),
                      color: currentLocation.emotionColor,
                      border: `1px solid ${hexToRgba(currentLocation.emotionColor, 0.4)}`,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <div className="text-purple-300/50 text-xs">氛围</div>
                  <div className="text-purple-100/90">{currentLocation.atmosphere}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-purple-300/50 text-xs">人物</div>
                  <div className="text-purple-100/90">
                    {currentLocation.relatedPeople || '—'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-purple-300/50 text-xs">出现频率</div>
                  <div className="text-purple-100/90">{currentLocation.frequency}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-purple-300/50 text-xs">创建时间</div>
                  <div className="text-purple-100/90">
                    {formatDate(currentLocation.createdAt)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={onPrev}
                  disabled={currentIndex === 0 && !isLooping}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                    currentIndex === 0 && !isLooping
                      ? 'text-purple-300/20 cursor-not-allowed'
                      : 'text-purple-200/80 hover:text-purple-100 hover:bg-white/10'
                  }`}
                  title="上一条 (←)"
                >
                  <SkipBack size={20} />
                </button>

                <button
                  onClick={onPlayPause}
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105"
                  style={{
                    backgroundColor: currentLocation.emotionColor,
                    color: textColor,
                    boxShadow: `0 0 20px ${hexToRgba(currentLocation.emotionColor, 0.6)}`,
                  }}
                  title={isPlaying ? '暂停 (空格)' : '播放 (空格)'}
                >
                  {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
                </button>

                <button
                  onClick={onNext}
                  disabled={currentIndex === locations.length - 1 && !isLooping}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                    currentIndex === locations.length - 1 && !isLooping
                      ? 'text-purple-300/20 cursor-not-allowed'
                      : 'text-purple-200/80 hover:text-purple-100 hover:bg-white/10'
                  }`}
                  title="下一条 (→)"
                >
                  <SkipForward size={20} />
                </button>

                <button
                  onClick={onLoopToggle}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ml-1 ${
                    isLooping
                      ? 'text-purple-100 bg-purple-500/30'
                      : 'text-purple-300/60 hover:text-purple-200/80 hover:bg-white/10'
                  }`}
                  title={isLooping ? '关闭循环' : '循环播放'}
                >
                  <Repeat size={16} />
                </button>
              </div>

              {currentLocation.memoryFragment && (
                <div
                  className="max-w-xs text-right text-sm italic font-serif opacity-80"
                  style={{ color: currentLocation.emotionColor }}
                >
                  "{currentLocation.memoryFragment}"
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
