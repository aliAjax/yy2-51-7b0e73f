import { create } from 'zustand';
import type { DreamLocation, DreamRelation, RelationType } from '@/types';
import { RELATION_TYPES } from '@/types';
import { saveDreamLocations, saveDreamRelations, generateId } from '@/utils/storage';
import { runMigrations, saveDreamDataWithVersion, validateImportedData } from '@/utils/storageMigration';
import { clusterLocations, arrangeLocationsInCluster } from '@/utils/clustering';

export function filterLocations(
  locations: DreamLocation[],
  relations: DreamRelation[],
  filters: {
    searchText: string;
    frequency: string;
    selectedTags: string[];
    selectedPeople: string[];
    selectedRelationTypes: RelationType[];
  }
): DreamLocation[] {
  const { searchText, frequency, selectedTags, selectedPeople, selectedRelationTypes } = filters;

  let relationFilteredLocationIds: Set<string> | null = null;
  if (selectedRelationTypes.length > 0) {
    const ids = new Set<string>();
    relations.forEach((rel) => {
      if (selectedRelationTypes.includes(rel.type)) {
        ids.add(rel.fromId);
        ids.add(rel.toId);
      }
    });
    relationFilteredLocationIds = ids;
  }

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

    if (selectedPeople.length > 0) {
      const people = location.relatedPeople
        .split(/[,，、\s]+/)
        .map((person) => person.trim())
        .filter((person) => person.length > 0);
      const hasAllPeople = selectedPeople.every((person) => people.includes(person));
      if (!hasAllPeople) {
        return false;
      }
    }

    if (relationFilteredLocationIds && !relationFilteredLocationIds.has(location.id)) {
      return false;
    }

    return true;
  });
}

export type ViewMode = 'map' | 'cluster';
export type EventTypeFilter = 'create' | 'update';
export type ConflictResolution = 'skip' | 'overwrite' | 'saveAsNew';

export interface LocationConflictResolutions {
  default: ConflictResolution;
  perItem?: Record<string, ConflictResolution>;
}

export interface RelationConflictResolutions {
  default: ConflictResolution;
  perItem?: Record<string, ConflictResolution>;
}

export interface ImportLocationsResult {
  added: number;
  updated: number;
  skipped: number;
  savedAsNew: number;
  idRemap: Map<string, string>;
}

export interface ImportRelationsResult {
  added: number;
  updated: number;
  skipped: number;
  savedAsNew: number;
  idRemap: Map<string, string>;
  locationRefRemappedCount: number;
}

interface FilterState {
  searchText: string;
  frequency: string;
  selectedTags: string[];
  selectedPeople: string[];
  selectedRelationTypes: RelationType[];
  timelineEventTypes: EventTypeFilter[];
}

interface SavedPosition {
  positionX: number;
  positionY: number;
}

interface UndoSnapshot {
  locations: DreamLocation[];
  relations: DreamRelation[];
  selectedLocationId: string | null;
  selectedRelationId: string | null;
  savedMapPositions: Map<string, SavedPosition>;
  viewMode: ViewMode;
}

type UndoActionType =
  | 'addLocation'
  | 'updateLocation'
  | 'deleteLocation'
  | 'updatePosition'
  | 'addRelation'
  | 'updateRelation'
  | 'deleteRelation';

interface UndoState {
  canUndo: boolean;
  actionType: UndoActionType | null;
  actionLabel: string;
  snapshot: UndoSnapshot | null;
  expireAt: number;
}

export type ExploreDepth = 1 | 2;

interface PreExploreState {
  filters: FilterState;
  selectedLocationId: string | null;
  selectedRelationId: string | null;
  viewTransform: { scale: number; offsetX: number; offsetY: number } | null;
}

const UNDO_TIMEOUT_MS = 8000;

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
  undo: UndoState;
  pendingDragSnapshot: UndoSnapshot | null;
  isExploreMode: boolean;
  exploreCenterId: string | null;
  exploreDepth: ExploreDepth;
  visibleRelationTypes: RelationType[];
  preExploreState: PreExploreState | null;
}

