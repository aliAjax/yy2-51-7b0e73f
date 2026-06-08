import { create } from 'zustand';
import type { DreamLocation } from '@/types';
import { loadDreamLocations, saveDreamLocations, generateId } from '@/utils/storage';

interface DreamState {
  locations: DreamLocation[];
  selectedLocationId: string | null;
  isFormOpen: boolean;
  editingLocation: DreamLocation | null;
  isSidebarOpen: boolean;
}

interface DreamActions {
  addLocation: (data: Omit<DreamLocation, 'id' | 'createdAt' | 'updatedAt' | 'positionX' | 'positionY'> & { positionX?: number; positionY?: number }) => void;
  updateLocation: (id: string, data: Partial<DreamLocation>) => void;
  deleteLocation: (id: string) => void;
  updatePosition: (id: string, x: number, y: number) => void;
  selectLocation: (id: string | null) => void;
  openForm: (location?: DreamLocation) => void;
  closeForm: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export type DreamStore = DreamState & DreamActions;

export const useDreamStore = create<DreamStore>((set, get) => ({
  locations: [],
  selectedLocationId: null,
  isFormOpen: false,
  editingLocation: null,
  isSidebarOpen: true,

  addLocation: (data) => {
    const now = new Date().toISOString();
    const newLocation: DreamLocation = {
      id: generateId(),
      name: data.name,
      atmosphere: data.atmosphere,
      frequency: data.frequency,
      relatedPeople: data.relatedPeople,
      memoryFragment: data.memoryFragment,
      emotionColor: data.emotionColor,
      positionX: data.positionX ?? Math.random() * 60 + 20,
      positionY: data.positionY ?? Math.random() * 60 + 20,
      createdAt: now,
      updatedAt: now,
    };
    const newLocations = [...get().locations, newLocation];
    set({ locations: newLocations });
    saveDreamLocations(newLocations);
  },

  updateLocation: (id, data) => {
    const newLocations = get().locations.map((loc) =>
      loc.id === id
        ? { ...loc, ...data, updatedAt: new Date().toISOString() }
        : loc
    );
    set({ locations: newLocations });
    saveDreamLocations(newLocations);
  },

  deleteLocation: (id) => {
    const newLocations = get().locations.filter((loc) => loc.id !== id);
    set({
      locations: newLocations,
      selectedLocationId: get().selectedLocationId === id ? null : get().selectedLocationId,
    });
    saveDreamLocations(newLocations);
  },

  updatePosition: (id, x, y) => {
    const newLocations = get().locations.map((loc) =>
      loc.id === id
        ? { ...loc, positionX: x, positionY: y, updatedAt: new Date().toISOString() }
        : loc
    );
    set({ locations: newLocations });
    saveDreamLocations(newLocations);
  },

  selectLocation: (id) => {
    set({ selectedLocationId: id });
  },

  openForm: (location?) => {
    set({
      isFormOpen: true,
      editingLocation: location || null,
    });
  },

  closeForm: () => {
    set({
      isFormOpen: false,
      editingLocation: null,
    });
  },

  toggleSidebar: () => {
    set({ isSidebarOpen: !get().isSidebarOpen });
  },

  setSidebarOpen: (open) => {
    set({ isSidebarOpen: open });
  },
}));

export function initializeDreamStore(): void {
  const locations = loadDreamLocations();
  useDreamStore.setState({ locations });
}
