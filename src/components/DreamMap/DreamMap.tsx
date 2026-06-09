import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { SearchX } from 'lucide-react';
import { DreamNode } from './DreamNode';
import { RelationLines } from './RelationLines';
import { MapControls } from './MapControls';
import { DreamPlayback, PlaybackSortMode } from './DreamPlayback';
import { ExploreControls } from '@/components/ExploreControls/ExploreControls';
import { useDreamStore, filterLocations } from '@/store/dreamStore';
import { clusterLocations, arrangeLocationsInCluster } from '@/utils/clustering';
import { hexToRgba } from '@/utils/storage';
import type { DreamLocation } from '@/types';

interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const ZOOM_STEP = 0.1;
const WHEEL_ZOOM_FACTOR = 0.0015;
const PAN_THRESHOLD = 3;
const KEYBOARD_PAN_STEP = 40;
const DOUBLE_CLICK_ZOOM_FACTOR = 1.5;

interface TouchLike {
  clientX: number;
  clientY: number;
}

function getTouchDistance(touch1: TouchLike, touch2: TouchLike): number {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTouchCenter(touch1: TouchLike, touch2: TouchLike): { x: number; y: number } {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  };
}

function clampOffset(
  offsetX: number,
  offsetY: number,
  scale: number,
  containerWidth: number,
  containerHeight: number
): { offsetX: number; offsetY: number } {
  const scaledWidth = containerWidth * scale;
  const scaledHeight = containerHeight * scale;

  let minOffsetX: number;
  let maxOffsetX: number;
  if (scaledWidth >= containerWidth) {
    minOffsetX = containerWidth - scaledWidth;
    maxOffsetX = 0;
  } else {
    minOffsetX = 0;
    maxOffsetX = containerWidth - scaledWidth;
  }

  let minOffsetY: number;
  let maxOffsetY: number;
  if (scaledHeight >= containerHeight) {
    minOffsetY = containerHeight - scaledHeight;
    maxOffsetY = 0;
  } else {
    minOffsetY = 0;
    maxOffsetY = containerHeight - scaledHeight;
  }

  return {
    offsetX: Math.max(minOffsetX, Math.min(maxOffsetX, offsetX)),
    offsetY: Math.max(minOffsetY, Math.min(maxOffsetY, offsetY)),
  };
}

