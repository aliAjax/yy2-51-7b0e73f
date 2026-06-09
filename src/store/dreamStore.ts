import { create } from 'zustand';
import type { DreamLocation, DreamRelation, RelationType } from '@/types';
import { saveDreamLocations, saveDreamRelations, generateId } from '@/utils/storage';
import { runMigrations, saveDreamDataWithVersion, validateImportedData } from '@/utils/storageMigration';

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

export type ViewMode = 'map' | 'cluster';
export type EventTypeFilter = 'create' | 'update';

interface FilterState {
  searchText: string;
  frequency: string;
  selectedTags: string[];
  timelineEventTypes: EventTypeFilter[];
}

interface SavedPosition {
  positionX: number;
  positionY: number;
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
  viewMode: ViewMode;
  savedMapPositions: Map<string, SavedPosition>;
  clusterPositions: Map<string, { positionX: number; positionY: number }>;
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
  updateRelation: (id: string, data: Partial<Pick<DreamRelation, 'fromId' | 'toId' | 'type' | 'description'>>) => void;
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
  toggleTimelineEventType: (type: EventTypeFilter) => void;
  clearTimelineEventTypes: () => void;
  clearFilters: () => void;
  getFilteredLocations: () => DreamLocation[];
  getFilteredRelations: () => DreamRelation[];
  getAllTags: () => string[];
  importLocations: (imported: DreamLocation[], mode: 'merge' | 'replace') => { added: number; updated: number; skipped: number };
  exportLocations: () => DreamLocation[];
  importRelations: (imported: DreamRelation[], mode: 'merge' | 'replace') => { added: number; updated: number; skipped: number };
  exportRelations: () => DreamRelation[];
  setViewMode: (mode: ViewMode) => void;
  setClusterPosition: (id: string, x: number, y: number) => void;
  setClusterPositions: (positions: Map<string, { positionX: number; positionY: number }>) => void;
  getDisplayPosition: (id: string) => { positionX: number; positionY: number };
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
    timelineEventTypes: [],
  },
  viewMode: 'map',
  savedMapPositions: new Map(),
  clusterPositions: new Map(),

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
    const currentRelations = get().relations;
    set({ locations: newLocations });
    saveDreamLocations(newLocations);
    saveDreamDataWithVersion(newLocations, currentRelations);
  },

  updateLocation: (id, data) => {
    const newLocations = get().locations.map((loc) =>
      loc.id === id
        ? { ...loc, ...data, updatedAt: new Date().toISOString() }
        : loc
    );
    const currentRelations = get().relations;
    set({ locations: newLocations });
    saveDreamLocations(newLocations);
    saveDreamDataWithVersion(newLocations, currentRelations);
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
    saveDreamDataWithVersion(newLocations, newRelations);
  },

  updatePosition: (id, x, y) => {
    const newLocations = get().locations.map((loc) =>
      loc.id === id
        ? { ...loc, positionX: x, positionY: y, updatedAt: new Date().toISOString() }
        : loc
    );
    const currentRelations = get().relations;
    set({ locations: newLocations });
    saveDreamLocations(newLocations);
    saveDreamDataWithVersion(newLocations, currentRelations);
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
    const currentLocations = get().locations;
    set({ relations: newRelations });
    saveDreamRelations(newRelations);
    saveDreamDataWithVersion(currentLocations, newRelations);
  },

  updateRelation: (id, data) => {
    const newRelations = get().relations.map((rel) =>
      rel.id === id
        ? { ...rel, ...data, updatedAt: new Date().toISOString() }
        : rel
    );
    const currentLocations = get().locations;
    set({ relations: newRelations });
    saveDreamRelations(newRelations);
    saveDreamDataWithVersion(currentLocations, newRelations);
  },

  deleteRelation: (id) => {
    const newRelations = get().relations.filter((rel) => rel.id !== id);
    const currentLocations = get().locations;
    set({
      relations: newRelations,
      selectedRelationId: get().selectedRelationId === id ? null : get().selectedRelationId,
    });
    saveDreamRelations(newRelations);
    saveDreamDataWithVersion(currentLocations, newRelations);
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

  toggleTimelineEventType: (type) => {
    set((state) => {
      const timelineEventTypes = state.filters.timelineEventTypes.includes(type)
        ? state.filters.timelineEventTypes.filter((t) => t !== type)
        : [...state.filters.timelineEventTypes, type];
      return {
        filters: { ...state.filters, timelineEventTypes },
      };
    });
  },

  clearTimelineEventTypes: () => {
    set((state) => ({
      filters: { ...state.filters, timelineEventTypes: [] },
    }));
  },

  clearFilters: () => {
    set({
      filters: {
        searchText: '',
        frequency: '',
        selectedTags: [],
        timelineEventTypes: [],
      },
    });
  },

  getFilteredLocations: () => {
    return filterLocations(get().locations, get().filters);
  },

  getFilteredRelations: () => {
    const filteredLocationIds = new Set(
      filterLocations(get().locations, get().filters).map((loc) => loc.id)
    );
    return get().relations.filter(
      (rel) => filteredLocationIds.has(rel.fromId) && filteredLocationIds.has(rel.toId)
    );
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
    const currentRelations = get().relations;
    let added = 0;
    let updated = 0;

    const validation = validateImportedData(imported, []);
    const validImported = validation.validLocations;
    const skipped = validation.invalidLocationCount;

    if (validation.invalidLocationCount > 0) {
      console.warn(
        `[Import] Skipped ${validation.invalidLocationCount} invalid location records during import`
      );
    }

    if (mode === 'replace') {
      set({ locations: validImported, selectedLocationId: null });
      saveDreamLocations(validImported);
      saveDreamDataWithVersion(validImported, currentRelations);
      return { added: validImported.length, updated: 0, skipped };
    }

    const existingMap = new Map(currentLocations.map((loc) => [loc.id, loc]));
    const result: DreamLocation[] = [...currentLocations];

    validImported.forEach((item) => {
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
    saveDreamDataWithVersion(result, currentRelations);
    return { added, updated, skipped };
  },

  exportLocations: () => {
    return get().locations;
  },

  importRelations: (imported, mode) => {
    const currentLocations = get().locations;
    const currentRelations = get().relations;
    let added = 0;
    let updated = 0;

    const validation = validateImportedData(currentLocations, imported);
    const validImported = validation.validRelations;
    const skipped = validation.invalidRelationCount;

    if (validation.invalidRelationCount > 0) {
      console.warn(
        `[Import] Skipped ${validation.invalidRelationCount} invalid relation records during import`
      );
    }

    if (mode === 'replace') {
      set({ relations: validImported, selectedRelationId: null });
      saveDreamRelations(validImported);
      saveDreamDataWithVersion(currentLocations, validImported);
      return { added: validImported.length, updated: 0, skipped };
    }

    const existingMap = new Map(currentRelations.map((rel) => [rel.id, rel]));
    const result: DreamRelation[] = [...currentRelations];

    validImported.forEach((item) => {
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
    saveDreamDataWithVersion(currentLocations, result);
    return { added, updated, skipped };
  },

  exportRelations: () => {
    return get().relations;
  },

  setViewMode: (mode) => {
    const currentMode = get().viewMode;
    if (currentMode === mode) return;

    const locations = get().locations;

    if (mode === 'cluster') {
      const savedMapPositions = new Map<string, SavedPosition>();
      locations.forEach((loc) => {
        savedMapPositions.set(loc.id, {
          positionX: loc.positionX,
          positionY: loc.positionY,
        });
      });

      set({ viewMode: mode, savedMapPositions });
    } else {
      const savedMapPositions = get().savedMapPositions;
      const newLocations = locations.map((loc) => {
        const saved = savedMapPositions.get(loc.id);
        if (saved) {
          return { ...loc, positionX: saved.positionX, positionY: saved.positionY };
        }
        return loc;
      });

      const currentRelations = get().relations;
      set({
        viewMode: mode,
        locations: newLocations,
      });
      saveDreamLocations(newLocations);
      saveDreamDataWithVersion(newLocations, currentRelations);
    }
  },

  setClusterPosition: (id, x, y) => {
    const clusterPositions = new Map(get().clusterPositions);
    clusterPositions.set(id, { positionX: x, positionY: y });
    set({ clusterPositions });
  },

  setClusterPositions: (positions) => {
    set({ clusterPositions: new Map(positions) });
  },

  getDisplayPosition: (id) => {
    const state = get();
    if (state.viewMode === 'cluster') {
      const pos = state.clusterPositions.get(id);
      if (pos) {
        return { positionX: pos.positionX, positionY: pos.positionY };
      }
    }
    const loc = state.locations.find((l) => l.id === id);
    return loc
      ? { positionX: loc.positionX, positionY: loc.positionY }
      : { positionX: 50, positionY: 50 };
  },
}));

export function initializeDreamStore(): void {
  const migrationResult = runMigrations();
  const { locations, relations } = migrationResult;

  if (migrationResult.migrated) {
    console.info(
      `[Storage Migration] Migrated from v${migrationResult.fromVersion} to v${migrationResult.toVersion}. ` +
      `Filtered ${migrationResult.filteredCount} corrupted records. ` +
      `Backup created: ${migrationResult.backupCreated}`
    );
  }

  const savedMapPositions = new Map<string, SavedPosition>();
  locations.forEach((loc) => {
    savedMapPositions.set(loc.id, {
      positionX: loc.positionX,
      positionY: loc.positionY,
    });
  });

  useDreamStore.setState({ locations, relations, savedMapPositions });
}
