import { create } from 'zustand';
import type { DreamLocation } from '@/types';
import { loadDreamLocations, saveDreamLocations, generateId } from '@/utils/storage';

export function filterLocations(
  locations: DreamLocation[],
  filters: { searchText: string; frequency: string }
): DreamLocation[] {
  const { searchText, frequency } = filters;

  return locations.filter((location) => {
    if (searchText) {
      const lowerSearch = searchText.toLowerCase().trim();
      if (!lowerSearch) return true;

      const matchName = location.name.toLowerCase().includes(lowerSearch);
      const matchAtmosphere = location.atmosphere.toLowerCase().includes(lowerSearch);
      const matchPeople = location.relatedPeople.toLowerCase().includes(lowerSearch);
      if (!matchName && !matchAtmosphere && !matchPeople) {
        return false;
      }
    }

    if (frequency && location.frequency !== frequency) {
      return false;
    }

    return true;
  });
}

interface FilterState {
  searchText: string;
  frequency: string;
}

interface DreamState {
  locations: DreamLocation[];
  selectedLocationId: string | null;
  isFormOpen: boolean;
  editingLocation: DreamLocation | null;
  isSidebarOpen: boolean;
  filters: FilterState;
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
  setSearchText: (text: string) => void;
  setFrequencyFilter: (frequency: string) => void;
  clearFilters: () => void;
  getFilteredLocations: () => DreamLocation[];
  importLocations: (imported: DreamLocation[], mode: 'merge' | 'replace') => { added: number; updated: number; skipped: number };
  exportLocations: () => DreamLocation[];
}

export type DreamStore = DreamState & DreamActions;

export const useDreamStore = create<DreamStore>((set, get) => ({
  locations: [],
  selectedLocationId: null,
  isFormOpen: false,
  editingLocation: null,
  isSidebarOpen: true,
  filters: {
    searchText: '',
    frequency: '',
  },

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

  setSearchText: (text) => {
    set((state) => {
      const newFilters = { ...state.filters, searchText: text };
      const filtered = filterLocations(state.locations, newFilters);
      const selectedStillExists = state.selectedLocationId
        ? filtered.some((loc) => loc.id === state.selectedLocationId)
        : true;

      return {
        filters: newFilters,
        selectedLocationId: selectedStillExists ? state.selectedLocationId : null,
      };
    });
  },

  setFrequencyFilter: (frequency) => {
    set((state) => {
      const newFilters = { ...state.filters, frequency };
      const filtered = filterLocations(state.locations, newFilters);
      const selectedStillExists = state.selectedLocationId
        ? filtered.some((loc) => loc.id === state.selectedLocationId)
        : true;

      return {
        filters: newFilters,
        selectedLocationId: selectedStillExists ? state.selectedLocationId : null,
      };
    });
  },

  clearFilters: () => {
    set({
      filters: {
        searchText: '',
        frequency: '',
      },
    });
  },

  getFilteredLocations: () => {
    return filterLocations(get().locations, get().filters);
  },

  importLocations: (imported, mode) => {
    const currentLocations = get().locations;
    let added = 0;
    let updated = 0;

    if (mode === 'replace') {
      set({ locations: imported, selectedLocationId: null });
      saveDreamLocations(imported);
      added = imported.length;
      return { added, updated: 0, skipped: 0 };
    }

    const existingMap = new Map(currentLocations.map((loc) => [loc.id, loc]));
    const result: DreamLocation[] = [...currentLocations];

    imported.forEach((item) => {
      if (existingMap.has(item.id)) {
        const index = result.findIndex((loc) => loc.id === item.id);
        if (index !== -1) {
          result[index] = { ...item, updatedAt: new Date().toISOString() };
          updated++;
        }
      } else {
        result.push(item);
        added++;
      }
    });

    set({ locations: result });
    saveDreamLocations(result);
    return { added, updated, skipped: 0 };
  },

  exportLocations: () => {
    return get().locations;
  },
}));

export function initializeDreamStore(): void {
  const locations = loadDreamLocations();
  useDreamStore.setState({ locations });
}
