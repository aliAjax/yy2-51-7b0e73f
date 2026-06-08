export interface DreamLocation {
  id: string;
  name: string;
  atmosphere: string;
  frequency: string;
  relatedPeople: string;
  memoryFragment: string;
  emotionColor: string;
  positionX: number;
  positionY: number;
  createdAt: string;
  updatedAt: string;
}

export type FrequencyOption = '偶尔' | '经常' | '频繁' | '每次都会';

export const FREQUENCY_OPTIONS: FrequencyOption[] = [
  '偶尔',
  '经常',
  '频繁',
  '每次都会',
];