interface DreamActions {
  addLocation: (data: Omit<DreamLocation, 'id' | 'createdAt' | 'updatedAt' | 'positionX' | 'positionY'> & { positionX?: number; positionY?: number }) => void;
  updateLocation: (id: string, data: Partial<DreamLocation>) => void;
  deleteLocation: (id: string) => void;
  updatePosition: (id: string, x: number, y: number, opts?: { silent?: boolean }) => void;
  beginDragPosition: () => void;
  endDragPosition: () => void;
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
  setPersonFilter: (person: string) => void;
  clearPersonFilter: () => void;
  toggleTagFilter: (tag: string) => void;
  clearTagFilter: () => void;
  toggleRelationTypeFilter: (type: RelationType) => void;
  setRelationTypeFilter: (type: RelationType, visible: boolean) => void;
  clearRelationTypeFilter: () => void;
  toggleTimelineEventType: (type: EventTypeFilter) => void;
  clearTimelineEventTypes: () => void;
  clearFilters: () => void;
  getFilteredLocations: () => DreamLocation[];
  getFilteredRelations: () => DreamRelation[];
  getAllTags: () => string[];
  importLocations: (imported: DreamLocation[], mode: 'merge' | 'replace', resolutions?: LocationConflictResolutions) => ImportLocationsResult;
  exportLocations: () => DreamLocation[];
  importRelations: (imported: DreamRelation[], mode: 'merge' | 'replace', resolutions?: RelationConflictResolutions, locationIdRemap?: Map<string, string>) => ImportRelationsResult;
  exportRelations: () => DreamRelation[];
  setViewMode: (mode: ViewMode) => void;
  setClusterPosition: (id: string, x: number, y: number) => void;
  setClusterPositions: (positions: Map<string, { positionX: number; positionY: number }>) => void;
  getDisplayPosition: (id: string) => { positionX: number; positionY: number };
  performUndo: () => void;
  clearUndo: () => void;
  enterExploreMode: (centerId: string, viewTransform?: { scale: number; offsetX: number; offsetY: number }) => void;
  exitExploreMode: () => void;
  setExploreDepth: (depth: ExploreDepth) => void;
  toggleRelationTypeVisibility: (type: RelationType) => void;
  setRelationTypeVisibility: (type: RelationType, visible: boolean) => void;
  getExploreVisibleLocationIds: () => Set<string>;
  getExploreVisibleRelations: () => DreamRelation[];
  getExploreLocations: () => DreamLocation[];
}

export type DreamStore = DreamState & DreamActions;

let undoTimer: ReturnType<typeof setTimeout> | null = null;

const ACTION_LABELS: Record<UndoActionType, string> = {
  addLocation: '新建地点',
  updateLocation: '编辑地点',
  deleteLocation: '删除地点',
  updatePosition: '移动节点',
  addRelation: '新建关系',
  updateRelation: '编辑关系',
  deleteRelation: '删除关系',
};

function takeSnapshot(state: DreamState): UndoSnapshot {
  return {
    locations: state.locations.map((l) => ({ ...l, tags: [...l.tags] })),
    relations: state.relations.map((r) => ({ ...r })),
    selectedLocationId: state.selectedLocationId,
    selectedRelationId: state.selectedRelationId,
    savedMapPositions: new Map(state.savedMapPositions),
    viewMode: state.viewMode,
  };
}

