import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen } from 'electron';
import path from 'path';
import Store from 'electron-store';
import { isAuthenticated } from './auth';
import { fetchUsageData } from './apiClient';
import type { UsageData } from '../shared/types';

// Prevent multiple instances
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

// Hide from macOS dock — tray-only app
if (process.platform === 'darwin') {
  app.dock?.hide();
}

const store = new Store<{
  launchAtStartup: boolean;
  hasLaunchedBefore: boolean;
  showMiniWidget: boolean;
  miniWidgetX: number;
  miniWidgetY: number;
}>();

let tray: Tray | null = null;
let popupWindow: BrowserWindow | null = null;
let miniWindow: BrowserWindow | null = null;
let cachedUsageData: UsageData | null = null;

const POPUP_WIDTH = 300;
const POPUP_HEIGHT = 440;
const MINI_WIDTH = 230;
const MINI_HEIGHT_BASE = 78;  // header + 2 bars — must match HEIGHT_BASE in MiniWidget.tsx
const MINI_HEIGHT_EXTRA = 96; // header + 3 bars — must match HEIGHT_EXTRA in MiniWidget.tsx
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Background usage refresh — updates cache, tooltip, and mini widget
// ---------------------------------------------------------------------------
async function refreshUsage(): Promise<void> {
  try {
    const data = await fetchUsageData();
    cachedUsageData = data;

    tray?.setToolTip(
      `Claude Usage\nSession: ${data.usage.sessionPercent}%  ·  Weekly: ${data.usage.weeklyPercent}%`
    );

    // Push live update to the mini widget (if open)
    miniWindow?.webContents.send('usage:update', data);
  } catch {
    // Keep existing tooltip on fetch failure
  }
}

// ---------------------------------------------------------------------------
// Window management
// ---------------------------------------------------------------------------
function createPopupWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: false,
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  win.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Hide popup when it loses focus (click outside)
  win.on('blur', () => {
    win.hide();
  });

  return win;
}

function createMiniWindow(): BrowserWindow {
  const { workArea } = screen.getPrimaryDisplay();

  const defaultX = workArea.x + workArea.width - MINI_WIDTH - 16;
  const defaultY = workArea.y + workArea.height - MINI_HEIGHT_BASE - 16;

  const x = store.get('miniWidgetX', defaultX);
  const y = store.get('miniWidgetY', defaultY);

  const win = new BrowserWindow({
    width: MINI_WIDTH,
    height: MINI_HEIGHT_BASE,
    x,
    y,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  win.loadFile(path.join(__dirname, '../renderer/mini.html'));

  // Persist position when the user drags the widget
  win.on('moved', () => {
    const [wx, wy] = win.getPosition();
    store.set('miniWidgetX', wx);
    store.set('miniWidgetY', wy);
  });

  return win;
}

function positionWindowAtTray(win: BrowserWindow): void {
  if (!tray) return;

  const trayBounds = tray.getBounds();
  const { workArea } = screen.getDisplayNearestPoint(trayBounds);
  const { width: winW, height: winH } = win.getBounds();

  let x = Math.round(trayBounds.x + trayBounds.width / 2 - winW / 2);
  let y: number;

  if (process.platform === 'darwin') {
    y = Math.round(trayBounds.y + trayBounds.height + 4);
  } else {
    y = Math.round(trayBounds.y - winH - 4);
  }

  // Clamp to work area
  x = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - winW));
  y = Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - winH));

  win.setPosition(x, y);
}

function togglePopup(): void {
  if (!popupWindow) return;

  if (popupWindow.isVisible()) {
    popupWindow.hide();
  } else {
    positionWindowAtTray(popupWindow);
    popupWindow.show();
    popupWindow.focus();
  }
}

function buildTrayMenu(): Menu {
  return Menu.buildFromTemplate([
    {
      label: 'Open',
      click: () => togglePopup(),
    },
    { type: 'separator' },
    {
      label: 'Show mini widget',
      type: 'checkbox',
      checked: store.get('showMiniWidget', true),
      click: (menuItem) => {
        store.set('showMiniWidget', menuItem.checked);
        if (menuItem.checked) {
          miniWindow?.show();
        } else {
          miniWindow?.hide();
        }
      },
    },
    {
      label: 'Launch at startup',
      type: 'checkbox',
      checked: store.get('launchAtStartup', false),
      click: (menuItem) => {
        store.set('launchAtStartup', menuItem.checked);
        app.setLoginItemSettings({ openAtLogin: menuItem.checked });
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);
}

function createTray(): void {
  const iconPath = path.join(__dirname, '../../public/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('Claude Usage');
  tray.setContextMenu(buildTrayMenu());
  tray.on('click', () => togglePopup());
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------
ipcMain.handle('auth:isAuthenticated', () => {
  return isAuthenticated();
});

// No login handler needed — auth is via Claude Code CLI
// auth:logout just tells the renderer to show the "not authenticated" screen
ipcMain.handle('auth:logout', () => ({ success: true }));

ipcMain.handle('usage:getData', async () => {
  try {
    // Serve from cache for instant popup response
    if (cachedUsageData) return { success: true, data: cachedUsageData };
    const data = await fetchUsageData();
    cachedUsageData = data;
    return { success: true, data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

ipcMain.handle('popup:open', () => {
  if (popupWindow) {
    positionWindowAtTray(popupWindow);
    popupWindow.show();
    popupWindow.focus();
  }
});

ipcMain.handle('mini:setHeight', (_, height: number) => {
  // Clamp to sensible bounds to avoid runaway values
  const clamped = Math.max(MINI_HEIGHT_BASE, Math.min(MINI_HEIGHT_EXTRA, height));
  miniWindow?.setSize(MINI_WIDTH, clamped);
});

ipcMain.handle('usage:refresh', async () => {
  try {
    const data = await fetchUsageData();
    cachedUsageData = data;
    tray?.setToolTip(
      `Claude Usage\nSession: ${data.usage.sessionPercent}%  ·  Weekly: ${data.usage.weeklyPercent}%`
    );
    miniWindow?.webContents.send('usage:update', data);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
app.whenReady().then(async () => {
  createTray();
  popupWindow = createPopupWindow();
  miniWindow = createMiniWindow();

  const launchAtStartup = store.get('launchAtStartup', false);
  app.setLoginItemSettings({ openAtLogin: launchAtStartup });

  // Fetch initial data, update tooltip, prime mini widget
  await refreshUsage();

  // Show mini widget if enabled (default: on)
  if (store.get('showMiniWidget', true)) {
    miniWindow.show();
  }

  // Keep everything live, refreshing every 5 minutes
  setInterval(refreshUsage, REFRESH_INTERVAL_MS);

  // Show popup automatically on very first launch
  if (!store.get('hasLaunchedBefore', false)) {
    store.set('hasLaunchedBefore', true);
    togglePopup();
  }
});

app.on('window-all-closed', () => {
  // Keep running as tray app
});

app.on('second-instance', () => {
  if (popupWindow) {
    positionWindowAtTray(popupWindow);
    popupWindow.show();
    popupWindow.focus();
  }
});
