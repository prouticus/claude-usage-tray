import React, { useCallback, useEffect, useState } from 'react';
import ProgressBar from './ProgressBar';
import type { UsageData } from '../../shared/types';

interface Props {
  onLogout: () => void;
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: UsageData };

function timeAgo(ms: number): string {
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return 'just now';
  const m = Math.floor(sec / 60);
  return `${m} min ago`;
}

export default function UsagePopup({ onLogout }: Props) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force = false) => {
    setRefreshing(true);
    const result = force
      ? await window.electronAPI.usage.refresh()
      : await window.electronAPI.usage.getData();

    if (result.success && result.data) {
      setState({ status: 'ok', data: result.data });
    } else {
      setState({ status: 'error', message: result.error ?? 'Unknown error' });
    }
    setRefreshing(false);
  }, []);

  // Load on mount
  useEffect(() => { load(); }, [load]);

  async function handleLogout() {
    await window.electronAPI.auth.logout();
    onLogout();
  }

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#1a1a1a',
    color: '#e8e8e8',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headerStyle: any = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #2a2a2a',
    WebkitAppRegion: 'drag',
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 10,
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 6,
    fontSize: 13,
  };

  return (
    <div style={containerStyle}>
      {/* Draggable title bar */}
      <div style={headerStyle}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Account &amp; Usage</span>
        <button
          onClick={handleLogout}
          style={{
            background: 'none',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            // @ts-expect-error WebkitAppRegion not in CSSProperties types
            WebkitAppRegion: 'no-drag',
          }}
          title="Sign out"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {state.status === 'loading' && (
          <div style={{ color: '#666', textAlign: 'center', paddingTop: 40 }}>
            Loading…
          </div>
        )}

        {state.status === 'error' && (
          <div style={{ color: '#e57373', fontSize: 12, lineHeight: 1.5 }}>
            <div style={{ marginBottom: 8 }}>⚠ {state.message}</div>
            <button
              onClick={() => load(true)}
              style={retryBtnStyle}
            >
              Retry
            </button>
          </div>
        )}

        {state.status === 'ok' && (
          <>
            {/* ACCOUNT */}
            <div style={sectionLabelStyle}>Account</div>

            <div style={rowStyle}>
              <span style={{ color: '#aaa' }}>Auth method</span>
              <span>{state.data.account.authMethod}</span>
            </div>
            <div style={rowStyle}>
              <span style={{ color: '#aaa' }}>Email</span>
              <span style={{ color: '#ff8a65', maxWidth: 160, textAlign: 'right', wordBreak: 'break-all' }}>
                {state.data.account.email}
              </span>
            </div>
            <div style={rowStyle}>
              <span style={{ color: '#aaa' }}>Organization</span>
              <span style={{ maxWidth: 160, textAlign: 'right', color: '#ff8a65', wordBreak: 'break-all' }}>
                {state.data.account.organizationName}
              </span>
            </div>
            <div style={{ ...rowStyle, marginBottom: 20 }}>
              <span style={{ color: '#aaa' }}>Plan</span>
              <span>{state.data.account.plan}</span>
            </div>

            {/* USAGE */}
            <div style={sectionLabelStyle}>Usage</div>

            <ProgressBar
              label="Session (5hr)"
              percent={state.data.usage.sessionPercent}
              resetMs={state.data.usage.sessionResetMs}
            />
            <ProgressBar
              label="Weekly (7 day)"
              percent={state.data.usage.weeklyPercent}
              resetMs={state.data.usage.weeklyResetMs}
            />
            {state.data.usage.extraPercent !== undefined && (
              <ProgressBar
                label="Extra usage (billed)"
                percent={state.data.usage.extraPercent}
                resetMs={0}
                accentColor="#ce93d8"
                subtitle={
                  state.data.usage.extraSpentDollars !== undefined && state.data.usage.extraLimitDollars !== undefined
                    ? `$${state.data.usage.extraSpentDollars.toFixed(2)} of $${state.data.usage.extraLimitDollars.toFixed(2)} spent`
                    : undefined
                }
              />
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderTop: '1px solid #2a2a2a',
        fontSize: 11,
        color: '#555',
      }}>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          style={refreshBtnStyle}
          title="Refresh"
        >
          {refreshing ? '…' : '↻'} Refresh
        </button>
        {state.status === 'ok' && (
          <span>Last: {timeAgo(state.data.fetchedAt)}</span>
        )}
      </div>
    </div>
  );
}

const retryBtnStyle: React.CSSProperties = {
  background: '#2a2a2a',
  border: '1px solid #444',
  color: '#e8e8e8',
  padding: '4px 12px',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 12,
};

const refreshBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#555',
  cursor: 'pointer',
  fontSize: 11,
  padding: 0,
};
