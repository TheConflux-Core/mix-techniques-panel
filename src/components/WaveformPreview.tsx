"use client";

import { useEffect, useRef } from "react";

interface WaveformPreviewProps {
  peaks: number[];
  height?: number;
  barWidth?: number;
  barGap?: number;
  color?: string;
  backgroundColor?: string;
  className?: string;
}

export default function WaveformPreview({
  peaks,
  height = 80,
  barWidth = 3,
  barGap = 1,
  color = "#D4A843",
  backgroundColor = "#1A0F0A",
  className = "",
}: WaveformPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks.length) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, w, h);

    const totalBarWidth = barWidth + barGap;
    const barCount = Math.floor(w / totalBarWidth);
    const step = peaks.length / barCount;

    for (let i = 0; i < barCount; i++) {
      const peakIndex = Math.floor(i * step);
      const peak = peaks[peakIndex] || 0;
      const barHeight = Math.max(2, peak * h * 0.9);
      const x = i * totalBarWidth;
      const y = (h - barHeight) / 2;

      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }, [peaks, height, barWidth, barGap, color, backgroundColor]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full ${className}`}
      style={{ height: `${height}px` }}
    />
  );
}