function scheduleUndoClear() {
  if (undoTimer) {
    clearTimeout(undoTimer);
  }
  undoTimer = setTimeout(() => {
    useDreamStore.setState({
      undo: {
        canUndo: false,
        actionType: null,
        actionLabel: '',
        snapshot: null,
        expireAt: 0,
      },
    });
    undoTimer = null;
  }, UNDO_TIMEOUT_MS);
}

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
    selectedPeople: [],
    selectedRelationTypes: [],
    timelineEventTypes: [],
  },
  viewMode: 'map',
  savedMapPositions: new Map(),
  clusterPositions: new Map(),
  undo: {
    canUndo: false,
    actionType: null,
    actionLabel: '',
    snapshot: null,
    expireAt: 0,
  },
  pendingDragSnapshot: null,
  isExploreMode: false,
  exploreCenterId: null,
  exploreDepth: 1,
  visibleRelationTypes: [...RELATION_TYPES],
  preExploreState: null,

  addLocation: (data) => {
    const state = get();
    const snapshot = takeSnapshot(state);
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
    const newLocations = [...state.locations, newLocation];
    const currentRelations = state.relations;
    set({
      locations: newLocations,
      undo: {
        canUndo: true,
        actionType: 'addLocation',
        actionLabel: ACTION_LABELS.addLocation,
        snapshot,
        expireAt: Date.now() + UNDO_TIMEOUT_MS,
      },
    });
    scheduleUndoClear();
    saveDreamLocations(newLocations);
    saveDreamDataWithVersion(newLocations, currentRelations);
  },

  updateLocation: (id, data) => {
    const state = get();
    const snapshot = takeSnapshot(state);
    const newLocations = state.locations.map((loc) =>
      loc.id === id
        ? { ...loc, ...data, updatedAt: new Date().toISOString() }
        : loc
    );
    const currentRelations = state.relations;
    set({
      locations: newLocations,
      undo: {
        canUndo: true,
        actionType: 'updateLocation',
        actionLabel: ACTION_LABELS.updateLocation,
        snapshot,
        expireAt: Date.now() + UNDO_TIMEOUT_MS,
      },
    });
    scheduleUndoClear();
    saveDreamLocations(newLocations);
    saveDreamDataWithVersion(newLocations, currentRelations);
  },

  deleteLocation: (id) => {
    const state = get();
    const snapshot = takeSnapshot(state);
    const newLocations = state.locations.filter((loc) => loc.id !== id);
    const newRelations = state.relations.filter(
      (rel) => rel.fromId !== id && rel.toId !== id
    );
    set({
      locations: newLocations,
      relations: newRelations,
      selectedLocationId: state.selectedLocationId === id ? null : state.selectedLocationId,
      undo: {
        canUndo: true,
        actionType: 'deleteLocation',
        actionLabel: ACTION_LABELS.deleteLocation,
        snapshot,
        expireAt: Date.now() + UNDO_TIMEOUT_MS,
      },
    });
    scheduleUndoClear();
    saveDreamLocations(newLocations);
    saveDreamRelations(newRelations);
    saveDreamDataWithVersion(newLocations, newRelations);
  },

  updatePosition: (id, x, y, opts) => {
    const state = get();
    const snapshot = !opts?.silent ? takeSnapshot(state) : null;
    const newLocations = state.locations.map((loc) =>
      loc.id === id
        ? { ...loc, positionX: x, positionY: y, updatedAt: new Date().toISOString() }
        : loc
    );
    const currentRelations = state.relations;
    if (opts?.silent) {
      set({ locations: newLocations });
    } else {
      set({
        locations: newLocations,
        undo: {
          canUndo: true,
          actionType: 'updatePosition',
          actionLabel: ACTION_LABELS.updatePosition,
          snapshot: snapshot!,
          expireAt: Date.now() + UNDO_TIMEOUT_MS,
        },
      });
      scheduleUndoClear();
    }
    saveDreamLocations(newLocations);
    saveDreamDataWithVersion(newLocations, currentRelations);
  },

  beginDragPosition: () => {
    set({ pendingDragSnapshot: takeSnapshot(get()) });
  },

  endDragPosition: () => {
    const state = get();
    if (!state.pendingDragSnapshot) return;
    set({
      pendingDragSnapshot: null,
      undo: {
        canUndo: true,
        actionType: 'updatePosition',
        actionLabel: ACTION_LABELS.updatePosition,
        snapshot: state.pendingDragSnapshot,
        expireAt: Date.now() + UNDO_TIMEOUT_MS,
      },
    });
    scheduleUndoClear();
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
    const state = get();
    const snapshot = takeSnapshot(state);
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
    const newRelations = [...state.relations, newRelation];
    const currentLocations = state.locations;
    set({
      relations: newRelations,
      undo: {
        canUndo: true,
        actionType: 'addRelation',
        actionLabel: ACTION_LABELS.addRelation,
        snapshot,
        expireAt: Date.now() + UNDO_TIMEOUT_MS,
      },
    });
    scheduleUndoClear();
    saveDreamRelations(newRelations);
    saveDreamDataWithVersion(currentLocations, newRelations);
  },

  updateRelation: (id, data) => {
    const state = get();
    const snapshot = takeSnapshot(state);
    const newRelations = state.relations.map((rel) =>
      rel.id === id
        ? { ...rel, ...data, updatedAt: new Date().toISOString() }
        : rel
    );
    const currentLocations = state.locations;
    set({
      relations: newRelations,
      undo: {
        canUndo: true,
        actionType: 'updateRelation',
        actionLabel: ACTION_LABELS.updateRelation,
        snapshot,
        expireAt: Date.now() + UNDO_TIMEOUT_MS,
      },
    });
    scheduleUndoClear();
    saveDreamRelations(newRelations);
    saveDreamDataWithVersion(currentLocations, newRelations);
  },

  deleteRelation: (id) => {
    const state = get();
    const snapshot = takeSnapshot(state);
    const newRelations = state.relations.filter((rel) => rel.id !== id);
    const currentLocations = state.locations;
    set({
      relations: newRelations,
      selectedRelationId: state.selectedRelationId === id ? null : state.selectedRelationId,
      undo: {
        canUndo: true,
        actionType: 'deleteRelation',
        actionLabel: ACTION_LABELS.deleteRelation,
        snapshot,
        expireAt: Date.now() + UNDO_TIMEOUT_MS,
      },
    });
    scheduleUndoClear();
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
      const filtered = filterLocations(state.locations, state.relations, newFilters);
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
      const filtered = filterLocations(state.locations, state.relations, newFilters);
      const selectedStillExists = state.selectedLocationId
        ? filtered.some((loc) => loc.id === state.selectedLocationId)
        : true;

      return {
        filters: newFilters,
        selectedLocationId: selectedStillExists ? state.selectedLocationId : null,
      };
    });
  },

  setPersonFilter: (person) => {
    set((state) => {
      const selectedPeople = person ? [person] : [];
      const newFilters = { ...state.filters, selectedPeople };
      const filtered = filterLocations(state.locations, state.relations, newFilters);
      const selectedStillExists = state.selectedLocationId
        ? filtered.some((loc) => loc.id === state.selectedLocationId)
        : true;

      return {
        filters: newFilters,
        selectedLocationId: selectedStillExists ? state.selectedLocationId : null,
      };
    });
  },

  clearPersonFilter: () => {
    set((state) => ({
      filters: { ...state.filters, selectedPeople: [] },
    }));
  },

  toggleTagFilter: (tag) => {
    set((state) => {
      const selectedTags = state.filters.selectedTags.includes(tag)
        ? state.filters.selectedTags.filter((t) => t !== tag)
        : [...state.filters.selectedTags, tag];
      const newFilters = { ...state.filters, selectedTags };
      const filtered = filterLocations(state.locations, state.relations, newFilters);
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

  toggleRelationTypeFilter: (type) => {
    set((state) => {
      const selectedRelationTypes = state.filters.selectedRelationTypes.includes(type)
        ? state.filters.selectedRelationTypes.filter((t) => t !== type)
        : [...state.filters.selectedRelationTypes, type];
      const newFilters = { ...state.filters, selectedRelationTypes };
      const filtered = filterLocations(state.locations, state.relations, newFilters);
      const selectedStillExists = state.selectedLocationId
        ? filtered.some((loc) => loc.id === state.selectedLocationId)
        : true;

      return {
        filters: newFilters,
        selectedLocationId: selectedStillExists ? state.selectedLocationId : null,
      };
    });
  },

  setRelationTypeFilter: (type, visible) => {
    set((state) => {
      const hasType = state.filters.selectedRelationTypes.includes(type);
      if (visible && hasType) return {};
      if (!visible && !hasType) return {};
      const selectedRelationTypes = visible
        ? [...state.filters.selectedRelationTypes, type]
        : state.filters.selectedRelationTypes.filter((t) => t !== type);
      const newFilters = { ...state.filters, selectedRelationTypes };
      const filtered = filterLocations(state.locations, state.relations, newFilters);
      const selectedStillExists = state.selectedLocationId
        ? filtered.some((loc) => loc.id === state.selectedLocationId)
        : true;

      return {
        filters: newFilters,
        selectedLocationId: selectedStillExists ? state.selectedLocationId : null,
      };
    });
  },

  clearRelationTypeFilter: () => {
    set((state) => ({
      filters: { ...state.filters, selectedRelationTypes: [] },
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
        selectedPeople: [],
        selectedRelationTypes: [],
        timelineEventTypes: [],
      },
    });
  },

  getFilteredLocations: () => {
    return filterLocations(get().locations, get().relations, get().filters);
  },

  getFilteredRelations: () => {
    const state = get();
    const filteredLocationIds = new Set(
      filterLocations(state.locations, state.relations, state.filters).map((loc) => loc.id)
    );
    return state.relations.filter((rel) => {
      if (!filteredLocationIds.has(rel.fromId) || !filteredLocationIds.has(rel.toId)) {
        return false;
      }
      if (state.filters.selectedRelationTypes.length > 0 && !state.filters.selectedRelationTypes.includes(rel.type)) {
        return false;
      }
      return true;
    });
  },

  getAllTags: () => {
    const tagsSet = new Set<string>();
    get().locations.forEach((loc) => {
      loc.tags.forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  },

  importLocations: (imported, mode, resolutions) => {
    const currentLocations = get().locations;
    const currentRelations = get().relations;
    let added = 0;
    let updated = 0;
    let skipped = 0;
    let savedAsNew = 0;
    const idRemap = new Map<string, string>();

    const validation = validateImportedData(imported, []);
    const validImported = validation.validLocations;
    skipped += validation.invalidLocationCount;

    if (validation.invalidLocationCount > 0) {
      console.warn(
        `[Import] Skipped ${validation.invalidLocationCount} invalid location records during import`
      );
    }

    if (mode === 'replace') {
      set({ locations: validImported, selectedLocationId: null });
      saveDreamLocations(validImported);
      saveDreamDataWithVersion(validImported, currentRelations);
      return { added: validImported.length, updated: 0, skipped, savedAsNew: 0, idRemap };
    }

    const defaultResolution: ConflictResolution = resolutions?.default ?? 'overwrite';
    const existingMap = new Map(currentLocations.map((loc) => [loc.id, loc]));
    const result: DreamLocation[] = [...currentLocations];
    const now = new Date().toISOString();

    validImported.forEach((item) => {
      if (!existingMap.has(item.id)) {
        result.push(item);
        added++;
        return;
      }

      const resolution = resolutions?.perItem?.[item.id] ?? defaultResolution;

      if (resolution === 'skip') {
        skipped++;
        return;
      }

      if (resolution === 'overwrite') {
        const index = result.findIndex((loc) => loc.id === item.id);
        if (index !== -1) {
          result[index] = { ...item, updatedAt: now };
          updated++;
        }
        return;
      }

      if (resolution === 'saveAsNew') {
        const newId = generateId();
        idRemap.set(item.id, newId);
        result.push({ ...item, id: newId, createdAt: now, updatedAt: now });
        savedAsNew++;
        return;
      }
    });

    set({ locations: result });
    saveDreamLocations(result);
    saveDreamDataWithVersion(result, currentRelations);
    return { added, updated, skipped, savedAsNew, idRemap };
  },

  exportLocations: () => {
    return get().locations;
  },

  importRelations: (imported, mode, resolutions, locationIdRemap) => {
    const currentLocations = get().locations;
    const currentRelations = get().relations;
    let added = 0;
    let updated = 0;
    let skipped = 0;
    let savedAsNew = 0;
    let locationRefRemappedCount = 0;
    const idRemap = new Map<string, string>();

    const remappedRelations = imported.map((rel) => {
      const newFromId = locationIdRemap?.has(rel.fromId) ? locationIdRemap.get(rel.fromId)! : rel.fromId;
      const newToId = locationIdRemap?.has(rel.toId) ? locationIdRemap.get(rel.toId)! : rel.toId;
      if (newFromId !== rel.fromId || newToId !== rel.toId) {
        locationRefRemappedCount++;
      }
      return { ...rel, fromId: newFromId, toId: newToId };
    });

    const validation = validateImportedData(currentLocations, remappedRelations);
    const validImported = validation.validRelations;
    skipped += validation.invalidRelationCount;

    if (validation.invalidRelationCount > 0) {
      console.warn(
        `[Import] Skipped ${validation.invalidRelationCount} invalid relation records during import`
      );
    }

    if (mode === 'replace') {
      set({ relations: validImported, selectedRelationId: null });
      saveDreamRelations(validImported);
      saveDreamDataWithVersion(currentLocations, validImported);
      return { added: validImported.length, updated: 0, skipped, savedAsNew: 0, idRemap, locationRefRemappedCount };
    }

    const defaultResolution: ConflictResolution = resolutions?.default ?? 'overwrite';
    const existingMap = new Map(currentRelations.map((rel) => [rel.id, rel]));
    const result: DreamRelation[] = [...currentRelations];
    const now = new Date().toISOString();

    validImported.forEach((item) => {
      if (!existingMap.has(item.id)) {
        result.push(item);
        added++;
        return;
      }

      const resolution = resolutions?.perItem?.[item.id] ?? defaultResolution;

      if (resolution === 'skip') {
        skipped++;
        return;
      }

      if (resolution === 'overwrite') {
        const index = result.findIndex((rel) => rel.id === item.id);
        if (index !== -1) {
          result[index] = { ...item, updatedAt: now };
          updated++;
        }
        return;
      }

      if (resolution === 'saveAsNew') {
        const newId = generateId();
        idRemap.set(item.id, newId);
        result.push({ ...item, id: newId, createdAt: now, updatedAt: now });
        savedAsNew++;
        return;
      }
    });

    set({ relations: result });
    saveDreamRelations(result);
    saveDreamDataWithVersion(currentLocations, result);
    return { added, updated, skipped, savedAsNew, idRemap, locationRefRemappedCount };
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

  performUndo: () => {
    const state = get();
    const { undo } = state;
    if (!undo.canUndo || !undo.snapshot) return;

    const snapshot = undo.snapshot;

    const restoredLocations = snapshot.locations;
    const restoredRelations = snapshot.relations;

    const newClusterPositions = new Map<string, { positionX: number; positionY: number }>();
    if (snapshot.viewMode === 'cluster') {
      const filtered = filterLocations(restoredLocations, restoredRelations, state.filters);
      const clusters = clusterLocations(filtered);
      clusters.forEach((cluster) => {
        const positions = arrangeLocationsInCluster(cluster);
        positions.forEach((pos, id) => {
          newClusterPositions.set(id, { positionX: pos.x, positionY: pos.y });
        });
      });
    }

    set({
      locations: restoredLocations,
      relations: restoredRelations,
      selectedLocationId: snapshot.selectedLocationId,
      selectedRelationId: snapshot.selectedRelationId,
      savedMapPositions: snapshot.savedMapPositions,
      viewMode: snapshot.viewMode,
      clusterPositions: newClusterPositions,
      undo: {
        canUndo: false,
        actionType: null,
        actionLabel: '',
        snapshot: null,
        expireAt: 0,
      },
      pendingDragSnapshot: null,
    });

    if (undoTimer) {
      clearTimeout(undoTimer);
      undoTimer = null;
    }

    saveDreamLocations(restoredLocations);
    saveDreamRelations(restoredRelations);
    saveDreamDataWithVersion(restoredLocations, restoredRelations);
  },

  clearUndo: () => {
    set({
      undo: {
        canUndo: false,
        actionType: null,
        actionLabel: '',
        snapshot: null,
        expireAt: 0,
      },
      pendingDragSnapshot: null,
    });
    if (undoTimer) {
      clearTimeout(undoTimer);
      undoTimer = null;
    }
  },

  enterExploreMode: (centerId, viewTransform) => {
    const state = get();
    set({
      isExploreMode: true,
      exploreCenterId: centerId,
      exploreDepth: 1,
      visibleRelationTypes: [...RELATION_TYPES],
      selectedLocationId: centerId,
      selectedRelationId: null,
      preExploreState: {
        filters: {
          ...state.filters,
          selectedTags: [...state.filters.selectedTags],
          selectedPeople: [...state.filters.selectedPeople],
          selectedRelationTypes: [...state.filters.selectedRelationTypes],
          timelineEventTypes: [...state.filters.timelineEventTypes],
        },
        selectedLocationId: state.selectedLocationId,
        selectedRelationId: state.selectedRelationId,
        viewTransform: viewTransform || null,
      },
    });
  },

  exitExploreMode: () => {
    const state = get();
    const preState = state.preExploreState;
    if (!preState) {
      set({
        isExploreMode: false,
        exploreCenterId: null,
        exploreDepth: 1,
        visibleRelationTypes: [...RELATION_TYPES],
        preExploreState: null,
      });
      return;
    }
    set({
      isExploreMode: false,
      exploreCenterId: null,
      exploreDepth: 1,
      visibleRelationTypes: [...RELATION_TYPES],
      filters: {
        ...preState.filters,
        selectedTags: [...preState.filters.selectedTags],
        selectedPeople: [...preState.filters.selectedPeople],
        selectedRelationTypes: [...preState.filters.selectedRelationTypes],
        timelineEventTypes: [...preState.filters.timelineEventTypes],
      },
      selectedLocationId: preState.selectedLocationId,
      selectedRelationId: preState.selectedRelationId,
      preExploreState: null,
    });
  },

  setExploreDepth: (depth) => {
    set({ exploreDepth: depth });
  },

  toggleRelationTypeVisibility: (type) => {
    set((state) => {
      const hasType = state.visibleRelationTypes.includes(type);
      const newVisible = hasType
        ? state.visibleRelationTypes.filter((t) => t !== type)
        : [...state.visibleRelationTypes, type];
      return { visibleRelationTypes: newVisible };
    });
  },

  setRelationTypeVisibility: (type, visible) => {
    set((state) => {
      const hasType = state.visibleRelationTypes.includes(type);
      if (visible && hasType) return {};
      if (!visible && !hasType) return {};
      const newVisible = visible
        ? [...state.visibleRelationTypes, type]
        : state.visibleRelationTypes.filter((t) => t !== type);
      return { visibleRelationTypes: newVisible };
    });
  },

  getExploreVisibleLocationIds: () => {
    const state = get();
    if (!state.isExploreMode || !state.exploreCenterId) {
      return new Set(state.locations.map((l) => l.id));
    }
    const visible = new Set<string>();
    const centerId = state.exploreCenterId;
    visible.add(centerId);

    if (state.exploreDepth >= 1) {
      state.relations.forEach((rel) => {
        if (!state.visibleRelationTypes.includes(rel.type)) return;
        if (rel.fromId === centerId) visible.add(rel.toId);
        if (rel.toId === centerId) visible.add(rel.fromId);
      });
    }

    if (state.exploreDepth >= 2) {
      const firstDegreeIds = new Set(visible);
      state.relations.forEach((rel) => {
        if (!state.visibleRelationTypes.includes(rel.type)) return;
        if (firstDegreeIds.has(rel.fromId)) visible.add(rel.toId);
        if (firstDegreeIds.has(rel.toId)) visible.add(rel.fromId);
      });
    }

    return visible;
  },

  getExploreVisibleRelations: () => {
    const state = get();
    const visibleLocationIds = state.getExploreVisibleLocationIds();
    return state.relations.filter(
      (rel) =>
        state.visibleRelationTypes.includes(rel.type) &&
        visibleLocationIds.has(rel.fromId) &&
        visibleLocationIds.has(rel.toId)
    );
  },

  getExploreLocations: () => {
    const state = get();
    const visibleIds = state.getExploreVisibleLocationIds();
    return state.locations.filter((loc) => visibleIds.has(loc.id));
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
