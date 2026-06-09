import type { DreamLocation, DreamRelation } from '@/types';
import { generateId } from './storage';

export const CURRENT_SCHEMA_VERSION = 1;

const VERSIONED_STORAGE_KEY = 'dream_data_v2';
const BACKUP_STORAGE_KEY = 'dream_data_backup';
const MIGRATION_LOG_KEY = 'dream_migration_log';
const LEGACY_LOCATIONS_KEY = 'dream_locations';
const LEGACY_RELATIONS_KEY = 'dream_relations';

interface VersionedData {
  schemaVersion: number;
  locations: DreamLocation[];
  relations: DreamRelation[];
  migratedAt: string;
}

interface MigrationLogEntry {
  timestamp: string;
  fromVersion: number | null;
  toVersion: number;
  success: boolean;
  filteredCount: number;
  backupCreated: boolean;
  error?: string;
}

interface MigrationResult {
  locations: DreamLocation[];
  relations: DreamRelation[];
  migrated: boolean;
  fromVersion: number | null;
  toVersion: number;
  filteredCount: number;
  backupCreated: boolean;
  success: boolean;
  error?: string;
}

interface ValidationStats {
  total: number;
  valid: number;
  invalid: number;
  reasons: string[];
}

type MigrationFn = (data: unknown) => { locations: unknown[]; relations: unknown[] };

const migrations: Record<number, MigrationFn> = {
  0: migrateFromLegacy,
};

function migrateFromLegacy(data: unknown): { locations: unknown[]; relations: unknown[] } {
  const legacyData = data as { locations?: unknown[]; relations?: unknown[] } | null;
  return {
    locations: Array.isArray(legacyData?.locations) ? legacyData.locations : [],
    relations: Array.isArray(legacyData?.relations) ? legacyData.relations : [],
  };
}

function isValidDateString(str: string): boolean {
  const date = new Date(str);
  return !isNaN(date.getTime());
}

function isValidHexColor(str: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(str);
}

function validateAndCleanLocations(locations: unknown[]): { valid: DreamLocation[]; stats: ValidationStats } {
  const validLocations: DreamLocation[] = [];
  const reasons: string[] = [];
  let invalidCount = 0;

  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];

    if (!loc || typeof loc !== 'object') {
      invalidCount++;
      reasons.push(`[${i}] not an object`);
      continue;
    }

    const candidate = loc as Record<string, unknown>;

    if (typeof candidate.id !== 'string' || !candidate.id.trim()) {
      invalidCount++;
      reasons.push(`[${i}] missing or invalid id`);
      continue;
    }

    if (typeof candidate.name !== 'string') {
      invalidCount++;
      reasons.push(`[${i}] missing name field, id: ${candidate.id}`);
      continue;
    }

    if (validLocations.some(l => l.id === candidate.id)) {
      invalidCount++;
      reasons.push(`[${i}] duplicate id: ${candidate.id}`);
      continue;
    }

    const now = new Date().toISOString();

    const rawCreatedAt = typeof candidate.createdAt === 'string' && isValidDateString(candidate.createdAt)
      ? candidate.createdAt
      : now;

    let updatedAt = typeof candidate.updatedAt === 'string' && isValidDateString(candidate.updatedAt)
      ? candidate.updatedAt
      : now;

    if (new Date(rawCreatedAt) > new Date(updatedAt)) {
      updatedAt = rawCreatedAt;
    }

    const createdAt = rawCreatedAt;

    const frequency = typeof candidate.frequency === 'string' &&
      ['偶尔', '经常', '频繁', '每次都会'].includes(candidate.frequency)
      ? candidate.frequency
      : '偶尔';

    const emotionColor = typeof candidate.emotionColor === 'string' && isValidHexColor(candidate.emotionColor)
      ? candidate.emotionColor
      : '#6366f1';

    const positionX = typeof candidate.positionX === 'number' && !isNaN(candidate.positionX)
      ? Math.max(0, Math.min(100, candidate.positionX))
      : Math.random() * 60 + 20;

    const positionY = typeof candidate.positionY === 'number' && !isNaN(candidate.positionY)
      ? Math.max(0, Math.min(100, candidate.positionY))
      : Math.random() * 60 + 20;

    const tags = Array.isArray(candidate.tags)
      ? candidate.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      : [];

    validLocations.push({
      id: candidate.id,
      name: candidate.name,
      atmosphere: typeof candidate.atmosphere === 'string' ? candidate.atmosphere : '',
      frequency,
      relatedPeople: typeof candidate.relatedPeople === 'string' ? candidate.relatedPeople : '',
      memoryFragment: typeof candidate.memoryFragment === 'string' ? candidate.memoryFragment : '',
      emotionColor,
      positionX,
      positionY,
      tags,
      createdAt,
      updatedAt,
    });
  }

  return {
    valid: validLocations,
    stats: {
      total: locations.length,
      valid: validLocations.length,
      invalid: invalidCount,
      reasons: reasons.slice(0, 20),
    },
  };
}

