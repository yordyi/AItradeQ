'use client';

import { useEffect, useRef } from 'react';

interface PnLDataPoint {
  time: string;
  pnl: number;
}

interface PnLChartProps {
  data: PnLDataPoint[];
}

export function PnLChart({ data }: PnLChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 40, bottom: 30, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find min and max PnL
    const pnlValues = data.map(d => d.pnl);
    const minPnl = Math.min(...pnlValues, 0);
    const maxPnl = Math.max(...pnlValues, 0);
    const pnlRange = maxPnl - minPnl || 1;

    // Draw grid lines
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;

    // Horizontal grid lines (5 lines)
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();

      // Draw labels
      const value = maxPnl - (pnlRange / 4) * i;
      ctx.fillStyle = '#9ca3af';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`$${value.toFixed(0)}`, padding.left + chartWidth + 5, y + 4);
    }

    // Draw zero line (if in range)
    if (minPnl < 0 && maxPnl > 0) {
      const zeroY = padding.top + ((maxPnl - 0) / pnlRange) * chartHeight;
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding.left, zeroY);
      ctx.lineTo(padding.left + chartWidth, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw area chart
    if (data.length > 1) {
      const points: { x: number; y: number }[] = [];

      data.forEach((point, i) => {
        const x = padding.left + (i / (data.length - 1)) * chartWidth;
        const y = padding.top + ((maxPnl - point.pnl) / pnlRange) * chartHeight;
        points.push({ x, y });
      });

      // Determine if overall PnL is positive or negative
      const lastPnl = data[data.length - 1].pnl;
      const isPositive = lastPnl >= 0;

      // Draw filled area
      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
      if (isPositive) {
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
        gradient.addColorStop(1, 'rgba(34, 197, 94, 0.0)');
      } else {
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(points[0].x, padding.top + chartHeight);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
      ctx.closePath();
      ctx.fill();

      // Draw line
      ctx.strokeStyle = isPositive ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // Draw current value indicator
      const lastPoint = points[points.length - 1];
      ctx.fillStyle = isPositive ? '#22c55e' : '#ef4444';
      ctx.beginPath();
      ctx.arc(lastPoint.x, lastPoint.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw time labels (show first, middle, last)
    if (data.length >= 3) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';

      const labelIndices = [0, Math.floor(data.length / 2), data.length - 1];
      labelIndices.forEach(i => {
        const x = padding.left + (i / (data.length - 1)) * chartWidth;
        const date = new Date(data[i].time);
        const label = `${date.getMonth() + 1}/${date.getDate()}`;
        ctx.fillText(label, x, height - 10);
      });
    }
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No PnL data available
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
