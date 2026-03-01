import React, { useEffect, useState } from 'react';
import UsagePopup from './components/UsagePopup';
import AuthPrompt from './components/AuthPrompt';

export default function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    window.electronAPI.auth.isAuthenticated().then(setAuthenticated);
  }, []);

  if (authenticated === null) return null; // Loading

  if (!authenticated) {
    return (
      <AuthPrompt
        onLoginSuccess={() => setAuthenticated(true)}
      />
    );
  }

  return (
    <UsagePopup
      onLogout={() => setAuthenticated(false)}
    />
  );
}