function validateAndCleanRelations(
  relations: unknown[],
  validLocationIds: Set<string>
): { valid: DreamRelation[]; stats: ValidationStats } {
  const validRelations: DreamRelation[] = [];
  const reasons: string[] = [];
  let invalidCount = 0;
  const validTypes = new Set(['相似', '延续', '反复出现', '人物相关']);
  const seenIds = new Set<string>();

  for (let i = 0; i < relations.length; i++) {
    const rel = relations[i];

    if (!rel || typeof rel !== 'object') {
      invalidCount++;
      reasons.push(`[${i}] not an object`);
      continue;
    }

    const candidate = rel as Record<string, unknown>;

    if (typeof candidate.fromId !== 'string' || !validLocationIds.has(candidate.fromId)) {
      invalidCount++;
      reasons.push(`[${i}] invalid fromId: ${candidate.fromId}`);
      continue;
    }

    if (typeof candidate.toId !== 'string' || !validLocationIds.has(candidate.toId)) {
      invalidCount++;
      reasons.push(`[${i}] invalid toId: ${candidate.toId}`);
      continue;
    }

    if (candidate.fromId === candidate.toId) {
      invalidCount++;
      reasons.push(`[${i}] self-referencing relation: ${candidate.fromId}`);
      continue;
    }

    let id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : generateId();
    if (seenIds.has(id)) {
      id = generateId();
      reasons.push(`[${i}] duplicate relation id, regenerated`);
    }
    seenIds.add(id);

    const type = typeof candidate.type === 'string' && validTypes.has(candidate.type)
      ? candidate.type
      : '相似';

    const now = new Date().toISOString();

    const rawCreatedAt = typeof candidate.createdAt === 'string' && isValidDateString(candidate.createdAt)
      ? candidate.createdAt
      : now;

    let updatedAt = typeof candidate.updatedAt === 'string' && isValidDateString(candidate.updatedAt)
      ? candidate.updatedAt
      : now;

    if (new Date(rawCreatedAt) > new Date(updatedAt)) {
      updatedAt = rawCreatedAt;
    }

    const createdAt = rawCreatedAt;

    validRelations.push({
      id,
      fromId: candidate.fromId,
      toId: candidate.toId,
      type: type as DreamRelation['type'],
      description: typeof candidate.description === 'string' ? candidate.description : '',
      createdAt,
      updatedAt,
    });
  }

  return {
    valid: validRelations,
    stats: {
      total: relations.length,
      valid: validRelations.length,
      invalid: invalidCount,
      reasons: reasons.slice(0, 20),
    },
  };
}

function loadLegacyData(): { locations: unknown[]; relations: unknown[] } {
  let locations: unknown[] = [];
  let relations: unknown[] = [];

  try {
    const locStr = localStorage.getItem(LEGACY_LOCATIONS_KEY);
    if (locStr) {
      const parsed = JSON.parse(locStr);
      locations = Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.warn('Failed to parse legacy locations:', e);
  }

  try {
    const relStr = localStorage.getItem(LEGACY_RELATIONS_KEY);
    if (relStr) {
      const parsed = JSON.parse(relStr);
      relations = Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.warn('Failed to parse legacy relations:', e);
  }

  return { locations, relations };
}

function loadVersionedData(): VersionedData | null {
  try {
    const stored = localStorage.getItem(VERSIONED_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as VersionedData;
      if (typeof parsed.schemaVersion === 'number') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse versioned data:', e);
  }
  return null;
}

function createBackup(data: VersionedData | { locations: unknown[]; relations: unknown[] }): boolean {
  try {
    const backupData = {
      ...data,
      backupCreatedAt: new Date().toISOString(),
    };
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backupData));
    return true;
  } catch (e) {
    console.error('Failed to create backup:', e);
    return false;
  }
}

function saveVersionedData(locations: DreamLocation[], relations: DreamRelation[]): boolean {
  try {
    const data: VersionedData = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      locations,
      relations,
      migratedAt: new Date().toISOString(),
    };
    localStorage.setItem(VERSIONED_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Failed to save versioned data:', e);
    return false;
  }
}

function addMigrationLog(entry: Omit<MigrationLogEntry, 'timestamp'>): void {
  try {
    const logs = getMigrationLog();
    const newEntry: MigrationLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newEntry);
    const recentLogs = logs.slice(0, 50);
    localStorage.setItem(MIGRATION_LOG_KEY, JSON.stringify(recentLogs));
  } catch (e) {
    console.warn('Failed to write migration log:', e);
  }
}

