import { useState } from 'react';
import { BarChart3, Moon, Plus } from 'lucide-react';
import { useDreamStore } from '@/store/dreamStore';
import { ImportExport } from '@/components/ImportExport/ImportExport';
import { DreamStatsPanel } from '@/components/DreamStatsPanel/DreamStatsPanel';

export function Header() {
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const locations = useDreamStore((state) => state.locations);
  const openForm = useDreamStore((state) => state.openForm);

  return (
    <>
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
            <div className="hidden md:block text-right">
              <p className="text-lg font-serif text-white">
                {locations.length}
              </p>
              <p className="text-xs text-purple-300/50">
                梦境地点
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsStatsOpen(true)}
              aria-label="打开梦境统计"
              className="group relative flex h-10 w-10 items-center justify-center rounded-xl text-purple-100 transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(155, 89, 182, 0.28)',
                boxShadow: '0 4px 15px rgba(20, 12, 40, 0.25)',
              }}
            >
              <BarChart3 size={18} className="transition-transform group-hover:-translate-y-0.5" />
              {locations.length > 0 && (
                <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-purple-300 px-1.5 text-[10px] font-semibold leading-5 text-[#1a1230]">
                  {locations.length > 99 ? '99+' : locations.length}
                </span>
              )}
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
      </div>

      {isStatsOpen && (
        <DreamStatsPanel
          locations={locations}
          onClose={() => setIsStatsOpen(false)}
        />
      )}
    </>
  );
}
