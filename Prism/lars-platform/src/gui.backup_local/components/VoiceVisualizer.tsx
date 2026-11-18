import { useEffect, useRef } from 'react';

interface VoiceVisualizerProps {
  mode: 'input' | 'output';
  isActive: boolean;
  onClose?: () => void;
}

const TAU = Math.PI * 2;
const WATER_LEVEL = 0.72;

function drawWater(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  time: number,
  tiltX: number,
  tiltY: number
) {
  const MAX_TILT = 0.65;
  const tx = Math.max(-MAX_TILT, Math.min(MAX_TILT, tiltX));
  const ty = Math.max(-MAX_TILT, Math.min(MAX_TILT, tiltY));

  const baseCenterY = cy + radius * (1 - WATER_LEVEL * 2);
  const surfaceY = (px: number) =>
    baseCenterY + ((px - cx) / radius) * tx * radius * 0.65 + ty * radius * 0.5;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 1, 0, TAU);
  ctx.clip();

  ctx.save();
  ctx.beginPath();
  const steps = 180;
  for (let s = 0; s <= steps; s++) {
    const px = cx - radius + (s / steps) * radius * 2;
    const py = surfaceY(px);
    if (s === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.arc(cx, cy, radius - 1, 0, Math.PI);
  ctx.closePath();

  const topY = Math.min(surfaceY(cx - radius), surfaceY(cx + radius));
  const waterGrad = ctx.createLinearGradient(cx, topY, cx, cy + radius);
  waterGrad.addColorStop(0, 'rgba(20, 100, 180, 0.82)');
  waterGrad.addColorStop(0.3, 'rgba(10, 60, 140, 0.90)');
  waterGrad.addColorStop(1, 'rgba(4, 20, 70, 0.98)');
  ctx.fillStyle = waterGrad;
  ctx.fill();
  ctx.restore();

  const numCaustics = 14;
  for (let i = 0; i < numCaustics; i++) {
    const seed = i * 1.618;
    const bx = cx + Math.sin(seed * 2.1 + time * 0.5) * radius * 0.55;
    const baseBy = surfaceY(bx) + (cy + radius - surfaceY(bx)) * (0.1 + ((seed * 0.37) % 0.85));
    const bSize = radius * (0.06 + Math.sin(seed + time * 0.8) * 0.03);
    const bAlpha = 0.04 + Math.abs(Math.sin(seed * 1.3 + time * 0.6)) * 0.08;
    const cGrad = ctx.createRadialGradient(bx, baseBy, 0, bx, baseBy, bSize);
    cGrad.addColorStop(0, `rgba(100, 210, 255, ${bAlpha})`);
    cGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = cGrad;
    ctx.beginPath();
    ctx.ellipse(bx, baseBy, bSize, bSize * 0.5, seed, 0, TAU);
    ctx.fill();
  }

  const sloshAmp = Math.sqrt(tiltX * tiltX + tiltY * tiltY);
  const waveCount = 5;
  for (let w = 0; w < waveCount; w++) {
    const wPhase = (w / waveCount) * Math.PI * 2;
    const baseAmp = radius * (0.006 + w * 0.003);
    const sloshBoost = radius * sloshAmp * 0.04;
    const wAmp = baseAmp + sloshBoost;
    const wSpeed = 0.9 + w * 0.35;
    const wFreq = 2.5 + w * 0.8;

    ctx.beginPath();
    let started = false;
    for (let s = 0; s <= steps; s++) {
      const px = cx - radius + (s / steps) * radius * 2;
      const localX = (px - cx) / radius;
      if (Math.abs(localX) > 1) continue;
      const py =
        surfaceY(px) +
        wAmp * Math.sin(localX * Math.PI * wFreq + time * wSpeed + wPhase) +
        wAmp * 0.5 * Math.sin(localX * Math.PI * (wFreq * 1.6) - time * wSpeed * 1.2 + wPhase * 1.4);

      if (!started) { ctx.moveTo(px, py); started = true; }
      else ctx.lineTo(px, py);
    }
    const wAlpha = 0.12 - w * 0.018;
    ctx.strokeStyle = `rgba(140, 230, 255, ${wAlpha})`;
    ctx.lineWidth = 1.2 - w * 0.15;
    ctx.stroke();
  }

  ctx.beginPath();
  let shimmerStarted = false;
  const shimmerSteps = 200;
  for (let s = 0; s <= shimmerSteps; s++) {
    const px = cx - radius + (s / shimmerSteps) * radius * 2;
    const localX = (px - cx) / radius;
    if (Math.abs(localX) > 1) continue;
    const py =
      surfaceY(px) +
      radius * 0.008 * Math.sin(localX * Math.PI * 4.2 + time * 1.4) +
      radius * 0.004 * Math.sin(localX * Math.PI * 9 - time * 2.1);
    if (!shimmerStarted) { ctx.moveTo(px, py); shimmerStarted = true; }
    else ctx.lineTo(px, py);
  }
  const shimmerGrad = ctx.createLinearGradient(cx - radius, 0, cx + radius, 0);
  shimmerGrad.addColorStop(0, 'transparent');
  shimmerGrad.addColorStop(0.2, 'rgba(200, 240, 255, 0.55)');
  shimmerGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.75)');
  shimmerGrad.addColorStop(0.8, 'rgba(200, 240, 255, 0.55)');
  shimmerGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = shimmerGrad;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  const scatterGrad = ctx.createLinearGradient(cx, baseCenterY, cx, baseCenterY + radius * 0.35);
  scatterGrad.addColorStop(0, 'rgba(60, 180, 255, 0.18)');
  scatterGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = scatterGrad;
  ctx.fillRect(cx - radius, baseCenterY, radius * 2, radius * 0.35);

  ctx.restore();
}

