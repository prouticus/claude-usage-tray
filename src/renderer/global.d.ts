import type { UsageData } from '../shared/types';

declare global {
  interface Window {
    electronAPI: {
      openPopup(): Promise<void>;
      mini: {
        setHeight(height: number): Promise<void>;
      };
      auth: {
        isAuthenticated(): Promise<boolean>;
        logout(): Promise<{ success: boolean }>;
      };
      usage: {
        getData(): Promise<{ success: boolean; data?: UsageData; error?: string }>;
        refresh(): Promise<{ success: boolean; data?: UsageData; error?: string }>;
        onUpdate(callback: (data: UsageData) => void): () => void;
      };
    };
  }
}

export {};
