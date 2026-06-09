import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Plus, BarChart3, Clock, Undo2 } from 'lucide-react';
import { useDreamStore } from '@/store/dreamStore';
import { ImportExport } from '@/components/ImportExport/ImportExport';
import { DreamStatsPanel } from '@/components/DreamStatsPanel/DreamStatsPanel';

export function Header() {
  const navigate = useNavigate();
  const locations = useDreamStore((state) => state.locations);
  const relations = useDreamStore((state) => state.relations);
  const openForm = useDreamStore((state) => state.openForm);
  const undoState = useDreamStore((state) => state.undo);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!undoState.canUndo || undoState.expireAt <= 0) {
      setRemainingSeconds(0);
      return;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((undoState.expireAt - Date.now()) / 1000));
      setRemainingSeconds(remaining);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 200);
    return () => clearInterval(interval);
  }, [undoState.canUndo, undoState.expireAt]);

  const handleUndo = useCallback(() => {
    useDreamStore.getState().performUndo();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        if (useDreamStore.getState().undo.canUndo) {
          handleUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);

  return (
    <div className="absolute top-0 left-0 right-0 z-10 p-4 md:p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(155, 89, 182, 0.3) 0%, rgba(100, 50, 150, 0.3) 100%)',
                border: '1px solid rgba(155, 89, 182, 0.25)',
                boxShadow: '0 0 20px rgba(155, 89, 182, 0.2)',
              }}
            >
              <Moon size={20} className="text-purple-200" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-serif text-white tracking-wide">
                梦境地点地图
              </h1>
              <p className="text-xs text-purple-300/60 italic">
                私人梦境档案
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-4 text-right">
            <div>
              <p className="text-lg font-serif text-white">
                {locations.length}
              </p>
              <p className="text-xs text-purple-300/50">
                梦境地点
              </p>
            </div>
            <div className="w-px h-8 bg-purple-300/20" />
            <div>
              <p className="text-lg font-serif text-white">
                {relations.length}
              </p>
              <p className="text-xs text-purple-300/50">
                关系连线
              </p>
            </div>
          </div>

          {undoState.canUndo && (
            <button
              onClick={handleUndo}
              className="relative group px-3 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2 transition-all hover:scale-105 active:scale-95 animate-fade-in"
              style={{
                background: 'linear-gradient(135deg, rgba(52, 152, 219, 0.8) 0%, rgba(41, 128, 185, 0.8) 100%)',
                border: '1px solid rgba(52, 152, 219, 0.5)',
                boxShadow: '0 4px 15px rgba(52, 152, 219, 0.3)',
              }}
              title={`撤销${undoState.actionLabel ? ' ' + undoState.actionLabel : ''} (${remainingSeconds}s)`}
            >
              <Undo2 size={16} className="transition-transform group-hover:-rotate-12" />
              <span className="hidden sm:inline">
                撤销{undoState.actionLabel ? ' ' + undoState.actionLabel : ''}
              </span>
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold bg-white/20">
                {remainingSeconds}
              </span>
            </button>
          )}

          <button
            onClick={() => setIsStatsOpen(true)}
            className="relative p-2.5 rounded-xl text-purple-200/70 bg-white/5 border border-purple-300/20 hover:text-purple-100 hover:bg-white/10 transition-all group"
            title="梦境统计"
          >
            <BarChart3 size={18} className="transition-transform group-hover:scale-110" />
            {locations.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-medium flex items-center justify-center text-white bg-purple-500 border border-purple-400/50">
                {locations.length > 99 ? '99+' : locations.length}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate('/timeline')}
            className="relative p-2.5 rounded-xl text-purple-200/70 bg-white/5 border border-purple-300/20 hover:text-purple-100 hover:bg-white/10 transition-all group"
            title="梦境时间轴"
          >
            <Clock size={18} className="transition-transform group-hover:scale-110" />
          </button>

          <ImportExport />

          <button
            onClick={() => openForm()}
            className="group relative px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, rgba(155, 89, 182, 0.8) 0%, rgba(100, 50, 150, 0.8) 100%)',
              border: '1px solid rgba(155, 89, 182, 0.5)',
              boxShadow: '0 4px 15px rgba(155, 89, 182, 0.3)',
            }}
          >
            <Plus size={18} className="transition-transform group-hover:rotate-90" />
            <span className="hidden sm:inline">记录梦境</span>
          </button>
        </div>
      </div>

      <DreamStatsPanel isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} />
    </div>
  );
}
