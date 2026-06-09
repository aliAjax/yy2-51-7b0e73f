import type { DreamLocation } from '@/types';
import { FREQUENCY_OPTIONS } from '@/types';

export interface DreamCluster {
  id: string;
  name: string;
  color: string;
  locations: DreamLocation[];
  centerX: number;
  centerY: number;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function colorDistance(hex1: string, hex2: string): number {
  const hsl1 = hexToHsl(hex1);
  const hsl2 = hexToHsl(hex2);
  
  const dh = Math.min(Math.abs(hsl1.h - hsl2.h), 360 - Math.abs(hsl1.h - hsl2.h)) / 180;
  const ds = Math.abs(hsl1.s - hsl2.s) / 100;
  const dl = Math.abs(hsl1.l - hsl2.l) / 100;
  
  return dh * 0.6 + ds * 0.2 + dl * 0.2;
}

function frequencyScore(freq: string): number {
  const index = FREQUENCY_OPTIONS.indexOf(freq as typeof FREQUENCY_OPTIONS[number]);
  return index === -1 ? 0 : index / (FREQUENCY_OPTIONS.length - 1);
}

function extractKeywords(location: DreamLocation): string[] {
  const keywords: string[] = [];
  
  if (location.tags) {
    keywords.push(...location.tags);
  }
  
  if (location.atmosphere) {
    const atmosphereWords = location.atmosphere
      .split(/[，,。.\s]+/)
      .filter(w => w.trim().length > 1);
    keywords.push(...atmosphereWords);
  }
  
  if (location.relatedPeople) {
    const peopleWords = location.relatedPeople
      .split(/[，,、\s]+/)
      .filter(w => w.trim().length > 0);
    keywords.push(...peopleWords);
  }
  
  return [...new Set(keywords.map(k => k.toLowerCase()))];
}

function keywordSimilarity(loc1: DreamLocation, loc2: DreamLocation): number {
  const keywords1 = new Set(extractKeywords(loc1));
  const keywords2 = new Set(extractKeywords(loc2));
  
  if (keywords1.size === 0 && keywords2.size === 0) return 0.5;
  if (keywords1.size === 0 || keywords2.size === 0) return 0;
  
  let intersection = 0;
  keywords1.forEach(k => {
    if (keywords2.has(k)) intersection++;
  });
  
  const union = keywords1.size + keywords2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function peopleSimilarity(loc1: DreamLocation, loc2: DreamLocation): number {
  if (!loc1.relatedPeople && !loc2.relatedPeople) return 0.5;
  if (!loc1.relatedPeople || !loc2.relatedPeople) return 0;
  
  const people1 = new Set(
    loc1.relatedPeople.split(/[，,、\s]+/).filter(p => p.trim().length > 0).map(p => p.toLowerCase())
  );
  const people2 = new Set(
    loc2.relatedPeople.split(/[，,、\s]+/).filter(p => p.trim().length > 0).map(p => p.toLowerCase())
  );
  
  let intersection = 0;
  people1.forEach(p => {
    if (people2.has(p)) intersection++;
  });
  
  const union = people1.size + people2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function calculateSimilarity(loc1: DreamLocation, loc2: DreamLocation): number {
  const colorSim = 1 - colorDistance(loc1.emotionColor, loc2.emotionColor);
  const freqSim = 1 - Math.abs(frequencyScore(loc1.frequency) - frequencyScore(loc2.frequency));
  const keywordSim = keywordSimilarity(loc1, loc2);
  const peopleSim = peopleSimilarity(loc1, loc2);
  
  return colorSim * 0.35 + freqSim * 0.15 + keywordSim * 0.3 + peopleSim * 0.2;
}

export function clusterLocations(locations: DreamLocation[]): DreamCluster[] {
  if (locations.length === 0) return [];
  
  if (locations.length <= 3) {
    const avgColor = averageColor(locations.map(l => l.emotionColor));
    return [{
      id: 'cluster-0',
      name: generateClusterName(locations),
      color: avgColor,
      locations: [...locations],
      centerX: 50,
      centerY: 50,
    }];
  }
  
  const similarities: Map<string, number> = new Map();
  for (let i = 0; i < locations.length; i++) {
    for (let j = i + 1; j < locations.length; j++) {
      const key = `${locations[i].id}-${locations[j].id}`;
      similarities.set(key, calculateSimilarity(locations[i], locations[j]));
    }
  }
  
  const clusters: DreamCluster[] = locations.map((loc, i) => ({
    id: `cluster-${i}`,
    name: '',
    color: loc.emotionColor,
    locations: [loc],
    centerX: 0,
    centerY: 0,
  }));
  
  let clusterCount = clusters.length;
  const targetClusters = Math.min(Math.ceil(locations.length / 4), 6);
  
  while (clusterCount > targetClusters) {
    let maxSim = -1;
    let mergeI = -1;
    let mergeJ = -1;
    
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        if (clusters[i].locations.length === 0 || clusters[j].locations.length === 0) continue;
        
        let totalSim = 0;
        let pairCount = 0;
        
        for (const locA of clusters[i].locations) {
          for (const locB of clusters[j].locations) {
            const key = locA.id < locB.id 
              ? `${locA.id}-${locB.id}` 
              : `${locB.id}-${locA.id}`;
            totalSim += similarities.get(key) || 0;
            pairCount++;
          }
        }
        
        const avgSim = pairCount > 0 ? totalSim / pairCount : 0;
        
        if (avgSim > maxSim) {
          maxSim = avgSim;
          mergeI = i;
          mergeJ = j;
        }
      }
    }
    
    if (mergeI === -1 || mergeJ === -1 || maxSim < 0.15) break;
    
    const mergedLocations = [...clusters[mergeI].locations, ...clusters[mergeJ].locations];
    const mergedColors = mergedLocations.map(l => l.emotionColor);
    const mergedColor = averageColor(mergedColors);
    
    clusters[mergeI] = {
      ...clusters[mergeI],
      name: generateClusterName(mergedLocations),
      color: mergedColor,
      locations: mergedLocations,
    };
    clusters[mergeJ].locations = [];
    
    clusterCount--;
  }
  
  const validClusters = clusters.filter(c => c.locations.length > 0);
  
  arrangeClusters(validClusters);
  
  validClusters.forEach((cluster, index) => {
    if (!cluster.name) {
      cluster.name = generateClusterName(cluster.locations);
    }
    cluster.id = `cluster-${index}`;
  });
  
  return validClusters;
}

function averageColor(colors: string[]): string {
  if (colors.length === 0) return '#6366f1';
  
  let r = 0, g = 0, b = 0;
  colors.forEach(color => {
    r += parseInt(color.slice(1, 3), 16);
    g += parseInt(color.slice(3, 5), 16);
    b += parseInt(color.slice(5, 7), 16);
  });
  
  r = Math.round(r / colors.length);
  g = Math.round(g / colors.length);
  b = Math.round(b / colors.length);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function generateClusterName(locations: DreamLocation[]): string {
  const allKeywords: string[] = [];
  const keywordCount: Map<string, number> = new Map();
  
  locations.forEach(loc => {
    const keywords = extractKeywords(loc);
    keywords.forEach(kw => {
      const count = keywordCount.get(kw) || 0;
      keywordCount.set(kw, count + 1);
      if (!allKeywords.includes(kw)) {
        allKeywords.push(kw);
      }
    });
  });
  
  const sortedKeywords = allKeywords.sort((a, b) => 
    (keywordCount.get(b) || 0) - (keywordCount.get(a) || 0)
  );
  
  if (sortedKeywords.length > 0) {
    const topKeyword = sortedKeywords[0];
    return topKeyword.charAt(0).toUpperCase() + topKeyword.slice(1);
  }
  
  if (locations.length > 0) {
    return locations[0].name + '等';
  }
  
  return '未知星群';
}

function arrangeClusters(clusters: DreamCluster[]): void {
  const count = clusters.length;
  
  if (count === 1) {
    clusters[0].centerX = 50;
    clusters[0].centerY = 50;
    return;
  }
  
  if (count === 2) {
    clusters[0].centerX = 30;
    clusters[0].centerY = 50;
    clusters[1].centerX = 70;
    clusters[1].centerY = 50;
    return;
  }
  
  if (count === 3) {
    clusters[0].centerX = 50;
    clusters[0].centerY = 25;
    clusters[1].centerX = 25;
    clusters[1].centerY = 70;
    clusters[2].centerX = 75;
    clusters[2].centerY = 70;
    return;
  }
  
  if (count === 4) {
    clusters[0].centerX = 30;
    clusters[0].centerY = 30;
    clusters[1].centerX = 70;
    clusters[1].centerY = 30;
    clusters[2].centerX = 30;
    clusters[2].centerY = 70;
    clusters[3].centerX = 70;
    clusters[3].centerY = 70;
    return;
  }
  
  const radius = 32;
  const centerX = 50;
  const centerY = 50;
  
  clusters.forEach((cluster, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    cluster.centerX = centerX + radius * Math.cos(angle);
    cluster.centerY = centerY + radius * Math.sin(angle);
  });
}

export function arrangeLocationsInCluster(
  cluster: DreamCluster,
  containerWidth: number = 100,
  containerHeight: number = 100
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const locations = cluster.locations;
  
  if (locations.length === 0) return positions;
  
  if (locations.length === 1) {
    positions.set(locations[0].id, { x: cluster.centerX, y: cluster.centerY });
    return positions;
  }
  
  const clusterRadius = Math.min(18, 8 + locations.length * 1.5);
  
  locations.forEach((loc, i) => {
    const angle = (2 * Math.PI * i) / locations.length - Math.PI / 2;
    const r = clusterRadius * 0.7 + Math.random() * clusterRadius * 0.3;
    const x = cluster.centerX + r * Math.cos(angle);
    const y = cluster.centerY + r * Math.sin(angle);
    
    positions.set(loc.id, {
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y)),
    });
  });
  
  return positions;
}
