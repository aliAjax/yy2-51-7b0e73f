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
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type RelationType = '相似' | '延续' | '反复出现' | '人物相关';

export const RELATION_TYPES: RelationType[] = [
  '相似',
  '延续',
  '反复出现',
  '人物相关',
];

export const RELATION_TYPE_COLORS: Record<RelationType, string> = {
  '相似': '#9b59b6',
  '延续': '#3498db',
  '反复出现': '#e74c3c',
  '人物相关': '#f39c12',
};

export interface DreamRelation {
  id: string;
  fromId: string;
  toId: string;
  type: RelationType;
  description: string;
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
