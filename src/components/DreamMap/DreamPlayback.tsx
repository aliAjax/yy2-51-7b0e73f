import {
  BarChart3,
  Calendar,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import type { DreamLocation } from '@/types';
import { hexToRgba } from '@/utils/storage';

export type PlaybackSortMode = 'createdAt' | 'frequency';

interface DreamPlaybackProps {
  currentLocation: DreamLocation;
  currentIndex: number;
  totalCount: number;
  isPaused: boolean;
  sortMode: PlaybackSortMode;
  onTogglePause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onExit: () => void;
  onSortModeChange: (mode: PlaybackSortMode) => void;
}

export function DreamPlayback({
  currentLocation,
  currentIndex,
  totalCount,
  isPaused,
  sortMode,
  onTogglePause,
  onPrevious,
  onNext,
  onExit,
  onSortModeChange,
}: DreamPlaybackProps) {
  const progress = totalCount > 0 ? ((currentIndex + 1) / totalCount) * 100 : 0;
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < totalCount - 1;

  const handlePanelClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <div className="absolute inset-0 z-40 pointer-events-none">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${currentLocation.positionX}% ${currentLocation.positionY}%, ${hexToRgba(currentLocation.emotionColor, 0.18)} 0%, rgba(5, 5, 16, 0.2) 22%, rgba(5, 5, 16, 0.66) 100%)`,
        }}
      />

      <div
        className="absolute left-4 right-4 bottom-4 md:left-1/2 md:right-auto md:bottom-6 md:w-[560px] md:-translate-x-1/2 pointer-events-auto animate-slide-in"
        onClick={handlePanelClick}
      >
        <div
          className="overflow-hidden rounded-lg border backdrop-blur-xl"
          style={{
            background: `linear-gradient(135deg, ${hexToRgba('#11112a', 0.94)} 0%, ${hexToRgba(currentLocation.emotionColor, 0.22)} 100%)`,
            borderColor: hexToRgba(currentLocation.emotionColor, 0.45),
            boxShadow: `0 22px 70px rgba(0, 0, 0, 0.5), 0 0 36px ${hexToRgba(currentLocation.emotionColor, 0.2)}`,
          }}
        >
          <div className="h-1 bg-white/10">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                backgroundColor: currentLocation.emotionColor,
              }}
            />
          </div>

          <div className="p-4 md:p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-purple-200/60">
                  梦境回顾 {currentIndex + 1} / {totalCount}
                </p>
                <h2 className="mt-1 text-2xl md:text-3xl font-serif text-white truncate">
                  {currentLocation.name}
                </h2>
              </div>
              <button
                onClick={onExit}
                className="flex-shrink-0 p-2 rounded-lg text-purple-200/70 bg-white/5 border border-white/10 hover:text-white hover:bg-white/10 transition-colors"
                title="退出回顾"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onSortModeChange('createdAt')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                  sortMode === 'createdAt'
                    ? 'text-white bg-white/12 border-white/25'
                    : 'text-purple-200/65 bg-white/5 border-white/10 hover:text-purple-100'
                }`}
              >
                <Calendar size={13} />
                创建时间
              </button>
              <button
                onClick={() => onSortModeChange('frequency')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                  sortMode === 'frequency'
                    ? 'text-white bg-white/12 border-white/25'
                    : 'text-purple-200/65 bg-white/5 border-white/10 hover:text-purple-100'
                }`}
              >
                <BarChart3 size={13} />
                出现频率
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-purple-200/55">
                  <Sparkles size={13} />
                  <span>氛围</span>
                </div>
                <p className="text-sm leading-relaxed text-purple-50/90 line-clamp-3">
                  {currentLocation.atmosphere || '暂无氛围记录'}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-purple-200/55">
                  <Users size={13} />
                  <span>人物</span>
                </div>
                <p className="text-sm leading-relaxed text-purple-50/90 line-clamp-3">
                  {currentLocation.relatedPeople || '暂无人物记录'}
                </p>
              </div>
            </div>

            <div
              className="rounded-lg p-3 text-sm italic leading-relaxed text-purple-50/85"
              style={{
                backgroundColor: hexToRgba('#ffffff', 0.06),
                borderLeft: `3px solid ${currentLocation.emotionColor}`,
              }}
            >
              {currentLocation.memoryFragment || '醒来后记忆已经模糊...'}
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 text-xs text-purple-200/55">
                <span>{currentLocation.frequency}</span>
                {currentLocation.tags.length > 0 && (
                  <span className="ml-2 truncate">
                    {currentLocation.tags.slice(0, 3).map((tag) => `#${tag}`).join(' ')}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onPrevious}
                  disabled={!canGoPrevious}
                  className="p-2 rounded-lg text-purple-100 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                  title="上一条"
                >
                  <SkipBack size={17} />
                </button>
                <button
                  onClick={onTogglePause}
                  className="p-3 rounded-lg text-white border transition-colors"
                  style={{
                    backgroundColor: hexToRgba(currentLocation.emotionColor, 0.35),
                    borderColor: hexToRgba(currentLocation.emotionColor, 0.55),
                  }}
                  title={isPaused ? '继续播放' : '暂停播放'}
                >
                  {isPaused ? <Play size={18} /> : <Pause size={18} />}
                </button>
                <button
                  onClick={onNext}
                  disabled={!canGoNext}
                  className="p-2 rounded-lg text-purple-100 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                  title="下一条"
                >
                  <SkipForward size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
