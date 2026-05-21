import { useRef, useEffect } from 'react';

const CLASS_COLORS = {
  person: '#22c55e',
  car: '#3b82f6',
  truck: '#3b82f6',
  bus: '#3b82f6',
  bicycle: '#a855f7',
  motorcycle: '#a855f7',
  dog: '#f59e0b',
  cat: '#f59e0b',
  default: '#ef4444',
};

function getDisplayRect(video, container) {
  if (!video || !container) return null;
  const vr = video.videoWidth / video.videoHeight;
  const cr = container.clientWidth / container.clientHeight;
  let w, h, ox, oy;
  if (vr > cr) {
    w = container.clientWidth;
    h = w / vr;
    ox = 0;
    oy = (container.clientHeight - h) / 2;
  } else {
    h = container.clientHeight;
    w = h * vr;
    ox = (container.clientWidth - w) / 2;
    oy = 0;
  }
  return { w, h, ox, oy };
}

function draw(canvas, detections, video, container) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const display = getDisplayRect(video, container);
  if (!display) return;

  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
  }

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch);

  if (!detections || detections.length === 0 || !video.videoWidth) { ctx.restore(); return; }

  const sx = display.w / video.videoWidth;
  const sy = display.h / video.videoHeight;

  ctx.beginPath();
  ctx.rect(display.ox, display.oy, display.w, display.h);
  ctx.clip();

  for (const d of detections) {
    const color = CLASS_COLORS[d.class] || CLASS_COLORS.default;
    const { x, y, w, h } = d.box;
    const rx = display.ox + x * sx;
    const ry = display.oy + y * sy;
    const rw = w * sx;
    const rh = h * sy;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(rx, ry, rw, rh);

    const label = `${d.class} ${(d.confidence * 100).toFixed(0)}%`;
    ctx.font = 'bold 13px "SF Pro", -apple-system, system-ui, sans-serif';
    const tm = ctx.measureText(label);
    const textH = 22;
    const textW = tm.width + 10;
    const labelY = ry - textH < display.oy ? ry + rh : ry;

    ctx.fillStyle = color;
    ctx.fillRect(rx, labelY - textH, textW, textH);
    ctx.fillStyle = '#000';
    ctx.fillText(label, rx + 5, labelY - 6);
  }

  ctx.restore();
}

export default function DetectionOverlay({ detections, videoRef, visible = true }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const detsRef = useRef(null);
  const visibleRef = useRef(false);

  detsRef.current = detections;
  visibleRef.current = visible;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    function tick() {
      if (!visibleRef.current) {
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      } else {
        draw(canvas, detsRef.current, videoRef.current, container);
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); };
  }, [videoRef]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full" style={{ pointerEvents: 'none' }} />
    </div>
  );
}
