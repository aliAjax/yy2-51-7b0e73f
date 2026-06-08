import { create } from 'zustand';
import type { DreamLocation, DreamRelation, RelationType } from '@/types';
import { loadDreamLocations, saveDreamLocations, loadDreamRelations, saveDreamRelations, generateId } from '@/utils/storage';

export function filterLocations(
  locations: DreamLocation[],
  filters: { searchText: string; frequency: string; selectedTags: string[] }
): DreamLocation[] {
  const { searchText, frequency, selectedTags } = filters;

  return locations.filter((location) => {
    if (searchText) {
      const lowerSearch = searchText.toLowerCase().trim();
      if (!lowerSearch) return true;

      const matchName = location.name.toLowerCase().includes(lowerSearch);
      const matchAtmosphere = location.atmosphere.toLowerCase().includes(lowerSearch);
      const matchPeople = location.relatedPeople.toLowerCase().includes(lowerSearch);
      const matchTags = location.tags.some((tag) => tag.toLowerCase().includes(lowerSearch));
      if (!matchName && !matchAtmosphere && !matchPeople && !matchTags) {
        return false;
      }
    }

    if (frequency && location.frequency !== frequency) {
      return false;
    }

    if (selectedTags.length > 0) {
      const hasAllTags = selectedTags.every((tag) => location.tags.includes(tag));
      if (!hasAllTags) {
        return false;
      }
    }

    return true;
  });
}

interface FilterState {
  searchText: string;
  frequency: string;
  selectedTags: string[];
}

interface DreamState {
  locations: DreamLocation[];
  relations: DreamRelation[];
  selectedLocationId: string | null;
  selectedRelationId: string | null;
  isFormOpen: boolean;
  editingLocation: DreamLocation | null;
  isRelationFormOpen: boolean;
  editingRelation: DreamRelation | null;
  defaultFromId: string | null;
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
  addRelation: (data: { fromId: string; toId: string; type: RelationType; description: string }) => void;
  updateRelation: (id: string, data: Partial<Pick<DreamRelation, 'type' | 'description'>>) => void;
  deleteRelation: (id: string) => void;
  getRelationsForLocation: (locationId: string) => DreamRelation[];
  openRelationForm: (relation?: DreamRelation, defaultFromId?: string) => void;
  closeRelationForm: () => void;
  selectRelation: (id: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchText: (text: string) => void;
  setFrequencyFilter: (frequency: string) => void;
  toggleTagFilter: (tag: string) => void;
  clearTagFilter: () => void;
  clearFilters: () => void;
  getFilteredLocations: () => DreamLocation[];
  getAllTags: () => string[];
  importLocations: (imported: DreamLocation[], mode: 'merge' | 'replace') => { added: number; updated: number; skipped: number };
  exportLocations: () => DreamLocation[];
  importRelations: (imported: DreamRelation[], mode: 'merge' | 'replace') => { added: number; updated: number; skipped: number };
  exportRelations: () => DreamRelation[];
}

export type DreamStore = DreamState & DreamActions;

export const useDreamStore = create<DreamStore>((set, get) => ({
  locations: [],
  relations: [],
  selectedLocationId: null,
  selectedRelationId: null,
  isFormOpen: false,
  editingLocation: null,
  isRelationFormOpen: false,
  editingRelation: null,
  defaultFromId: null,
  isSidebarOpen: true,
  filters: {
    searchText: '',
    frequency: '',
    selectedTags: [],
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
      tags: data.tags || [],
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
    const newRelations = get().relations.filter(
      (rel) => rel.fromId !== id && rel.toId !== id
    );
    set({
      locations: newLocations,
      relations: newRelations,
      selectedLocationId: get().selectedLocationId === id ? null : get().selectedLocationId,
    });
    saveDreamLocations(newLocations);
    saveDreamRelations(newRelations);
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

  addRelation: (data) => {
    const now = new Date().toISOString();
    const newRelation: DreamRelation = {
      id: generateId(),
      fromId: data.fromId,
      toId: data.toId,
      type: data.type,
      description: data.description,
      createdAt: now,
      updatedAt: now,
    };
    const newRelations = [...get().relations, newRelation];
    set({ relations: newRelations });
    saveDreamRelations(newRelations);
  },

  updateRelation: (id, data) => {
    const newRelations = get().relations.map((rel) =>
      rel.id === id
        ? { ...rel, ...data, updatedAt: new Date().toISOString() }
        : rel
    );
    set({ relations: newRelations });
    saveDreamRelations(newRelations);
  },

  deleteRelation: (id) => {
    const newRelations = get().relations.filter((rel) => rel.id !== id);
    set({
      relations: newRelations,
      selectedRelationId: get().selectedRelationId === id ? null : get().selectedRelationId,
    });
    saveDreamRelations(newRelations);
  },

  getRelationsForLocation: (locationId) => {
    return get().relations.filter(
      (rel) => rel.fromId === locationId || rel.toId === locationId
    );
  },

  openRelationForm: (relation, defaultFromId) => {
    set({
      isRelationFormOpen: true,
      editingRelation: relation || null,
      defaultFromId: relation ? null : (defaultFromId || null),
    });
  },

  closeRelationForm: () => {
    set({
      isRelationFormOpen: false,
      editingRelation: null,
      defaultFromId: null,
    });
  },

  selectRelation: (id) => {
    set({ selectedRelationId: id });
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

  toggleTagFilter: (tag) => {
    set((state) => {
      const selectedTags = state.filters.selectedTags.includes(tag)
        ? state.filters.selectedTags.filter((t) => t !== tag)
        : [...state.filters.selectedTags, tag];
      const newFilters = { ...state.filters, selectedTags };
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

  clearTagFilter: () => {
    set((state) => ({
      filters: { ...state.filters, selectedTags: [] },
    }));
  },

  clearFilters: () => {
    set({
      filters: {
        searchText: '',
        frequency: '',
        selectedTags: [],
      },
    });
  },

  getFilteredLocations: () => {
    return filterLocations(get().locations, get().filters);
  },

  getAllTags: () => {
    const tagsSet = new Set<string>();
    get().locations.forEach((loc) => {
      loc.tags.forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
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

  importRelations: (imported, mode) => {
    const currentRelations = get().relations;
    let added = 0;
    let updated = 0;

    if (mode === 'replace') {
      set({ relations: imported, selectedRelationId: null });
      saveDreamRelations(imported);
      added = imported.length;
      return { added, updated: 0, skipped: 0 };
    }

    const existingMap = new Map(currentRelations.map((rel) => [rel.id, rel]));
    const result: DreamRelation[] = [...currentRelations];

    imported.forEach((item) => {
      if (existingMap.has(item.id)) {
        const index = result.findIndex((rel) => rel.id === item.id);
        if (index !== -1) {
          result[index] = { ...item, updatedAt: new Date().toISOString() };
          updated++;
        }
      } else {
        result.push(item);
        added++;
      }
    });

    set({ relations: result });
    saveDreamRelations(result);
    return { added, updated, skipped: 0 };
  },

  exportRelations: () => {
    return get().relations;
  },
}));

export function initializeDreamStore(): void {
  const locations = loadDreamLocations();
  const relations = loadDreamRelations();
  useDreamStore.setState({ locations, relations });
}
