'use client';

import { useEffect, useRef } from 'react';

interface DonutDataPoint {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutDataPoint[];
  percentage?: string;
}

export function DonutChart({ data, percentage }: DonutChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const size = 80;
    canvas.width = size * window.devicePixelRatio;
    canvas.height = size * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = 30;
    const innerRadius = 22;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Calculate total
    const total = data.reduce((sum, d) => sum + d.value, 0);

    // Draw donut segments
    let startAngle = -Math.PI / 2; // Start at top

    data.forEach(segment => {
      const segmentAngle = (segment.value / total) * 2 * Math.PI;
      const endAngle = startAngle + segmentAngle;

      // Draw segment
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = segment.color;
      ctx.fill();

      startAngle = endAngle;
    });

    // Draw center circle (to make it a donut)
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#111827'; // bg-gray-900
    ctx.fill();
  }, [data]);

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-20 h-20"
          style={{ width: '80px', height: '80px' }}
        />
      </div>
      <div className="flex-1">
        {data.map((segment, idx) => (
          <div key={idx} className="flex items-center gap-2 mb-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-xs text-gray-400">{segment.label}</span>
            <span className="text-xs text-white ml-auto">
              {percentage || `$${segment.value.toLocaleString()}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
