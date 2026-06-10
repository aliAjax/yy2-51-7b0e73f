import type { DreamLocation } from '@/types';
import { FREQUENCY_OPTIONS } from '@/types';

export type LayoutType = 'tag-cluster' | 'frequency-ring' | 'time-layer';

export interface LayoutResult {
  positions: Map<string, { positionX: number; positionY: number }>;
  description: string;
}

function clampPosition(x: number, y: number): { positionX: number; positionY: number } {
  return {
    positionX: Math.max(5, Math.min(95, x)),
    positionY: Math.max(5, Math.min(95, y)),
  };
}

export function arrangeByTagCluster(locations: DreamLocation[]): LayoutResult {
  const positions = new Map<string, { positionX: number; positionY: number }>();

  if (locations.length === 0) {
    return { positions, description: '没有可排列的地点' };
  }

  if (locations.length === 1) {
    positions.set(locations[0].id, { positionX: 50, positionY: 50 });
    return { positions, description: '仅 1 个地点，居中显示' };
  }

  const tagGroups = new Map<string, DreamLocation[]>();
  const untagged: DreamLocation[] = [];

  locations.forEach((loc) => {
    if (loc.tags && loc.tags.length > 0) {
      const primaryTag = loc.tags[0];
      if (!tagGroups.has(primaryTag)) {
        tagGroups.set(primaryTag, []);
      }
      tagGroups.get(primaryTag)!.push(loc);
    } else {
      untagged.push(loc);
    }
  });

  const allGroups: { name: string; locations: DreamLocation[] }[] = [];
  tagGroups.forEach((locs, name) => {
    allGroups.push({ name, locations: locs });
  });
  allGroups.sort((a, b) => b.locations.length - a.locations.length);

  if (untagged.length > 0) {
    allGroups.push({ name: '未分类', locations: untagged });
  }

  const groupCount = allGroups.length;
  const mainRadius = 30;
  const centerX = 50;
  const centerY = 50;

  if (groupCount === 1) {
    const group = allGroups[0];
    arrangeGroupInRing(group.locations, centerX, centerY, 15, positions);
    return { positions, description: `按 1 个标签组排列，共 ${locations.length} 个地点` };
  }

  allGroups.forEach((group, groupIndex) => {
    const angle = (2 * Math.PI * groupIndex) / groupCount - Math.PI / 2;
    const groupCenterX = centerX + mainRadius * Math.cos(angle);
    const groupCenterY = centerY + mainRadius * Math.sin(angle);
    const groupRadius = Math.min(12, 5 + group.locations.length * 0.8);
    arrangeGroupInRing(group.locations, groupCenterX, groupCenterY, groupRadius, positions);
  });

  return { positions, description: `按 ${groupCount} 个标签组排列，共 ${locations.length} 个地点` };
}

function arrangeGroupInRing(
  locations: DreamLocation[],
  centerX: number,
  centerY: number,
  radius: number,
  positions: Map<string, { positionX: number; positionY: number }>
) {
  if (locations.length === 0) return;

  if (locations.length === 1) {
    positions.set(locations[0].id, clampPosition(centerX, centerY));
    return;
  }

  locations.forEach((loc, i) => {
    const angle = (2 * Math.PI * i) / locations.length - Math.PI / 2;
    const r = radius * (0.7 + Math.random() * 0.3);
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    positions.set(loc.id, clampPosition(x, y));
  });
}