export function getMigrationLog(): MigrationLogEntry[] {
  try {
    const stored = localStorage.getItem(MIGRATION_LOG_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.warn('Failed to read migration log:', e);
  }
  return [];
}

export function clearMigrationLog(): void {
  localStorage.removeItem(MIGRATION_LOG_KEY);
}

function fallbackToBackup(): { locations: DreamLocation[]; relations: DreamRelation[] } | null {
  try {
    const backupStr = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!backupStr) return null;

    const backupData = JSON.parse(backupStr) as {
      locations?: unknown[];
      relations?: unknown[];
    };

    const locResult = validateAndCleanLocations(backupData.locations || []);
    const validIds = new Set(locResult.valid.map(l => l.id));
    const relResult = validateAndCleanRelations(backupData.relations || [], validIds);

    console.info('[Migration Fallback] Restored from backup');
    return { locations: locResult.valid, relations: relResult.valid };
  } catch (e) {
    console.error('Failed to restore from backup:', e);
    return null;
  }
}

export function runMigrations(): MigrationResult {
  const versionedData = loadVersionedData();

  if (versionedData && versionedData.schemaVersion === CURRENT_SCHEMA_VERSION) {
    const locResult = validateAndCleanLocations(versionedData.locations);
    const validLocationIds = new Set(locResult.valid.map(l => l.id));
    const relResult = validateAndCleanRelations(versionedData.relations, validLocationIds);

    const filteredCount = locResult.stats.invalid + relResult.stats.invalid;

    if (filteredCount > 0) {
      console.info(
        `[Storage Validation] Filtered ${filteredCount} invalid records ` +
        `(${locResult.stats.invalid} locations, ${relResult.stats.invalid} relations)`
      );
      if (locResult.stats.reasons.length > 0) {
        console.debug('Validation reasons:', locResult.stats.reasons.concat(relResult.stats.reasons));
      }
      saveVersionedData(locResult.valid, relResult.valid);
    }

    return {
      locations: locResult.valid,
      relations: relResult.valid,
      migrated: false,
      fromVersion: CURRENT_SCHEMA_VERSION,
      toVersion: CURRENT_SCHEMA_VERSION,
      filteredCount,
      backupCreated: false,
      success: true,
    };
  }

  let currentData: { locations: unknown[]; relations: unknown[] };
  let fromVersion: number | null = null;
  let backupCreated = false;

  if (versionedData) {
    fromVersion = versionedData.schemaVersion;
    currentData = { locations: versionedData.locations, relations: versionedData.relations };
    backupCreated = createBackup(versionedData);
  } else {
    const legacyData = loadLegacyData();
    if (legacyData.locations.length === 0 && legacyData.relations.length === 0) {
      return {
        locations: [],
        relations: [],
        migrated: false,
        fromVersion: null,
        toVersion: CURRENT_SCHEMA_VERSION,
        filteredCount: 0,
        backupCreated: false,
        success: true,
      };
    }
    fromVersion = 0;
    currentData = legacyData;
    backupCreated = createBackup(legacyData);
  }

  try {
    let currentVersion = fromVersion ?? 0;

    while (currentVersion < CURRENT_SCHEMA_VERSION) {
      const migrationFn = migrations[currentVersion];
      if (!migrationFn) {
        throw new Error(`No migration found for version ${currentVersion}`);
      }
      currentData = migrationFn(currentData);
      currentVersion++;
    }

    const locResult = validateAndCleanLocations(currentData.locations);
    const validLocationIds = new Set(locResult.valid.map(l => l.id));
    const relResult = validateAndCleanRelations(currentData.relations, validLocationIds);

    const filteredCount = locResult.stats.invalid + relResult.stats.invalid;

    if (filteredCount > 0) {
      console.info(
        `[Migration] Filtered ${filteredCount} invalid records during migration`
      );
    }

    const saved = saveVersionedData(locResult.valid, relResult.valid);
    if (!saved) {
      throw new Error('Failed to save migrated data');
    }

    addMigrationLog({
      fromVersion,
      toVersion: CURRENT_SCHEMA_VERSION,
      success: true,
      filteredCount,
      backupCreated,
    });

    return {
      locations: locResult.valid,
      relations: relResult.valid,
      migrated: true,
      fromVersion,
      toVersion: CURRENT_SCHEMA_VERSION,
      filteredCount,
      backupCreated,
      success: true,
    };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('Migration failed:', errorMessage);

    addMigrationLog({
      fromVersion,
      toVersion: CURRENT_SCHEMA_VERSION,
      success: false,
      filteredCount: 0,
      backupCreated,
      error: errorMessage,
    });

    const fallback = fallbackToBackup();
    if (fallback) {
      return {
        locations: fallback.locations,
        relations: fallback.relations,
        migrated: false,
        fromVersion,
        toVersion: CURRENT_SCHEMA_VERSION,
        filteredCount: 0,
        backupCreated,
        success: false,
        error: errorMessage,
      };
    }

    return {
      locations: [],
      relations: [],
      migrated: false,
      fromVersion,
      toVersion: CURRENT_SCHEMA_VERSION,
      filteredCount: 0,
      backupCreated,
      success: false,
      error: errorMessage,
    };
  }
}

