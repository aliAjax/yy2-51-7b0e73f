import type { DreamLocation, DreamRelation, RelationType } from '@/types';
import { FREQUENCY_OPTIONS, RELATION_TYPES, type FrequencyOption } from '@/types';
import { generateId } from '@/utils/storage';

export const CURRENT_SCHEMA_VERSION = 1;

const VERSIONED_STORAGE_KEY = 'dream_data_v2';
const BACKUP_STORAGE_KEY = 'dream_data_backup';
const MIGRATION_LOG_KEY = 'dream_migration_log';
const LEGACY_LOCATIONS_KEY = 'dream_locations';
const LEGACY_RELATIONS_KEY = 'dream_relations';

interface VersionedDreamData {
  schemaVersion: number;
  locations: DreamLocation[];
  relations: DreamRelation[];
  migratedAt: string;
}

interface MigrationBackup {
  createdAt: string;
  source: 'legacy' | 'versioned';
  schemaVersion: number | null;
  locations: unknown[];
  relations: unknown[];
  raw: {
    versioned: string | null;
    locations: string | null;
    relations: string | null;
  };
}

export interface MigrationResult {
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

export interface MigrationLogEntry {
  timestamp: string;
  fromVersion: number | null;
  toVersion: number;
  success: boolean;
  filteredCount: number;
  backupCreated: boolean;
  error?: string;
}

interface ValidationStats {
  invalid: number;
  reasons: string[];
}

type MigrationData = {
  locations: unknown[];
  relations: unknown[];
};

type MigrationFn = (data: MigrationData) => MigrationData;

const migrations: Record<number, MigrationFn> = {
  0: (data) => data,
};

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`Failed to read ${key}:`, error);
    return null;
  }
}

function parseArray(raw: string | null, label: string): unknown[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn(`Failed to parse ${label}:`, error);
    return [];
  }
}

