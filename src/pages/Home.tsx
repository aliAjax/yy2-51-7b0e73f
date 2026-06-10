import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { DreamMap } from '@/components/DreamMap/DreamMap';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { Header } from '@/components/Header/Header';
import { DetailPanel } from '@/components/DetailPanel/DetailPanel';
import { LocationForm } from '@/components/LocationForm/LocationForm';
import { RelationForm } from '@/components/RelationForm/RelationForm';
import { LayoutDialog } from '@/components/DreamMap/LayoutDialog';
import { initializeDreamStore } from '@/store/dreamStore';
import { hexToRgba } from '@/utils/storage';

export default function Home() {
  const [isLayoutDialogOpen, setIsLayoutDialogOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  });

  const openLayoutDialog = useCallback(() => {
    setIsLayoutDialogOpen(true);
  }, []);

  const handleLayoutApplied = useCallback((description: string) => {
    setToast({ message: `布局已应用：${description}`, visible: true });
    setTimeout(() => {
      setToast({ message: '', visible: false });
    }, 2500);
  }, []);

  useEffect(() => {
    initializeDreamStore();
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      <Sidebar />
      <DreamMap onOpenLayoutDialog={openLayoutDialog} />
      <Header onOpenLayoutDialog={openLayoutDialog} />
      <DetailPanel />
      <LocationForm />
      <RelationForm />
      <LayoutDialog
        open={isLayoutDialogOpen}
        onClose={() => setIsLayoutDialogOpen(false)}
        onApplied={handleLayoutApplied}
      />

      {toast.visible && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
          <div
            className="flex items-center gap-3 px-5 py-3 rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${hexToRgba('#10b981', 0.95)} 0%, ${hexToRgba('#059669', 0.95)} 100%)`,
              border: '1px solid rgba(16, 185, 129, 0.5)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4), 0 0 40px rgba(16, 185, 129, 0.25)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <CheckCircle2 size={20} className="text-white" />
            <span className="text-sm font-medium text-white whitespace-nowrap">
              {toast.message}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