function drawSphere(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  rotX: number,
  rotY: number,
  time: number,
  waterTiltX: number,
  waterTiltY: number
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const W = ctx.canvas.width;
  const H = ctx.canvas.height;

  ctx.fillStyle = '#03040e';
  ctx.fillRect(0, 0, W, H);

  drawWater(ctx, cx, cy, radius, time, waterTiltX, waterTiltY);

  const latLines = 32;
  const lonLines = 40;
  const segments = 140;

  const project = (x: number, y: number, z: number) => {
    const cosY = Math.cos(rotY + time * 0.18);
    const sinY = Math.sin(rotY + time * 0.18);
    let rx = x * cosY + z * sinY;
    let rz = -x * sinY + z * cosY;

    const cosX = Math.cos(rotX + time * 0.07);
    const sinX = Math.sin(rotX + time * 0.07);
    let ry = y * cosX - rz * sinX;
    rz = y * sinX + rz * cosX;

    const fov = 700;
    const scale = fov / (fov + rz * 0.35);
    return { sx: cx + rx * scale, sy: cy + ry * scale, z: rz };
  };

  const lightX = -0.55;
  const lightY = -0.7;
  const lightZ = 0.45;

  const getSpecular = (nx: number, ny: number, nz: number) => {
    const dot = nx * lightX + ny * lightY + nz * lightZ;
    const spec = Math.max(0, Math.abs(nz)) ** 18;
    return spec;
  };

  const baseCenterY = cy + radius * (1 - WATER_LEVEL * 2) + waterTiltY * radius * 0.55;
  const waterSurfaceAt = (px: number) => baseCenterY + ((px - cx) / radius) * waterTiltX * radius * 0.6;

  for (let i = 0; i < latLines; i++) {
    const phi = ((i + 1) / (latLines + 1)) * Math.PI;
    const y0 = Math.cos(phi);
    const r0 = Math.sin(phi);

    const pts: { sx: number; sy: number; z: number; nx: number; ny: number; nz: number }[] = [];
    for (let j = 0; j <= segments; j++) {
      const theta = (j / segments) * TAU;
      const nx = Math.cos(theta) * r0;
      const ny = y0;
      const nz = Math.sin(theta) * r0;
      pts.push({ ...project(nx * radius, ny * radius, nz * radius), nx, ny, nz });
    }

    for (let j = 0; j < pts.length - 1; j++) {
      const p = pts[j];
      const q = pts[j + 1];
      const depth = (p.z + radius) / (2 * radius);
      const spec = getSpecular(p.nx, p.ny, p.nz);
      const underwater = p.sy > waterSurfaceAt(p.sx);

      let r, g, b, alpha;
      if (underwater) {
        r = Math.round(80 + spec * 60);
        g = Math.round(160 + spec * 60);
        b = Math.round(220 + spec * 35);
        alpha = 0.08 + depth * 0.28 + spec * 0.2;
      } else {
        r = Math.round(180 + spec * 75);
        g = Math.round(150 + spec * 65);
        b = Math.round(200 + spec * 55);
        alpha = 0.04 + depth * 0.55 + spec * 0.4;
      }

      ctx.beginPath();
      ctx.moveTo(p.sx, p.sy);
      ctx.lineTo(q.sx, q.sy);
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.lineWidth = 0.4 + depth * 0.6 + spec * 1.2;
      ctx.stroke();
    }
  }

  for (let i = 0; i < lonLines; i++) {
    const theta = (i / lonLines) * TAU;

    const pts: { sx: number; sy: number; z: number; nx: number; ny: number; nz: number }[] = [];
    for (let j = 0; j <= segments; j++) {
      const phi2 = (j / segments) * Math.PI;
      const nx = Math.sin(phi2) * Math.cos(theta);
      const ny = Math.cos(phi2);
      const nz = Math.sin(phi2) * Math.sin(theta);
      pts.push({ ...project(nx * radius, ny * radius, nz * radius), nx, ny, nz });
    }

    for (let j = 0; j < pts.length - 1; j++) {
      const p = pts[j];
      const q = pts[j + 1];
      const depth = (p.z + radius) / (2 * radius);
      const spec = getSpecular(p.nx, p.ny, p.nz);
      const underwater = p.sy > waterSurfaceAt(p.sx);

      let r, g, b, alpha;
      if (underwater) {
        r = Math.round(60 + spec * 70);
        g = Math.round(140 + spec * 70);
        b = Math.round(230 + spec * 25);
        alpha = 0.06 + depth * 0.24 + spec * 0.22;
      } else {
        r = Math.round(160 + spec * 95);
        g = Math.round(140 + spec * 80);
        b = Math.round(220 + spec * 35);
        alpha = 0.03 + depth * 0.5 + spec * 0.45;
      }

      ctx.beginPath();
      ctx.moveTo(p.sx, p.sy);
      ctx.lineTo(q.sx, q.sy);
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.lineWidth = 0.35 + depth * 0.55 + spec * 1.1;
      ctx.stroke();
    }
  }

  const rimGrad = ctx.createRadialGradient(cx, cy, radius * 0.72, cx, cy, radius * 1.04);
  rimGrad.addColorStop(0, 'transparent');
  rimGrad.addColorStop(0.7, 'rgba(180, 140, 255, 0.0)');
  rimGrad.addColorStop(1, 'rgba(200, 170, 255, 0.18)');
  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.04, 0, TAU);
  ctx.fill();

  const waterRim = ctx.createRadialGradient(cx, cy, radius * 0.75, cx, cy, radius * 1.04);
  waterRim.addColorStop(0, 'transparent');
  waterRim.addColorStop(1, 'rgba(30, 120, 200, 0.10)');
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - radius * 1.1, baseCenterY, radius * 2.2, radius * 1.1);
  ctx.clip();
  ctx.fillStyle = waterRim;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.04, 0, TAU);
  ctx.fill();
  ctx.restore();

  const hx = cx - radius * 0.28;
  const hy = cy - radius * 0.32;
  const hlGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, radius * 0.42);
  hlGrad.addColorStop(0, 'rgba(255, 252, 245, 0.32)');
  hlGrad.addColorStop(0.3, 'rgba(220, 210, 255, 0.1)');
  hlGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = hlGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TAU);
  ctx.fill();

  const innerShadow = ctx.createRadialGradient(cx, cy, radius * 0.0, cx, cy, radius);
  innerShadow.addColorStop(0, 'transparent');
  innerShadow.addColorStop(0.5, 'transparent');
  innerShadow.addColorStop(1, 'rgba(0, 0, 8, 0.45)');
  ctx.fillStyle = innerShadow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TAU);
  ctx.fill();

  const shadow = ctx.createRadialGradient(cx, cy + radius * 1.05, radius * 0.05, cx, cy + radius * 1.05, radius * 0.85);
  shadow.addColorStop(0, 'rgba(10, 60, 160, 0.32)');
  shadow.addColorStop(0.4, 'rgba(5, 20, 80, 0.16)');
  shadow.addColorStop(1, 'transparent');
  ctx.fillStyle = shadow;
  ctx.fillRect(0, 0, W, H);
}