function parseVersionedData(raw: string | null): VersionedDreamData | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<VersionedDreamData>;
    if (
      typeof parsed.schemaVersion === 'number' &&
      Array.isArray(parsed.locations) &&
      Array.isArray(parsed.relations)
    ) {
      return {
        schemaVersion: parsed.schemaVersion,
        locations: parsed.locations,
        relations: parsed.relations,
        migratedAt: typeof parsed.migratedAt === 'string' ? parsed.migratedAt : '',
      };
    }
  } catch (error) {
    console.warn('Failed to parse versioned dream data:', error);
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidDate(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}

function normalizeDatePair(createdAt: unknown, updatedAt: unknown): { createdAt: string; updatedAt: string } {
  const now = new Date().toISOString();
  const normalizedCreatedAt = typeof createdAt === 'string' && isValidDate(createdAt) ? createdAt : now;
  let normalizedUpdatedAt = typeof updatedAt === 'string' && isValidDate(updatedAt) ? updatedAt : now;

  if (new Date(normalizedCreatedAt) > new Date(normalizedUpdatedAt)) {
    normalizedUpdatedAt = normalizedCreatedAt;
  }

  return {
    createdAt: normalizedCreatedAt,
    updatedAt: normalizedUpdatedAt,
  };
}

function normalizePosition(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : Math.random() * 60 + 20;
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

function isFrequencyOption(value: unknown): value is FrequencyOption {
  return typeof value === 'string' && FREQUENCY_OPTIONS.includes(value as FrequencyOption);
}

function validateAndCleanLocations(locations: unknown[]): { valid: DreamLocation[]; stats: ValidationStats } {
  const valid: DreamLocation[] = [];
  const seenIds = new Set<string>();
  const reasons: string[] = [];

  locations.forEach((item, index) => {
    if (!isRecord(item)) {
      reasons.push(`location[${index}] is not an object`);
      return;
    }

    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const name = typeof item.name === 'string' ? item.name.trim() : '';

    if (!id || !name) {
      reasons.push(`location[${index}] is missing id or name`);
      return;
    }

    if (seenIds.has(id)) {
      reasons.push(`location[${index}] has duplicate id`);
      return;
    }

    seenIds.add(id);

    const { createdAt, updatedAt } = normalizeDatePair(item.createdAt, item.updatedAt);
    const frequency = isFrequencyOption(item.frequency)
      ? item.frequency
      : FREQUENCY_OPTIONS[0];
    const tags = Array.isArray(item.tags)
      ? item.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
      : [];

    valid.push({
      id,
      name,
      atmosphere: typeof item.atmosphere === 'string' ? item.atmosphere : '',
      frequency,
      relatedPeople: typeof item.relatedPeople === 'string' ? item.relatedPeople : '',
      memoryFragment: typeof item.memoryFragment === 'string' ? item.memoryFragment : '',
      emotionColor: isHexColor(item.emotionColor) ? item.emotionColor : '#6366f1',
      positionX: normalizePosition(item.positionX),
      positionY: normalizePosition(item.positionY),
      tags,
      createdAt,
      updatedAt,
    });
  });

  return {
    valid,
    stats: {
      invalid: locations.length - valid.length,
      reasons: reasons.slice(0, 20),
    },
  };
}

function validateAndCleanRelations(
  relations: unknown[],
  validLocationIds: Set<string>
): { valid: DreamRelation[]; stats: ValidationStats } {
  const valid: DreamRelation[] = [];
  const seenIds = new Set<string>();
  const reasons: string[] = [];

  relations.forEach((item, index) => {
    if (!isRecord(item)) {
      reasons.push(`relation[${index}] is not an object`);
      return;
    }

    const fromId = typeof item.fromId === 'string' ? item.fromId : '';
    const toId = typeof item.toId === 'string' ? item.toId : '';

    if (!validLocationIds.has(fromId) || !validLocationIds.has(toId) || fromId === toId) {
      reasons.push(`relation[${index}] has invalid endpoints`);
      return;
    }

    const { createdAt, updatedAt } = normalizeDatePair(item.createdAt, item.updatedAt);
    let id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : generateId();
    if (seenIds.has(id)) {
      id = generateId();
    }
    seenIds.add(id);

    const type = typeof item.type === 'string' && RELATION_TYPES.includes(item.type as RelationType)
      ? item.type as RelationType
      : RELATION_TYPES[0];

    valid.push({
      id,
      fromId,
      toId,
      type,
      description: typeof item.description === 'string' ? item.description : '',
      createdAt,
      updatedAt,
    });
  });

  return {
    valid,
    stats: {
      invalid: relations.length - valid.length,
      reasons: reasons.slice(0, 20),
    },
  };
}

function cleanData(data: MigrationData): {
  locations: DreamLocation[];
  relations: DreamRelation[];
  filteredCount: number;
  reasons: string[];
} {
  const locationResult = validateAndCleanLocations(data.locations);
  const validLocationIds = new Set(locationResult.valid.map((location) => location.id));
  const relationResult = validateAndCleanRelations(data.relations, validLocationIds);

  return {
    locations: locationResult.valid,
    relations: relationResult.valid,
    filteredCount: locationResult.stats.invalid + relationResult.stats.invalid,
    reasons: [...locationResult.stats.reasons, ...relationResult.stats.reasons],
  };
}

function loadLegacyData(): MigrationData {
  return {
    locations: parseArray(readStorage(LEGACY_LOCATIONS_KEY), LEGACY_LOCATIONS_KEY),
    relations: parseArray(readStorage(LEGACY_RELATIONS_KEY), LEGACY_RELATIONS_KEY),
  };
}

function createBackup(source: 'legacy' | 'versioned', schemaVersion: number | null, data: MigrationData): boolean {
  try {
    const backup: MigrationBackup = {
      createdAt: new Date().toISOString(),
      source,
      schemaVersion,
      locations: data.locations,
      relations: data.relations,
      raw: {
        versioned: readStorage(VERSIONED_STORAGE_KEY),
        locations: readStorage(LEGACY_LOCATIONS_KEY),
        relations: readStorage(LEGACY_RELATIONS_KEY),
      },
    };
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backup));
    return true;
  } catch (error) {
    console.error('Failed to create migration backup:', error);
    return false;
  }
}

function saveVersionedData(locations: DreamLocation[], relations: DreamRelation[]): boolean {
  try {
    const data: VersionedDreamData = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      locations,
      relations,
      migratedAt: new Date().toISOString(),
    };
    localStorage.setItem(VERSIONED_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save versioned dream data:', error);
    return false;
  }
}

