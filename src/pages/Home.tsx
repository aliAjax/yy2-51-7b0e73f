import { useEffect } from 'react';
import { DreamMap } from '@/components/DreamMap/DreamMap';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { Header } from '@/components/Header/Header';
import { DetailPanel } from '@/components/DetailPanel/DetailPanel';
import { LocationForm } from '@/components/LocationForm/LocationForm';
import { initializeDreamStore } from '@/store/dreamStore';

export default function Home() {
  useEffect(() => {
    initializeDreamStore();
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      <Sidebar />
      <DreamMap />
      <Header />
      <DetailPanel />
      <LocationForm />
    </div>
  );
}
