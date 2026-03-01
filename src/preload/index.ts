import { contextBridge, ipcRenderer } from 'electron';
import type { UsageData } from '../shared/types';

type UsageResult = { success: boolean; data?: UsageData; error?: string };

contextBridge.exposeInMainWorld('electronAPI', {
  openPopup: (): Promise<void> =>
    ipcRenderer.invoke('popup:open'),
  mini: {
    setHeight: (height: number): Promise<void> =>
      ipcRenderer.invoke('mini:setHeight', height),
  },
  auth: {
    isAuthenticated: (): Promise<boolean> =>
      ipcRenderer.invoke('auth:isAuthenticated'),
    logout: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('auth:logout'),
  },
  usage: {
    getData: (): Promise<UsageResult> =>
      ipcRenderer.invoke('usage:getData'),
    refresh: (): Promise<UsageResult> =>
      ipcRenderer.invoke('usage:refresh'),
    // Subscribe to live usage updates pushed from the main process.
    // Returns an unsubscribe function.
    onUpdate: (callback: (data: UsageData) => void): (() => void) => {
      const handler = (_: unknown, data: UsageData) => callback(data);
      ipcRenderer.on('usage:update', handler);
      return () => ipcRenderer.removeListener('usage:update', handler);
    },
  },
});