export default function VoiceVisualizer({ mode, isActive, onClose }: VoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const rotation = useRef({ x: 0.35, y: 0 });
  const rotVel = useRef({ x: 0, y: 0 });
  const waterTilt = useRef({ x: 0, y: 0 });
  const waterTiltTarget = useRef({ x: 0, y: 0 });
  const waterVel = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!isActive) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 300;
    canvas.height = 300;

    const startTime = performance.now();

    const loop = () => {
      const t = (performance.now() - startTime) / 1000;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = Math.min(canvas.width, canvas.height) * 0.34;

      // Auto rotate based on mode
      if (mode === 'input') {
        rotation.current.y += 0.012;
        waterTiltTarget.current.x = Math.sin(t * 0.8) * 0.3;
        waterTiltTarget.current.y = Math.cos(t * 0.6) * 0.2;
      } else {
        rotation.current.y += 0.008;
        waterTiltTarget.current.x = Math.sin(t * 0.5) * 0.2;
        waterTiltTarget.current.y = Math.cos(t * 0.7) * 0.25;
      }

      rotVel.current.x *= 0.82;
      rotVel.current.y *= 0.82;

      const spring = 0.08;
      const damping = 0.75;
      for (const axis of ['x', 'y'] as const) {
        const err = waterTiltTarget.current[axis] - waterTilt.current[axis];
        waterVel.current[axis] = waterVel.current[axis] * damping + err * spring;
        waterTilt.current[axis] += waterVel.current[axis];
        waterTilt.current[axis] = Math.max(-0.7, Math.min(0.7, waterTilt.current[axis]));
      }

      drawSphere(ctx, cx, cy, radius, rotation.current.x, rotation.current.y, t, waterTilt.current.x, waterTilt.current.y);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, mode]);

  if (!isActive) return null;

  return (
    <div className="voice-visualizer-overlay" onClick={onClose}>
      <div className="voice-visualizer-content" onClick={e => e.stopPropagation()}>
        <canvas ref={canvasRef} className="voice-canvas" />
        <div className="voice-label">
          {mode === 'input' ? '음성 입력 중...' : '음성 출력 중...'}
        </div>
        <div className="voice-hint">
          (ESC 키 또는 클릭으로 종료)
        </div>
      </div>
    </div>
  );
}
