import { useRef, useEffect } from 'react';
import { DreamNode } from './DreamNode';
import { useDreamStore } from '@/store/dreamStore';

export function DreamMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const locations = useDreamStore((state) => state.locations);
  const selectLocation = useDreamStore((state) => state.selectLocation);
  const selectedLocationId = useDreamStore((state) => state.selectedLocationId);

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

  const handleMapClick = () => {
    selectLocation(null);
  };

  return (
    <div
      ref={mapRef}
      className="relative w-full h-full"
      onClick={handleMapClick}
      style={{
        background: 'radial-gradient(ellipse at center, #1a1a3e 0%, #0d0d1f 50%, #050510 100%)',
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

      {locations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center text-purple-200/50">
            <p className="text-lg md:text-xl font-serif italic mb-2">梦境地图尚为空白</p>
            <p className="text-sm opacity-70">点击上方按钮，记录你的第一个梦境地点</p>
          </div>
        </div>
      )}

      {locations.map((location) => (
        <DreamNode key={location.id} location={location} />
      ))}
    </div>
  );
}
