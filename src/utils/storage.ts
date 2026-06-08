import type { DreamLocation } from '@/types';

const STORAGE_KEY = 'dream_locations';

export function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];

  return Array.from(
    new Set(
      tags
        .filter((tag): tag is string => typeof tag === 'string')
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

export function normalizeDreamLocation(item: unknown): DreamLocation | null {
  if (typeof item !== 'object' || item === null) return null;

  const loc = item as Record<string, unknown>;
  if (
    typeof loc.id !== 'string' ||
    typeof loc.name !== 'string' ||
    typeof loc.atmosphere !== 'string' ||
    typeof loc.frequency !== 'string' ||
    typeof loc.relatedPeople !== 'string' ||
    typeof loc.memoryFragment !== 'string' ||
    typeof loc.emotionColor !== 'string' ||
    typeof loc.positionX !== 'number' ||
    typeof loc.positionY !== 'number' ||
    typeof loc.createdAt !== 'string' ||
    typeof loc.updatedAt !== 'string'
  ) {
    return null;
  }

  return {
    id: loc.id,
    name: loc.name,
    atmosphere: loc.atmosphere,
    frequency: loc.frequency,
    relatedPeople: loc.relatedPeople,
    memoryFragment: loc.memoryFragment,
    emotionColor: loc.emotionColor,
    tags: normalizeTags(loc.tags),
    positionX: loc.positionX,
    positionY: loc.positionY,
    createdAt: loc.createdAt,
    updatedAt: loc.updatedAt,
  };
}

export function loadDreamLocations(): DreamLocation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => normalizeDreamLocation(item))
          .filter((item): item is DreamLocation => item !== null);
      }
    }
  } catch (e) {
    console.error('Failed to load dream locations:', e);
  }
  return [];
}

export function saveDreamLocations(locations: DreamLocation[]): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        locations
          .map((location) => normalizeDreamLocation(location))
          .filter((location): location is DreamLocation => location !== null)
      )
    );
  } catch (e) {
    console.error('Failed to save dream locations:', e);
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1a1a2e' : '#ffffff';
}
