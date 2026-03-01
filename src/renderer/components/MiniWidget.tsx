import React, { useEffect, useState } from 'react';
import type { UsageInfo } from '../../shared/types';

// Must stay in sync with MINI_HEIGHT_BASE / MINI_HEIGHT_EXTRA in main/index.ts
const HEIGHT_BASE = 78;  // header + 2 bars
const HEIGHT_EXTRA = 96; // header + 3 bars (extra usage)

function MiniBar({ label, percent, color }: { label: string; percent: number; color?: string }) {
  const barColor = color ?? (percent >= 90 ? '#e57373' : percent >= 70 ? '#ff9800' : '#4caf50');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{ color: '#666', fontSize: 10, width: 46, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#2a2a2a', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, percent)}%`,
          background: barColor,
          borderRadius: 2,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ color: '#bbb', fontSize: 10, width: 26, textAlign: 'right', flexShrink: 0 }}>
        {percent}%
      </span>
    </div>
  );
}

export default function MiniWidget() {
  const [usage, setUsage] = useState<UsageInfo | null>(null);

  useEffect(() => {
    window.electronAPI.usage.getData().then(result => {
      if (result.success && result.data) setUsage(result.data.usage);
    });
    const unsub = window.electronAPI.usage.onUpdate(data => setUsage(data.usage));
    return unsub;
  }, []);

  // Resize window to fit the number of bars being shown
  const hasExtra = usage?.extraPercent !== undefined;
  useEffect(() => {
    if (!usage) return;
    window.electronAPI.mini.setHeight(hasExtra ? HEIGHT_EXTRA : HEIGHT_BASE);
  }, [hasExtra, usage]);

  return (
    <div style={{
      padding: '8px 12px',
      background: 'rgba(18, 18, 18, 0.93)',
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.07)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      // @ts-expect-error WebkitAppRegion not in CSSProperties
      WebkitAppRegion: 'drag',
    }}>

      {/* Header — acts as the drag handle */}
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.1em',
        color: '#444',
        textTransform: 'uppercase',
      }}>
        Claude usage
      </div>

      {/* Bars — no-drag so clicks register; opens the full popup */}
      <div
        onClick={() => window.electronAPI.openPopup()}
        title="Open Claude Usage"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          cursor: 'pointer',
          // @ts-expect-error WebkitAppRegion not in CSSProperties
          WebkitAppRegion: 'no-drag',
        }}
      >
        {usage ? (
          <>
            <MiniBar label="Session" percent={usage.sessionPercent} />
            <MiniBar label="Weekly" percent={usage.weeklyPercent} />
            {usage.extraPercent !== undefined && (
              <MiniBar label="Extra" percent={usage.extraPercent} color="#ce93d8" />
            )}
          </>
        ) : (
          <div style={{ color: '#444', fontSize: 10, textAlign: 'center' }}>Loading…</div>
        )}
      </div>

    </div>
  );
}