export function arrangeByFrequencyRing(locations: DreamLocation[]): LayoutResult {
  const positions = new Map<string, { positionX: number; positionY: number }>();

  if (locations.length === 0) {
    return { positions, description: '没有可排列的地点' };
  }

  if (locations.length === 1) {
    positions.set(locations[0].id, { positionX: 50, positionY: 50 });
    return { positions, description: '仅 1 个地点，居中显示' };
  }

  const freqOrder = FREQUENCY_OPTIONS as unknown as string[];
  const frequencyGroups = new Map<string, DreamLocation[]>();

  freqOrder.forEach((freq) => frequencyGroups.set(freq, []));
  frequencyGroups.set('其他', []);

  locations.forEach((loc) => {
    const group = frequencyGroups.has(loc.frequency) ? loc.frequency : '其他';
    frequencyGroups.get(group)!.push(loc);
  });

  const activeGroups: { frequency: string; locations: DreamLocation[]; radius: number }[] = [];
  const orderedFreqs = [...freqOrder, '其他'];
  const centerX = 50;
  const centerY = 50;

  let ringIndex = 0;
  orderedFreqs.forEach((freq) => {
    const locs = frequencyGroups.get(freq);
    if (locs && locs.length > 0) {
      const radius = 10 + ringIndex * 10;
      activeGroups.push({ frequency: freq, locations: locs, radius });
      ringIndex++;
    }
  });

  if (activeGroups.length === 0) {
    locations.forEach((loc, i) => {
      const angle = (2 * Math.PI * i) / locations.length - Math.PI / 2;
      const x = centerX + 20 * Math.cos(angle);
      const y = centerY + 20 * Math.sin(angle);
      positions.set(loc.id, clampPosition(x, y));
    });
    return { positions, description: `环形排列 ${locations.length} 个地点` };
  }

  activeGroups.forEach((group) => {
    const { locations: locs, radius } = group;
    if (locs.length === 0) return;

    if (locs.length === 1) {
      const single = locs[0];
      if (activeGroups.length === 1) {
        positions.set(single.id, clampPosition(centerX, centerY));
      } else {
        const angle = -Math.PI / 2;
        positions.set(
          single.id,
          clampPosition(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle))
        );
      }
      return;
    }

    locs.forEach((loc, i) => {
      const angle = (2 * Math.PI * i) / locs.length - Math.PI / 2;
      const r = radius * (0.9 + Math.random() * 0.2);
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      positions.set(loc.id, clampPosition(x, y));
    });
  });

  const groupDesc = activeGroups.map((g) => `${g.frequency}(${g.locations.length})`).join('、');
  return { positions, description: `按频率分 ${activeGroups.length} 层环形排列: ${groupDesc}` };
}

export function arrangeByTimeLayer(locations: DreamLocation[]): LayoutResult {
  const positions = new Map<string, { positionX: number; positionY: number }>();

  if (locations.length === 0) {
    return { positions, description: '没有可排列的地点' };
  }

  if (locations.length === 1) {
    positions.set(locations[0].id, { positionX: 50, positionY: 50 });
    return { positions, description: '仅 1 个地点，居中显示' };
  }

  const sorted = [...locations].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });

  const total = sorted.length;
  const layerCount = Math.min(Math.ceil(total / 5), 5);
  const itemsPerLayer = Math.ceil(total / layerCount);

  const layers: DreamLocation[][] = [];
  for (let i = 0; i < layerCount; i++) {
    layers.push(sorted.slice(i * itemsPerLayer, (i + 1) * itemsPerLayer));
  }

  const topY = 12;
  const bottomY = 88;
  const layerGap = layers.length > 1 ? (bottomY - topY) / (layers.length - 1) : 0;

  layers.forEach((layer, layerIdx) => {
    const layerY = layers.length === 1 ? 50 : topY + layerGap * layerIdx;
    const itemCount = layer.length;

    if (itemCount === 0) return;

    if (itemCount === 1) {
      positions.set(layer[0].id, clampPosition(50, layerY));
      return;
    }

    const leftX = 10;
    const rightX = 90;
    const itemGap = (rightX - leftX) / (itemCount - 1);

    layer.forEach((loc, itemIdx) => {
      const baseX = leftX + itemGap * itemIdx;
      const jitter = (Math.random() - 0.5) * 6;
      const yJitter = (Math.random() - 0.5) * 4;
      positions.set(loc.id, clampPosition(baseX + jitter, layerY + yJitter));
    });
  });

  return { positions, description: `按创建时间分 ${layerCount} 层排列，共 ${locations.length} 个地点` };
}

export function applyLayout(
  layoutType: LayoutType,
  locations: DreamLocation[]
): LayoutResult {
  switch (layoutType) {
    case 'tag-cluster':
      return arrangeByTagCluster(locations);
    case 'frequency-ring':
      return arrangeByFrequencyRing(locations);
    case 'time-layer':
      return arrangeByTimeLayer(locations);
  }
}

export const LAYOUT_INFO: Record<LayoutType, { name: string; description: string; icon: string }> = {
  'tag-cluster': {
    name: '按标签聚类',
    description: '相同标签的地点聚集成簇，不同簇分散排列',
    icon: 'Tags',
  },
  'frequency-ring': {
    name: '按频率环形',
    description: '按出现频率分多层环形，频率越高越靠近中心',
    icon: 'Circle',
  },
  'time-layer': {
    name: '按时间分层',
    description: '按创建时间从上到下分层排列，同时期的在同一层',
    icon: 'Layers',
  },
};
