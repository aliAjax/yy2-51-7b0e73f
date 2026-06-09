import type { DreamLocation } from '@/types';

export interface DreamCluster {
  id: string;
  name: string;
  color: string;
  centerX: number;
  centerY: number;
  locationIds: string[];
  keywords: string[];
}

export interface ClusteredDreamLocation extends DreamLocation {
  clusterId: string;
  clusterName: string;
  originalPositionX: number;
  originalPositionY: number;
}

const FREQUENCY_WEIGHT: Record<string, number> = {
  '偶尔': 1,
  '经常': 2,
  '频繁': 3,
  '每次都会': 4,
};

const TOKEN_SPLIT_PATTERN = /[\s,，、.。;；:：/\\|]+/;
const WEAK_WORDS = new Set([
  '梦',
  '梦里',
  '一个',
  '一些',
  '那里',
  '这里',
  '感觉',
  '地方',
  '场景',
]);

interface LocationTraits {
  emotionFamily: string;
  frequencyLevel: number;
  people: string[];
  atmosphere: string[];
}

interface MutableCluster {
  id: string;
  members: DreamLocation[];
}

export function buildDreamClusters(locations: DreamLocation[]): {
  clusters: DreamCluster[];
  locations: ClusteredDreamLocation[];
} {
  if (locations.length === 0) {
    return { clusters: [], locations: [] };
  }

  const traitsById = new Map(
    locations.map((location) => [location.id, getLocationTraits(location)])
  );
  const groups = createGroups(locations, traitsById);
  const centers = getClusterCenters(groups.length);

  const clusters = groups.map((group, index) => {
    const center = centers[index];
    const traits = group.members.map((location) => traitsById.get(location.id)!);
    const keywords = getClusterKeywords(group.members, traits);
    const name = getClusterName(keywords, traits);

    return {
      id: group.id,
      name,
      color: getClusterColor(group.members),
      centerX: center.x,
      centerY: center.y,
      locationIds: group.members.map((location) => location.id),
      keywords,
    };
  });

  const clusterLocations = new Map<string, ClusteredDreamLocation>();
  groups.forEach((group, groupIndex) => {
    const center = centers[groupIndex];
    const radius = getGroupRadius(group.members.length);

    group.members.forEach((location, memberIndex) => {
      const angle = (Math.PI * 2 * memberIndex) / Math.max(group.members.length, 1) - Math.PI / 2;
      const ring = group.members.length === 1 ? 0 : radius * (0.72 + (memberIndex % 3) * 0.14);
      const x = clamp(center.x + Math.cos(angle) * ring, 8, 92);
      const y = clamp(center.y + Math.sin(angle) * ring, 12, 88);

      clusterLocations.set(location.id, {
        ...location,
        positionX: x,
        positionY: y,
        clusterId: group.id,
        clusterName: clusters[groupIndex].name,
        originalPositionX: location.positionX,
        originalPositionY: location.positionY,
      });
    });
  });

  return {
    clusters,
    locations: locations.map((location) => clusterLocations.get(location.id)!),
  };
}

function createGroups(
  locations: DreamLocation[],
  traitsById: Map<string, LocationTraits>
): MutableCluster[] {
  const ordered = [...locations].sort((a, b) => {
    const frequencyGap =
      (FREQUENCY_WEIGHT[b.frequency] || 0) - (FREQUENCY_WEIGHT[a.frequency] || 0);
    return frequencyGap || a.name.localeCompare(b.name, 'zh-Hans-CN');
  });
  const groups: MutableCluster[] = [];

  ordered.forEach((location) => {
    let bestGroup: MutableCluster | null = null;
    let bestScore = 0;

    groups.forEach((group) => {
      const score = getAverageSimilarity(location, group.members, traitsById);
      if (score > bestScore) {
        bestScore = score;
        bestGroup = group;
      }
    });

    if (bestGroup && bestScore >= 0.34) {
      bestGroup.members.push(location);
    } else {
      groups.push({
        id: `cluster-${groups.length + 1}`,
        members: [location],
      });
    }
  });

  return mergeOverflowGroups(groups, traitsById);
}