export function getMigrationBackup(): unknown | null {
  try {
    const stored = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load backup:', e);
  }
  return null;
}

export function clearMigrationBackup(): void {
  localStorage.removeItem(BACKUP_STORAGE_KEY);
}

export function restoreFromBackup(): boolean {
  const backup = getMigrationBackup();
  if (!backup) return false;

  try {
    const backupData = backup as { locations: unknown[]; relations: unknown[] };
    const locResult = validateAndCleanLocations(backupData.locations || []);
    const validIds = new Set(locResult.valid.map(l => l.id));
    const relResult = validateAndCleanRelations(backupData.relations || [], validIds);
    return saveVersionedData(locResult.valid, relResult.valid);
  } catch (e) {
    console.error('Failed to restore from backup:', e);
    return false;
  }
}

export function saveDreamDataWithVersion(locations: DreamLocation[], relations: DreamRelation[]): void {
  saveVersionedData(locations, relations);
}

export function validateImportedData(
  importedLocations: unknown[],
  importedRelations: unknown[] = []
): {
  validLocations: DreamLocation[];
  validRelations: DreamRelation[];
  invalidLocationCount: number;
  invalidRelationCount: number;
  reasons: string[];
} {
  const locResult = validateAndCleanLocations(importedLocations);
  const validIds = new Set(locResult.valid.map(l => l.id));
  const relResult = validateAndCleanRelations(importedRelations, validIds);

  const reasons = [
    ...locResult.stats.reasons.map(r => `location ${r}`),
    ...relResult.stats.reasons.map(r => `relation ${r}`),
  ];

  return {
    validLocations: locResult.valid,
    validRelations: relResult.valid,
    invalidLocationCount: locResult.stats.invalid,
    invalidRelationCount: relResult.stats.invalid,
    reasons,
  };
}

export function exportVersionedData(): VersionedData {
  const versionedData = loadVersionedData();
  if (versionedData) {
    return versionedData;
  }

  const legacyData = loadLegacyData();
  const locResult = validateAndCleanLocations(legacyData.locations);
  const validIds = new Set(locResult.valid.map(l => l.id));
  const relResult = validateAndCleanRelations(legacyData.relations, validIds);

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    locations: locResult.valid,
    relations: relResult.valid,
    migratedAt: new Date().toISOString(),
  };
}

export function getCurrentSchemaVersion(): number {
  const versionedData = loadVersionedData();
  return versionedData?.schemaVersion ?? 0;
}
