import React from 'react';

interface Props {
  percent: number;
  resetMs: number;
  label: string;
  accentColor?: string; // overrides the automatic traffic-light color
  subtitle?: string;    // overrides the reset-time label when provided
}

function resetLabel(ms: number): string {
  if (ms <= 0) return 'Resetting soon';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const d = Math.floor(h / 24);
  if (d >= 1) return `Resets in ${d}d`;
  if (h >= 1) return `Resets in ${h}h`;
  return `Resets in ${m}m`;
}

function barColor(percent: number): string {
  if (percent >= 90) return '#e57373'; // red
  if (percent >= 70) return '#ff9800'; // orange
  return '#4caf50';                    // green (default)
}

export default function ProgressBar({ percent, resetMs, label, accentColor, subtitle }: Props) {
  const color = accentColor ?? barColor(percent);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: '#aaa', fontSize: 12 }}>{label}</span>
        <span style={{ fontWeight: 600, fontSize: 12 }}>{percent}%</span>
      </div>
      <div style={{
        height: 6,
        borderRadius: 3,
        background: '#333',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, percent)}%`,
          background: color,
          borderRadius: 3,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <div style={{ color: '#666', fontSize: 11, marginTop: 3 }}>
        {subtitle ?? resetLabel(resetMs)}
      </div>
    </div>
  );
}
