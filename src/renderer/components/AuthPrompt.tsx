import React from 'react';

interface Props {
  onLoginSuccess: () => void;
}

export default function AuthPrompt({ onLoginSuccess }: Props) {
  async function handleCheck() {
    const isAuth = await window.electronAPI.auth.isAuthenticated();
    if (isAuth) onLoginSuccess();
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: 24,
      background: '#1a1a1a',
      color: '#e8e8e8',
      textAlign: 'center',
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        background: 'linear-gradient(135deg, #ff8a65, #e57373)',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 24,
      }}>
        ✦
      </div>

      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
        Claude Usage
      </div>
      <div style={{ color: '#888', fontSize: 12, marginBottom: 24, lineHeight: 1.6 }}>
        Requires Claude Code to be installed and logged in.
      </div>

      <div style={{
        background: '#222',
        border: '1px solid #333',
        borderRadius: 8,
        padding: '10px 16px',
        fontFamily: 'monospace',
        fontSize: 13,
        color: '#aaa',
        marginBottom: 24,
        width: '100%',
      }}>
        claude login
      </div>

      <button
        onClick={handleCheck}
        style={{
          background: '#ff8a65',
          border: 'none',
          color: '#fff',
          padding: '10px 24px',
          borderRadius: 8,
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: 13,
          width: '100%',
          maxWidth: 200,
        }}
      >
        I'm logged in
      </button>
    </div>
  );
}