function addMigrationLog(entry: Omit<MigrationLogEntry, 'timestamp'>): void {
  try {
    const logs = getMigrationLog();
    logs.unshift({
      ...entry,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem(MIGRATION_LOG_KEY, JSON.stringify(logs.slice(0, 50)));
  } catch (error) {
    console.warn('Failed to write migration log:', error);
  }
}

function restoreCleanedBackup(): Pick<MigrationResult, 'locations' | 'relations'> | null {
  const backup = getMigrationBackup();
  if (!backup || !isRecord(backup)) return null;

  const locations = Array.isArray(backup.locations)
    ? backup.locations
    : parseArray(isRecord(backup.raw) && typeof backup.raw.locations === 'string' ? backup.raw.locations : null, LEGACY_LOCATIONS_KEY);
  const relations = Array.isArray(backup.relations)
    ? backup.relations
    : parseArray(isRecord(backup.raw) && typeof backup.raw.relations === 'string' ? backup.raw.relations : null, LEGACY_RELATIONS_KEY);

  const cleaned = cleanData({ locations, relations });
  return {
    locations: cleaned.locations,
    relations: cleaned.relations,
  };
}

export function runMigrations(): MigrationResult {
  const rawVersioned = readStorage(VERSIONED_STORAGE_KEY);
  const versionedData = parseVersionedData(rawVersioned);

  if (versionedData && versionedData.schemaVersion >= CURRENT_SCHEMA_VERSION) {
    const backupCreated = createBackup('versioned', versionedData.schemaVersion, versionedData);
    const cleaned = cleanData(versionedData);
    if (cleaned.filteredCount > 0) {
      saveVersionedData(cleaned.locations, cleaned.relations);
      console.info(`[Storage Validation] Filtered ${cleaned.filteredCount} invalid records.`);
    }

    return {
      locations: cleaned.locations,
      relations: cleaned.relations,
      migrated: false,
      fromVersion: versionedData.schemaVersion,
      toVersion: CURRENT_SCHEMA_VERSION,
      filteredCount: cleaned.filteredCount,
      backupCreated,
      success: true,
    };
  }

  const fromVersion = versionedData ? versionedData.schemaVersion : 0;
  let currentData: MigrationData = versionedData ?? loadLegacyData();
  const hasData = currentData.locations.length > 0 || currentData.relations.length > 0;

  if (!hasData) {
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

  const backupCreated = createBackup(versionedData ? 'versioned' : 'legacy', fromVersion, currentData);

  try {
    let currentVersion = fromVersion;
    while (currentVersion < CURRENT_SCHEMA_VERSION) {
      const migration = migrations[currentVersion];
      if (!migration) {
        throw new Error(`Missing migration from schema version ${currentVersion}`);
      }
      currentData = migration(currentData);
      currentVersion += 1;
    }

    const cleaned = cleanData(currentData);
    if (!saveVersionedData(cleaned.locations, cleaned.relations)) {
      throw new Error('Failed to persist migrated dream data');
    }

    addMigrationLog({
      fromVersion,
      toVersion: CURRENT_SCHEMA_VERSION,
      success: true,
      filteredCount: cleaned.filteredCount,
      backupCreated,
    });

    if (cleaned.filteredCount > 0) {
      console.info(`[Storage Migration] Filtered ${cleaned.filteredCount} corrupted records.`);
    }

    return {
      locations: cleaned.locations,
      relations: cleaned.relations,
      migrated: true,
      fromVersion,
      toVersion: CURRENT_SCHEMA_VERSION,
      filteredCount: cleaned.filteredCount,
      backupCreated,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const restored = restoreCleanedBackup();

    addMigrationLog({
      fromVersion,
      toVersion: CURRENT_SCHEMA_VERSION,
      success: false,
      filteredCount: 0,
      backupCreated,
      error: errorMessage,
    });

    console.error('Dream data migration failed:', errorMessage);

    return {
      locations: restored?.locations ?? [],
      relations: restored?.relations ?? [],
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
  const locationResult = validateAndCleanLocations(importedLocations);
  const validLocationIds = new Set(locationResult.valid.map((location) => location.id));
  const relationResult = validateAndCleanRelations(importedRelations, validLocationIds);

  return {
    validLocations: locationResult.valid,
    validRelations: relationResult.valid,
    invalidLocationCount: locationResult.stats.invalid,
    invalidRelationCount: relationResult.stats.invalid,
    reasons: [...locationResult.stats.reasons, ...relationResult.stats.reasons],
  };
}

export function getMigrationBackup(): unknown | null {
  try {
    const rawBackup = localStorage.getItem(BACKUP_STORAGE_KEY);
    return rawBackup ? JSON.parse(rawBackup) : null;
  } catch (error) {
    console.error('Failed to read migration backup:', error);
    return null;
  }
}

export function restoreFromBackup(): boolean {
  const restored = restoreCleanedBackup();
  if (!restored) return false;

  return saveVersionedData(restored.locations, restored.relations);
}

export function clearMigrationBackup(): void {
  localStorage.removeItem(BACKUP_STORAGE_KEY);
}

export function getMigrationLog(): MigrationLogEntry[] {
  try {
    const rawLog = localStorage.getItem(MIGRATION_LOG_KEY);
    const parsed = rawLog ? JSON.parse(rawLog) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to read migration log:', error);
    return [];
  }
}

export function clearMigrationLog(): void {
  localStorage.removeItem(MIGRATION_LOG_KEY);
}

export function getCurrentSchemaVersion(): number {
  return parseVersionedData(readStorage(VERSIONED_STORAGE_KEY))?.schemaVersion ?? 0;
}