function mergeOverflowGroups(
  groups: MutableCluster[],
  traitsById: Map<string, LocationTraits>
): MutableCluster[] {
  if (groups.length <= 6) return groups;

  const sorted = [...groups].sort((a, b) => b.members.length - a.members.length);
  const mainGroups = sorted.slice(0, 6);
  const overflow = sorted.slice(6);

  overflow.forEach((group) => {
    let bestGroup = mainGroups[0];
    let bestScore = -1;
    mainGroups.forEach((target) => {
      const score =
        group.members.reduce(
          (sum, member) => sum + getAverageSimilarity(member, target.members, traitsById),
          0
        ) / group.members.length;
      if (score > bestScore) {
        bestScore = score;
        bestGroup = target;
      }
    });
    bestGroup.members.push(...group.members);
  });

  return mainGroups.map((group, index) => ({
    ...group,
    id: `cluster-${index + 1}`,
  }));
}

function getAverageSimilarity(
  location: DreamLocation,
  members: DreamLocation[],
  traitsById: Map<string, LocationTraits>
): number {
  const current = traitsById.get(location.id)!;
  return (
    members.reduce((sum, member) => {
      return sum + getSimilarity(current, traitsById.get(member.id)!);
    }, 0) / members.length
  );
}

function getSimilarity(a: LocationTraits, b: LocationTraits): number {
  const sharedPeople = intersectionSize(a.people, b.people);
  const sharedAtmosphere = intersectionSize(a.atmosphere, b.atmosphere);
  const frequencyDistance = Math.abs(a.frequencyLevel - b.frequencyLevel);

  return (
    (a.emotionFamily === b.emotionFamily ? 0.28 : 0) +
    Math.max(0, 0.2 - frequencyDistance * 0.07) +
    Math.min(sharedPeople * 0.22, 0.28) +
    Math.min(sharedAtmosphere * 0.18, 0.24)
  );
}

function getLocationTraits(location: DreamLocation): LocationTraits {
  return {
    emotionFamily: getEmotionFamily(location.emotionColor),
    frequencyLevel: FREQUENCY_WEIGHT[location.frequency] || 1,
    people: tokenize(location.relatedPeople),
    atmosphere: tokenize(location.atmosphere),
  };
}

function tokenize(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(TOKEN_SPLIT_PATTERN)
        .map((token) => token.trim())
        .filter((token) => token.length > 1 && !WEAK_WORDS.has(token))
        .slice(0, 8)
    )
  );
}

function getClusterKeywords(locations: DreamLocation[], traits: LocationTraits[]): string[] {
  const counts = new Map<string, number>();

  traits.forEach((trait) => {
    [trait.emotionFamily, ...trait.people, ...trait.atmosphere].forEach((keyword) => {
      counts.set(keyword, (counts.get(keyword) || 0) + 1);
    });
  });

  locations.forEach((location) => {
    counts.set(location.frequency, (counts.get(location.frequency) || 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN'))
    .slice(0, 4)
    .map(([keyword]) => keyword);
}

function getClusterName(keywords: string[], traits: LocationTraits[]): string {
  const emotion = mostCommon(traits.map((trait) => trait.emotionFamily));
  const primary = keywords.find((keyword) => keyword !== emotion) || emotion;
  return `${primary}星群`;
}

function getClusterColor(locations: DreamLocation[]): string {
  const counts = new Map<string, number>();
  locations.forEach((location) => {
    counts.set(location.emotionColor, (counts.get(location.emotionColor) || 0) + 1);
  });

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '#9b59b6';
}

function getClusterCenters(count: number): { x: number; y: number }[] {
  const presets = [
    { x: 25, y: 28 },
    { x: 73, y: 30 },
    { x: 30, y: 72 },
    { x: 70, y: 72 },
    { x: 50, y: 22 },
    { x: 50, y: 78 },
  ];

  if (count <= presets.length) return presets.slice(0, count);

  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    return {
      x: 50 + Math.cos(angle) * 30,
      y: 50 + Math.sin(angle) * 28,
    };
  });
}

function getGroupRadius(count: number): number {
  if (count <= 1) return 0;
  if (count <= 3) return 8;
  if (count <= 6) return 11;
  return 14;
}

function getEmotionFamily(hex: string): string {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return '紫雾';

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  if (delta === 0) return '雾灰';

  let hue = 0;
  if (max === r) hue = ((g - b) / delta) % 6;
  if (max === g) hue = (b - r) / delta + 2;
  if (max === b) hue = (r - g) / delta + 4;
  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;

  if (hue < 25 || hue >= 335) return '绯红';
  if (hue < 65) return '金橙';
  if (hue < 155) return '幽绿';
  if (hue < 205) return '湖蓝';
  if (hue < 265) return '靛蓝';
  return '紫雾';
}

function intersectionSize(a: string[], b: string[]): number {
  const bSet = new Set(b);
  return a.filter((item) => bSet.has(item)).length;
}

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '梦境';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