export function DreamMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const transformLayerRef = useRef<HTMLDivElement>(null);
  const locations = useDreamStore((state) => state.locations);
  const relations = useDreamStore((state) => state.relations);
  const filters = useDreamStore((state) => state.filters);
  const clearFilters = useDreamStore((state) => state.clearFilters);
  const selectLocation = useDreamStore((state) => state.selectLocation);
  const selectRelation = useDreamStore((state) => state.selectRelation);
  const selectedLocationId = useDreamStore((state) => state.selectedLocationId);
  const selectedRelationId = useDreamStore((state) => state.selectedRelationId);
  const viewMode = useDreamStore((state) => state.viewMode);
  const setViewMode = useDreamStore((state) => state.setViewMode);
  const setClusterPositions = useDreamStore((state) => state.setClusterPositions);
  const isExploreMode = useDreamStore((state) => state.isExploreMode);
  const exploreCenterId = useDreamStore((state) => state.exploreCenterId);
  const getExploreLocations = useDreamStore((state) => state.getExploreLocations);
  const enterExploreMode = useDreamStore((state) => state.enterExploreMode);

  const prevIsExploreModeRef = useRef(false);
  const exploreCenterRef = useRef<string | null>(null);
  const preExploreViewTransformRef = useRef<ViewTransform | null>(null);

  const [viewTransform, setViewTransform] = useState<ViewTransform>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const [isSmoothTransition, setIsSmoothTransition] = useState(false);

  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, startOffsetX: 0, startOffsetY: 0 });
  const hasPannedRef = useRef(false);
  const lastClickTimeRef = useRef(0);

  const [isPinching, setIsPinching] = useState(false);
  const pinchStartRef = useRef({
    distance: 0,
    centerX: 0,
    centerY: 0,
    startScale: 1,
    startOffsetX: 0,
    startOffsetY: 0,
  });
  const touchCountRef = useRef(0);
  const isNodeDraggingRef = useRef(false);

  const [isPlaybackMode, setIsPlaybackMode] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackSortMode, setPlaybackSortMode] = useState<PlaybackSortMode>('time');
  const [playbackDuration, setPlaybackDuration] = useState(5);
  const playbackTimerRef = useRef<number | null>(null);
  const isPlaybackModeRef = useRef(false);
  const prePlaybackStateRef = useRef<{
    selectedLocationId: string | null;
    selectedRelationId: string | null;
    viewTransform: ViewTransform;
  } | null>(null);

  const filteredLocations = useMemo(() => {
    if (isExploreMode) {
      return getExploreLocations();
    }
    return filterLocations(locations, relations, filters);
  }, [locations, relations, filters, isExploreMode, getExploreLocations]);

  const clusters = useMemo(
    () => clusterLocations(filteredLocations),
    [filteredLocations]
  );

  const clusterPositions = useDreamStore((state) => state.clusterPositions);

  const displayLocations = useMemo(() => {
    if (viewMode === 'map') {
      return filteredLocations;
    }
    
    return filteredLocations.map((loc) => {
      const pos = clusterPositions.get(loc.id);
      if (pos) {
        return { ...loc, positionX: pos.positionX, positionY: pos.positionY };
      }
      return loc;
    });
  }, [viewMode, filteredLocations, clusterPositions]);

  const hasActiveFilters =
    !!filters.searchText.trim() ||
    !!filters.frequency ||
    filters.selectedTags.length > 0 ||
    filters.selectedPeople.length > 0 ||
    filters.selectedRelationTypes.length > 0;
  const hasResults = filteredLocations.length > 0;

  useEffect(() => {
    if (viewMode === 'cluster' && clusters.length > 0) {
      const allPositions = new Map<string, { positionX: number; positionY: number }>();
      
      clusters.forEach((cluster) => {
        const positions = arrangeLocationsInCluster(cluster);
        positions.forEach((pos, id) => {
          allPositions.set(id, { positionX: pos.x, positionY: pos.y });
        });
      });

      setClusterPositions(allPositions);
    }
  }, [viewMode, clusters, setClusterPositions]);

  useEffect(() => {
    isPlaybackModeRef.current = isPlaybackMode;
  }, [isPlaybackMode]);

  const playbackLocations = useMemo(() => {
    const locs = [...filteredLocations];
    if (playbackSortMode === 'time') {
      locs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      const freqOrder = ['经常', '偶尔', '很少', '一次'];
      locs.sort((a, b) => {
        const aIdx = freqOrder.indexOf(a.frequency);
        const bIdx = freqOrder.indexOf(b.frequency);
        return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
      });
    }
    return locs;
  }, [filteredLocations, playbackSortMode]);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const container = mapRef.current;
    if (!container) return;

    container.style.position = 'relative';
    container.style.overflow = 'hidden';

    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '0';

    container.insertBefore(canvas, container.firstChild);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const stars: { x: number; y: number; size: number; opacity: number; speed: number }[] = [];
    const starCount = 100;

    function resize() {
      if (!container || !canvas) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;

      stars.length = 0;
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.8 + 0.2,
          speed: Math.random() * 0.0005 + 0.0002,
        });
      }
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star) => {
        const twinkle = Math.sin(Date.now() * star.speed) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 180, 255, ${star.opacity * twinkle})`;
        ctx.fill();

        if (star.size > 1.5) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 180, 255, ${star.opacity * twinkle * 0.1})`;
          ctx.fill();
        }
      });

      animationId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      canvas.remove();
    };
  }, []);

  const applyViewTransform = useCallback((
    newScale: number,
    newOffsetX: number,
    newOffsetY: number,
    smooth: boolean = false
  ) => {
    const container = mapRef.current;
    if (!container) return;

    const { offsetX: clampedX, offsetY: clampedY } = clampOffset(
      newOffsetX,
      newOffsetY,
      newScale,
      container.clientWidth,
      container.clientHeight
    );

    if (smooth) {
      setIsSmoothTransition(true);
      setViewTransform({ scale: newScale, offsetX: clampedX, offsetY: clampedY });
      setTimeout(() => setIsSmoothTransition(false), 300);
    } else {
      setViewTransform({ scale: newScale, offsetX: clampedX, offsetY: clampedY });
    }
  }, []);

  const focusOnLocation = useCallback((location: DreamLocation) => {
    const container = mapRef.current;
    if (!container) return;

    const targetScale = 1.5;
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;

    const locCenterX = (location.positionX / 100) * container.clientWidth * targetScale;
    const locCenterY = (location.positionY / 100) * container.clientHeight * targetScale;

    const newOffsetX = centerX - locCenterX;
    const newOffsetY = centerY - locCenterY;

    applyViewTransform(targetScale, newOffsetX, newOffsetY, true);
    selectLocation(location.id);
    selectRelation(null);
  }, [applyViewTransform, selectLocation, selectRelation]);

  useEffect(() => {
    if (!prevIsExploreModeRef.current && isExploreMode) {
      preExploreViewTransformRef.current = { ...viewTransform };
      if (exploreCenterId) {
        const centerLocation = locations.find((l) => l.id === exploreCenterId);
        if (centerLocation) {
          requestAnimationFrame(() => {
            focusOnLocation(centerLocation);
          });
        }
      }
    }

    if (prevIsExploreModeRef.current && !isExploreMode) {
      if (preExploreViewTransformRef.current) {
        const vt = preExploreViewTransformRef.current;
        requestAnimationFrame(() => {
          applyViewTransform(vt.scale, vt.offsetX, vt.offsetY, true);
        });
        preExploreViewTransformRef.current = null;
      }
    }

    if (
      isExploreMode &&
      prevIsExploreModeRef.current &&
      exploreCenterId !== exploreCenterRef.current &&
      exploreCenterId
    ) {
      const centerLocation = locations.find((l) => l.id === exploreCenterId);
      if (centerLocation) {
        requestAnimationFrame(() => {
          focusOnLocation(centerLocation);
        });
      }
    }

    prevIsExploreModeRef.current = isExploreMode;
    exploreCenterRef.current = exploreCenterId;
  }, [isExploreMode, exploreCenterId, locations, viewTransform, focusOnLocation, applyViewTransform]);

  useEffect(() => {
    if (!isExploreMode) return;
    if (!selectedLocationId) return;
    if (selectedLocationId === exploreCenterId) return;
    const visibleIds = useDreamStore.getState().getExploreVisibleLocationIds();
    if (!visibleIds.has(selectedLocationId)) return;
    enterExploreMode(selectedLocationId);
  }, [selectedLocationId, isExploreMode, exploreCenterId, enterExploreMode]);

  const startPlayback = useCallback(() => {
    if (filteredLocations.length === 0) return;

    prePlaybackStateRef.current = {
      selectedLocationId,
      selectedRelationId,
      viewTransform: { ...viewTransform },
    };

    setIsPlaybackMode(true);
    setPlaybackIndex(0);
    setIsPlaying(true);
  }, [filteredLocations.length, selectedLocationId, selectedRelationId, viewTransform]);

  const stopPlayback = useCallback(() => {
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }

    if (prePlaybackStateRef.current) {
      const state = prePlaybackStateRef.current;
      selectLocation(state.selectedLocationId);
      selectRelation(state.selectedRelationId);
      requestAnimationFrame(() => {
        applyViewTransform(
          state.viewTransform.scale,
          state.viewTransform.offsetX,
          state.viewTransform.offsetY,
          true
        );
      });
      prePlaybackStateRef.current = null;
    }

    setIsPlaybackMode(false);
    setIsPlaying(false);
    setPlaybackIndex(0);
  }, [selectLocation, selectRelation, applyViewTransform]);

  useEffect(() => {
    if (!isPlaybackMode) return;
    if (playbackLocations.length === 0) {
      stopPlayback();
      return;
    }
    if (playbackIndex >= playbackLocations.length) {
      setPlaybackIndex(playbackLocations.length - 1);
    }
  }, [playbackLocations.length, playbackIndex, isPlaybackMode, stopPlayback]);

  const handlePlaybackNext = useCallback(() => {
    if (playbackLocations.length === 0) return;

    let nextIndex: number;
    if (playbackIndex < playbackLocations.length - 1) {
      nextIndex = playbackIndex + 1;
    } else if (isLooping) {
      nextIndex = 0;
    } else {
      setIsPlaying(false);
      return;
    }

    setPlaybackIndex(nextIndex);
    focusOnLocation(playbackLocations[nextIndex]);
  }, [playbackIndex, playbackLocations, focusOnLocation, isLooping]);

  const handlePlaybackPrev = useCallback(() => {
    if (playbackLocations.length === 0) return;

    let prevIndex: number;
    if (playbackIndex > 0) {
      prevIndex = playbackIndex - 1;
    } else if (isLooping) {
      prevIndex = playbackLocations.length - 1;
    } else {
      return;
    }

    setPlaybackIndex(prevIndex);
    focusOnLocation(playbackLocations[prevIndex]);
  }, [playbackIndex, playbackLocations, focusOnLocation, isLooping]);

  const handleLoopToggle = useCallback(() => {
    setIsLooping((prev) => !prev);
  }, []);

  const handlePlaybackToggle = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleSortModeChange = useCallback((mode: PlaybackSortMode) => {
    setPlaybackSortMode(mode);
    setPlaybackIndex(0);
  }, []);

  const handleDurationChange = useCallback((duration: number) => {
    setPlaybackDuration(duration);
  }, []);

  useEffect(() => {
    if (!isPlaybackMode || !isPlaying) {
      if (playbackTimerRef.current) {
        clearTimeout(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
      return;
    }

    if (playbackIndex === 0 && playbackLocations.length > 0) {
      focusOnLocation(playbackLocations[0]);
    }

    playbackTimerRef.current = window.setTimeout(() => {
      handlePlaybackNext();
    }, playbackDuration * 1000);

    return () => {
      if (playbackTimerRef.current) {
        clearTimeout(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
    };
  }, [isPlaybackMode, isPlaying, playbackIndex, playbackDuration, playbackLocations, focusOnLocation, handlePlaybackNext]);

  useEffect(() => {
    if (isPlaybackMode && playbackLocations.length > 0 && playbackIndex === 0) {
      focusOnLocation(playbackLocations[0]);
    }
  }, [isPlaybackMode, playbackSortMode, playbackIndex, playbackLocations, focusOnLocation]);

  useEffect(() => {
    const container = mapRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (isPlaybackModeRef.current) return;
      if (e.ctrlKey || e.metaKey) return;
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setViewTransform((prev) => {
        const delta = -e.deltaY * WHEEL_ZOOM_FACTOR;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * (1 + delta)));
        const scaleRatio = newScale / prev.scale;
        const newOffsetX = mouseX - (mouseX - prev.offsetX) * scaleRatio;
        const newOffsetY = mouseY - (mouseY - prev.offsetY) * scaleRatio;

        const { offsetX: clampedX, offsetY: clampedY } = clampOffset(
          newOffsetX,
          newOffsetY,
          newScale,
          container.clientWidth,
          container.clientHeight
        );

        return { scale: newScale, offsetX: clampedX, offsetY: clampedY };
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const viewTransformRef = useRef(viewTransform);
  useEffect(() => {
    viewTransformRef.current = viewTransform;
  }, [viewTransform]);

  useEffect(() => {
    const container = mapRef.current;
    if (!container) return;

    const handleNodeDragStart = () => {
      isNodeDraggingRef.current = true;
      setIsPanning(false);
      setIsPinching(false);
    };
    const handleNodeDragEnd = () => {
      isNodeDraggingRef.current = false;
    };

    container.addEventListener('dreamNodeDragStart', handleNodeDragStart);
    container.addEventListener('dreamNodeDragEnd', handleNodeDragEnd);

    return () => {
      container.removeEventListener('dreamNodeDragStart', handleNodeDragStart);
      container.removeEventListener('dreamNodeDragEnd', handleNodeDragEnd);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const container = mapRef.current;
      if (!container) return;

      if (isPlaybackModeRef.current) return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const { scale, offsetX, offsetY } = viewTransformRef.current;

      switch (e.key) {
        case '+':
        case '=': {
          e.preventDefault();
          setIsSmoothTransition(true);
          const newScaleIn = Math.min(MAX_SCALE, scale * (1 + ZOOM_STEP));
          applyViewTransform(
            newScaleIn,
            offsetX - (container.clientWidth / 2 - offsetX) * (newScaleIn / scale - 1),
            offsetY - (container.clientHeight / 2 - offsetY) * (newScaleIn / scale - 1),
            true
          );
          break;
        }

        case '-':
        case '_': {
          e.preventDefault();
          setIsSmoothTransition(true);
          const newScaleOut = Math.max(MIN_SCALE, scale * (1 - ZOOM_STEP));
          applyViewTransform(
            newScaleOut,
            offsetX - (container.clientWidth / 2 - offsetX) * (newScaleOut / scale - 1),
            offsetY - (container.clientHeight / 2 - offsetY) * (newScaleOut / scale - 1),
            true
          );
          break;
        }

        case '0':
          e.preventDefault();
          applyViewTransform(1, 0, 0, true);
          break;

        case 'ArrowUp':
          e.preventDefault();
          applyViewTransform(scale, offsetX, offsetY + KEYBOARD_PAN_STEP, false);
          break;

        case 'ArrowDown':
          e.preventDefault();
          applyViewTransform(scale, offsetX, offsetY - KEYBOARD_PAN_STEP, false);
          break;

        case 'ArrowLeft':
          e.preventDefault();
          applyViewTransform(scale, offsetX + KEYBOARD_PAN_STEP, offsetY, false);
          break;

        case 'ArrowRight':
          e.preventDefault();
          applyViewTransform(scale, offsetX - KEYBOARD_PAN_STEP, offsetY, false);
          break;

        case 'r':
        case 'R':
          e.preventDefault();
          applyViewTransform(1, 0, 0, true);
          break;

        case 'f':
        case 'F':
          e.preventDefault();
          handleFitAllRef.current();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [applyViewTransform]);

  const handleMapClick = useCallback(() => {
    if (isPlaybackMode) return;
    if (hasPannedRef.current) return;
    selectLocation(null);
    selectRelation(null);
  }, [isPlaybackMode, selectLocation, selectRelation]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (isPlaybackMode) return;
    const container = mapRef.current;
    if (!container) return;

    const target = e.target as HTMLElement;
    if (target.closest('.dream-node') || target.closest('.relation-line-group')) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newScale = Math.min(MAX_SCALE, viewTransform.scale * DOUBLE_CLICK_ZOOM_FACTOR);
    const scaleRatio = newScale / viewTransform.scale;
    const newOffsetX = mouseX - (mouseX - viewTransform.offsetX) * scaleRatio;
    const newOffsetY = mouseY - (mouseY - viewTransform.offsetY) * scaleRatio;

    applyViewTransform(newScale, newOffsetX, newOffsetY, true);
  }, [viewTransform, applyViewTransform, isPlaybackMode]);

  const handleZoomIn = useCallback(() => {
    const container = mapRef.current;
    if (!container) return;

    const { scale, offsetX, offsetY } = viewTransform;
    const newScale = Math.min(MAX_SCALE, scale * (1 + ZOOM_STEP));
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;
    const scaleRatio = newScale / scale;
    const newOffsetX = centerX - (centerX - offsetX) * scaleRatio;
    const newOffsetY = centerY - (centerY - offsetY) * scaleRatio;

    applyViewTransform(newScale, newOffsetX, newOffsetY, true);
  }, [viewTransform, applyViewTransform]);

  const handleZoomOut = useCallback(() => {
    const container = mapRef.current;
    if (!container) return;

    const { scale, offsetX, offsetY } = viewTransform;
    const newScale = Math.max(MIN_SCALE, scale * (1 - ZOOM_STEP));
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;
    const scaleRatio = newScale / scale;
    const newOffsetX = centerX - (centerX - offsetX) * scaleRatio;
    const newOffsetY = centerY - (centerY - offsetY) * scaleRatio;

    applyViewTransform(newScale, newOffsetX, newOffsetY, true);
  }, [viewTransform, applyViewTransform]);

  const handleZoomSliderChange = useCallback((newScale: number) => {
    const container = mapRef.current;
    if (!container) return;

    const { scale, offsetX, offsetY } = viewTransform;
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;
    const scaleRatio = newScale / scale;
    const newOffsetX = centerX - (centerX - offsetX) * scaleRatio;
    const newOffsetY = centerY - (centerY - offsetY) * scaleRatio;

    applyViewTransform(newScale, newOffsetX, newOffsetY, true);
  }, [viewTransform, applyViewTransform]);

  const handleReset = useCallback(() => {
    applyViewTransform(1, 0, 0, true);
  }, [applyViewTransform]);

  const handleFitAll = useCallback(() => {
    const container = mapRef.current;
    if (!container || displayLocations.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    displayLocations.forEach((loc) => {
      minX = Math.min(minX, loc.positionX);
      minY = Math.min(minY, loc.positionY);
      maxX = Math.max(maxX, loc.positionX);
      maxY = Math.max(maxY, loc.positionY);
    });

    const padding = 15;
    const contentWidth = maxX - minX + padding * 2;
    const contentHeight = maxY - minY + padding * 2;

    const scaleX = 100 / contentWidth;
    const scaleY = 100 / contentHeight;
    const newScale = Math.min(scaleX, scaleY, MAX_SCALE);

    const centerXPct = (minX + maxX) / 2;
    const centerYPct = (minY + maxY) / 2;

    const containerCenterX = container.clientWidth / 2;
    const containerCenterY = container.clientHeight / 2;

    const contentCenterX = (centerXPct / 100) * container.clientWidth * newScale;
    const contentCenterY = (centerYPct / 100) * container.clientHeight * newScale;

    const newOffsetX = containerCenterX - contentCenterX;
    const newOffsetY = containerCenterY - contentCenterY;

    applyViewTransform(newScale, newOffsetX, newOffsetY, true);
  }, [displayLocations, applyViewTransform]);

  const handleFitAllRef = useRef(handleFitAll);
  handleFitAllRef.current = handleFitAll;

  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (isPlaybackMode) return;
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('.dream-node') || target.closest('.relation-line-group')) return;

    const now = Date.now();
    if (now - lastClickTimeRef.current < 300) {
      lastClickTimeRef.current = 0;
      return;
    }
    lastClickTimeRef.current = now;

    e.preventDefault();
    setIsPanning(true);
    hasPannedRef.current = false;
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startOffsetX: viewTransform.offsetX,
      startOffsetY: viewTransform.offsetY,
    };
  }, [viewTransform, isPlaybackMode]);

  useEffect(() => {
    if (!isPanning) return;

    const container = mapRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;

      if (Math.abs(dx) > PAN_THRESHOLD || Math.abs(dy) > PAN_THRESHOLD) {
        hasPannedRef.current = true;
      }

      const newOffsetX = panStartRef.current.startOffsetX + dx;
      const newOffsetY = panStartRef.current.startOffsetY + dy;

      const { offsetX: clampedX, offsetY: clampedY } = clampOffset(
        newOffsetX,
        newOffsetY,
        viewTransform.scale,
        container.clientWidth,
        container.clientHeight
      );

      setViewTransform((prev) => ({
        ...prev,
        offsetX: clampedX,
        offsetY: clampedY,
      }));
    };

    const handleMouseUp = () => {
      setIsPanning(false);
      setTimeout(() => {
        hasPannedRef.current = false;
      }, 0);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, viewTransform.scale]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isPlaybackMode) return;
    if (isNodeDraggingRef.current) return;

    touchCountRef.current = e.touches.length;

    if (e.touches.length >= 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = getTouchDistance(touch1, touch2);
      const center = getTouchCenter(touch1, touch2);

      const container = mapRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      setIsPanning(false);
      setIsPinching(true);
      pinchStartRef.current = {
        distance,
        centerX: center.x - rect.left,
        centerY: center.y - rect.top,
        startScale: viewTransform.scale,
        startOffsetX: viewTransform.offsetX,
        startOffsetY: viewTransform.offsetY,
      };
      return;
    }

    if (e.touches.length !== 1) return;
    if (isPinching) return;

    const target = e.target as HTMLElement;
    if (target.closest('.dream-node') || target.closest('.relation-line-group')) return;

    const touch = e.touches[0];
    setIsPanning(true);
    hasPannedRef.current = false;
    panStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      startOffsetX: viewTransform.offsetX,
      startOffsetY: viewTransform.offsetY,
    };
  }, [viewTransform, isPlaybackMode, isPinching]);

  useEffect(() => {
    const container = mapRef.current;
    if (!container) return;

    const handleTouchMove = (e: TouchEvent) => {
      touchCountRef.current = e.touches.length;

      if (isPlaybackModeRef.current) return;
      if (isNodeDraggingRef.current) return;

      if (e.touches.length >= 2) {
        if (!isPinching) {
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          const distance = getTouchDistance(touch1, touch2);
          const center = getTouchCenter(touch1, touch2);
          const rect = container.getBoundingClientRect();

          setIsPanning(false);
          setIsPinching(true);
          pinchStartRef.current = {
            distance,
            centerX: center.x - rect.left,
            centerY: center.y - rect.top,
            startScale: viewTransformRef.current.scale,
            startOffsetX: viewTransformRef.current.offsetX,
            startOffsetY: viewTransformRef.current.offsetY,
          };
        }

        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const newDistance = getTouchDistance(touch1, touch2);
        const newCenter = getTouchCenter(touch1, touch2);
        const newCenterX = newCenter.x - rect.left;
        const newCenterY = newCenter.y - rect.top;

        const scaleRatio = newDistance / pinchStartRef.current.distance;
        let newScale = pinchStartRef.current.startScale * scaleRatio;
        newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

        const effectiveScaleRatio = newScale / pinchStartRef.current.startScale;
        const newOffsetX =
          pinchStartRef.current.centerX -
          (pinchStartRef.current.centerX - pinchStartRef.current.startOffsetX) * effectiveScaleRatio +
          (newCenterX - pinchStartRef.current.centerX);
        const newOffsetY =
          pinchStartRef.current.centerY -
          (pinchStartRef.current.centerY - pinchStartRef.current.startOffsetY) * effectiveScaleRatio +
          (newCenterY - pinchStartRef.current.centerY);

        const { offsetX: clampedX, offsetY: clampedY } = clampOffset(
          newOffsetX,
          newOffsetY,
          newScale,
          container.clientWidth,
          container.clientHeight
        );

        setViewTransform({ scale: newScale, offsetX: clampedX, offsetY: clampedY });
        return;
      }

      if (e.touches.length === 1 && isPanning && !isPinching) {
        const touch = e.touches[0];
        const dx = touch.clientX - panStartRef.current.x;
        const dy = touch.clientY - panStartRef.current.y;

        if (Math.abs(dx) > PAN_THRESHOLD || Math.abs(dy) > PAN_THRESHOLD) {
          hasPannedRef.current = true;
        }

        const newOffsetX = panStartRef.current.startOffsetX + dx;
        const newOffsetY = panStartRef.current.startOffsetY + dy;

        const { offsetX: clampedX, offsetY: clampedY } = clampOffset(
          newOffsetX,
          newOffsetY,
          viewTransformRef.current.scale,
          container.clientWidth,
          container.clientHeight
        );

        setViewTransform((prev) => ({
          ...prev,
          offsetX: clampedX,
          offsetY: clampedY,
        }));
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const remainingTouches = e.touches.length;
      touchCountRef.current = remainingTouches;

      if (isPinching) {
        setIsPinching(false);
        if (remainingTouches === 1) {
          setIsPanning(true);
          hasPannedRef.current = false;
          const touch = e.touches[0];
          if (touch) {
            panStartRef.current = {
              x: touch.clientX,
              y: touch.clientY,
              startOffsetX: viewTransformRef.current.offsetX,
              startOffsetY: viewTransformRef.current.offsetY,
            };
          }
        } else {
          setIsPanning(false);
          setTimeout(() => {
            hasPannedRef.current = false;
          }, 0);
        }
      } else if (isPanning && remainingTouches === 0) {
        setIsPanning(false);
        setTimeout(() => {
          hasPannedRef.current = false;
        }, 0);
      }

      if (remainingTouches === 0) {
        setIsPinching(false);
        setIsPanning(false);
        setTimeout(() => {
          hasPannedRef.current = false;
        }, 0);
      }
    };

    const handleTouchCancel = () => {
      touchCountRef.current = 0;
      setIsPanning(false);
      setIsPinching(false);
      setTimeout(() => {
        hasPannedRef.current = false;
      }, 0);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchCancel);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [isPanning, isPinching]);

  const canZoomIn = viewTransform.scale < MAX_SCALE - 0.001;
  const canZoomOut = viewTransform.scale > MIN_SCALE + 0.001;

  return (
    <div
      ref={mapRef}
      className="relative w-full h-full select-none"
      onClick={handleMapClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handlePanStart}
      onTouchStart={handleTouchStart}
      style={{
        background: 'radial-gradient(ellipse at center, #1a1a3e 0%, #0d0d1f 50%, #050510 100%)',
        cursor: isPanning ? 'grabbing' : 'grab',
      }}
    >
      <div
        ref={transformLayerRef}
        className="absolute top-0 left-0 w-full h-full"
        style={{
          transform: `translate(${viewTransform.offsetX}px, ${viewTransform.offsetY}px) scale(${viewTransform.scale})`,
          transformOrigin: '0 0',
          transition: isSmoothTransition ? 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
          willChange: 'transform',
          pointerEvents: isPlaybackMode ? 'none' : 'auto',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 30%, rgba(100, 50, 150, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(50, 100, 150, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(150, 100, 200, 0.05) 0%, transparent 70%)
            `,
          }}
        />

        <div className="absolute inset-0 pointer-events-none opacity-30">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dreamGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path
                  d="M 60 0 L 0 0 0 60"
                  fill="none"
                  stroke="rgba(150, 130, 200, 0.1)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dreamGrid)" />
          </svg>
        </div>

        {viewMode === 'cluster' && clusters.map((cluster) => (
          <div
            key={`glow-${cluster.id}`}
            className="absolute pointer-events-none"
            style={{
              left: `${cluster.centerX}%`,
              top: `${cluster.centerY}%`,
              transform: 'translate(-50%, -50%)',
              width: '35%',
              height: '35%',
            }}
          >
            <div
              className="w-full h-full rounded-full"
              style={{
                background: `radial-gradient(circle, ${hexToRgba(cluster.color, 0.25)} 0%, ${hexToRgba(cluster.color, 0.1)} 40%, transparent 70%)`,
                filter: 'blur(20px)',
                animation: 'pulse 4s ease-in-out infinite',
              }}
            />
          </div>
        ))}

        {viewMode === 'cluster' && clusters.map((cluster) => (
          <div
            key={`label-${cluster.id}`}
            className="absolute pointer-events-none z-20"
            style={{
              left: `${cluster.centerX}%`,
              top: `${cluster.centerY - Math.min(20, 8 + cluster.locations.length * 2)}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap"
              style={{
                backgroundColor: hexToRgba(cluster.color, 0.2),
                color: '#fff',
                border: `1px solid ${hexToRgba(cluster.color, 0.5)}`,
                backdropFilter: 'blur(10px)',
                boxShadow: `0 0 20px ${hexToRgba(cluster.color, 0.3)}`,
              }}
            >
              <span className="font-serif">
                {cluster.name}
              </span>
              <span className="ml-1.5 opacity-60 text-[10px]">
                ({cluster.locations.length})
              </span>
            </div>
          </div>
        ))}

        <RelationLines locations={displayLocations} />

        {displayLocations.map((location) => (
          <DreamNode
            key={location.id}
            location={location}
            viewTransform={viewTransform}
            mapContainerRef={mapRef}
            isDraggable={viewMode === 'map'}
          />
        ))}
      </div>

      {locations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center text-purple-200/50">
            <p className="text-lg md:text-xl font-serif italic mb-2">梦境地图尚为空白</p>
            <p className="text-sm opacity-70">点击上方按钮，记录你的第一个梦境地点</p>
          </div>
        </div>
      )}

      {locations.length > 0 && !hasResults && hasActiveFilters && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center text-purple-200/50 animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-purple-500/10 border border-purple-400/20">
              <SearchX size={28} className="text-purple-300/60" />
            </div>
            <p className="text-lg md:text-xl font-serif italic mb-2">未找到匹配的梦境</p>
            <p className="text-sm opacity-70 mb-4">没有符合当前筛选条件的地点</p>
            <button
              onClick={clearFilters}
              className="px-5 py-2 rounded-lg text-sm text-purple-200/80 bg-white/5 border border-purple-300/20 hover:text-purple-100 hover:bg-white/10 transition-all"
            >
              清空筛选条件
            </button>
          </div>
        </div>
      )}

      {isExploreMode && <ExploreControls />}

      {!isPlaybackMode && (
        <MapControls
          scale={viewTransform.scale}
          minScale={MIN_SCALE}
          maxScale={MAX_SCALE}
          canZoomIn={canZoomIn}
          canZoomOut={canZoomOut}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomChange={handleZoomSliderChange}
          onReset={handleReset}
          onFitAll={handleFitAll}
          onStartPlayback={startPlayback}
          canPlayback={hasResults && !isPlaybackMode && !isExploreMode}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      )}

      {isPlaybackMode && (
        <DreamPlayback
          locations={playbackLocations}
          currentIndex={playbackIndex}
          isPlaying={isPlaying}
          isLooping={isLooping}
          sortMode={playbackSortMode}
          duration={playbackDuration}
          onPlayPause={handlePlaybackToggle}
          onPrev={handlePlaybackPrev}
          onNext={handlePlaybackNext}
          onExit={stopPlayback}
          onSortModeChange={handleSortModeChange}
          onDurationChange={handleDurationChange}
          onLoopToggle={handleLoopToggle}
        />
      )}
    </div>
  );
}
