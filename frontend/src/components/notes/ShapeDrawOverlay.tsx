import React, { useRef, useState } from 'react';
import type { ShapeType } from '../toolbar/toolbarTypes';
import type { FloatingObject } from '../../types/canvas';

interface Props {
  shapeType: ShapeType;
  color: string;
  strokeWidth: number;
  fill: boolean;
  onShapeCreated: (obj: Omit<FloatingObject, 'id' | 'isSelected' | 'rotation'>) => void;
}

interface DrawState {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

function buildShapeData(
  shapeType: ShapeType,
  x1: number, y1: number,
  x2: number, y2: number,
): { x: number; y: number; w: number; h: number; svgData: string } {
  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const w = Math.max(Math.abs(x2 - x1), 4);
  const h = Math.max(Math.abs(y2 - y1), 4);

  let svgData = '';

  switch (shapeType) {
    case 'line': {
      const lx1 = x1 <= x2 ? 0 : w;
      const ly1 = y1 <= y2 ? 0 : h;
      const lx2 = x1 <= x2 ? w : 0;
      const ly2 = y1 <= y2 ? h : 0;
      svgData = `M ${lx1},${ly1} L ${lx2},${ly2}`;
      break;
    }
    case 'arrow': {
      const lx1 = x1 <= x2 ? 0 : w;
      const ly1 = y1 <= y2 ? 0 : h;
      const lx2 = x1 <= x2 ? w : 0;
      const ly2 = y1 <= y2 ? h : 0;
      const dx = lx2 - lx1, dy = ly2 - ly1;
      const len = Math.hypot(dx, dy) || 1;
      const alen = Math.min(len * 0.28, 22);
      const angle = Math.atan2(dy, dx);
      const a1 = angle + Math.PI * 0.75;
      const a2 = angle - Math.PI * 0.75;
      svgData = [
        `M ${lx1},${ly1} L ${lx2},${ly2}`,
        `M ${lx2 + Math.cos(a1) * alen},${ly2 + Math.sin(a1) * alen} L ${lx2},${ly2} L ${lx2 + Math.cos(a2) * alen},${ly2 + Math.sin(a2) * alen}`,
      ].join(' ');
      break;
    }
    case 'rect':
      svgData = `M 0,0 H ${w} V ${h} H 0 Z`;
      break;
    case 'circle': {
      const rx = w / 2, ry = h / 2;
      svgData = `M ${rx},0 A ${rx},${ry} 0 0,1 ${w},${ry} A ${rx},${ry} 0 0,1 ${rx},${h} A ${rx},${ry} 0 0,1 0,${ry} A ${rx},${ry} 0 0,1 ${rx},0 Z`;
      break;
    }
    case 'triangle':
      svgData = `M ${w / 2},0 L ${w},${h} L 0,${h} Z`;
      break;
  }

  return { x: minX, y: minY, w, h, svgData };
}

function fillFromColor(color: string): string {
  if (color.startsWith('#') && color.length === 7) return color + '30';
  return 'rgba(255,255,255,0.18)';
}

export default function ShapeDrawOverlay({ shapeType, color, strokeWidth, fill, onShapeCreated }: Props) {
  const overlayRef = useRef<SVGSVGElement>(null);
  const [draw, setDraw] = useState<DrawState | null>(null);

  const toLocal = (e: React.PointerEvent): { x: number; y: number } => {
    const rect = overlayRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try { (e.target as Element).setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const { x, y } = toLocal(e);
    setDraw({ startX: x, startY: y, endX: x, endY: y });
  };

  const handleMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draw) return;
    e.preventDefault();
    const { x, y } = toLocal(e);
    setDraw(d => d ? { ...d, endX: x, endY: y } : null);
  };

  const handleUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draw) return;
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    const { x, y } = toLocal(e);
    const { x: bx, y: by, w, h, svgData } = buildShapeData(shapeType, draw.startX, draw.startY, x, y);
    if (w > 8 || h > 8) {
      onShapeCreated({
        type: 'shape',
        position: { x: bx, y: by },
        dimensions: { width: w, height: h },
        svgData,
        stroke: color,
        strokeWidth,
        fill: fill ? fillFromColor(color) : 'none',
      });
    }
    setDraw(null);
  };

  // Live preview data
  const preview = draw
    ? buildShapeData(shapeType, draw.startX, draw.startY, draw.endX, draw.endY)
    : null;

  const previewW = preview ? Math.max(preview.w, 4) : 0;
  const previewH = preview ? Math.max(preview.h, 4) : 0;

  return (
    <svg
      ref={overlayRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 5,
        touchAction: 'none',
        cursor: 'crosshair',
        overflow: 'visible',
      }}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
    >
      {preview && (
        <g transform={`translate(${preview.x},${preview.y})`}>
          {/* glow / shadow for visibility */}
          <path
            d={preview.svgData}
            stroke="rgba(0,0,0,0.6)"
            strokeWidth={strokeWidth + 6}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* fill preview */}
          {fill && (
            <svg viewBox={`0 0 ${previewW} ${previewH}`} width={previewW} height={previewH} overflow="visible">
              <path
                d={preview.svgData}
                fill={fillFromColor(color)}
                stroke="none"
              />
            </svg>
          )}
          {/* dashed stroke outline */}
          <path
            d={preview.svgData}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray="7,4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
          />
          {/* size label */}
          {(previewW > 30 || previewH > 30) && (
            <text
              x={previewW / 2}
              y={previewH + 16}
              textAnchor="middle"
              fontSize={10}
              fill="rgba(255,255,255,0.5)"
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {Math.round(previewW)} × {Math.round(previewH)}
            </text>
          )}
        </g>
      )}
    </svg>
  );
}
