import type { DreamLocation } from '@/types';

const STORAGE_KEY = 'dream_locations';

export function loadDreamLocations(): DreamLocation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load dream locations:', e);
  }
  return [];
}

export function saveDreamLocations(locations: DreamLocation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
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
