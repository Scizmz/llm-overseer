// --- main.ts ---
import { app, BrowserWindow, ipcMain, nativeTheme, Menu } from 'electron';
import { join } from 'path';
import { sendPrompt, getAvailableModels, getModelStatus, LLMRequest } from './llmClient';
import { API_CONFIG, ELECTRON_CHANNELS } from './config';
import axios from 'axios';

// Add this declaration for Vite's special variables
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow;
let isWindowMaximized = false;
let storedWindowBounds: any = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    autoHideMenuBar: true,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, 'preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      enableRemoteModule: false
    },
    backgroundColor: '#1a1a1a',
    show: false,
    icon: join(__dirname, 'assets/icon.png'),
    ...(process.platform === 'win32' && {
      titleBarStyle: 'hidden',
      titleBarOverlay: false
    }),
    ...(process.platform === 'darwin' && {
      titleBarStyle: 'hiddenInset',
      vibrancy: 'ultra-dark',
      visualEffectState: 'active',
      trafficLightPosition: { x: 0, y: 0 }
    }),
    ...(process.platform === 'linux' && {
      frame: false
    })
  });

  Menu.setApplicationMenu(null);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    if (process.platform === 'win32') {
      try {
        const { systemPreferences } = require('electron');
        if (systemPreferences.getAccentColor) {
          nativeTheme.themeSource = 'dark';
        }
      } catch (error) {
        console.log('Windows theme detection not available');
      }
    }

    mainWindow.setOpacity(0);
    let opacity = 0;
    const fadeIn = setInterval(() => {
      opacity += 0.05;
      mainWindow.setOpacity(opacity);
      if (opacity >= 1) {
        clearInterval(fadeIn);
      }
    }, 16);
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools();
    }
  } else {
    mainWindow.loadFile(join(__dirname, `renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-state-changed', {
      maximized: true,
      fullscreen: mainWindow.isFullScreen()
    });
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-state-changed', {
      maximized: false,
      fullscreen: mainWindow.isFullScreen()
    });
  });

  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.send('window-state-changed', {
      maximized: mainWindow.isMaximized(),
      fullscreen: true
    });
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.send('window-state-changed', {
      maximized: mainWindow.isMaximized(),
      fullscreen: false
    });
  });

  mainWindow.on('focus', () => {
    mainWindow.webContents.send('window-focus-changed', { focused: true });
  });

  mainWindow.on('blur', () => {
    mainWindow.webContents.send('window-focus-changed', { focused: false });
  });

  mainWindow.on('resize', () => {
    mainWindow.webContents.send('window-resize');
  });
}

app.whenReady().then(() => {
  createWindow();
  setupRealtimeUpdates();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event) => {
    event.preventDefault();
  });
});

ipcMain.handle('window-minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
    return true;
  }
  return false;
});

ipcMain.handle('window-maximize', () => {
  console.log('Maximize/unmaximize requested', { isWindowMaximized, storedWindowBounds });
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    
    if (isWindowMaximized) {
      // RESTORE: Go back to stored position
      console.log('Restoring to:', storedWindowBounds);
      if (storedWindowBounds) {
        mainWindow.setBounds(storedWindowBounds);
        storedWindowBounds = null;
      }
      isWindowMaximized = false;
      
    } else {
      // MAXIMIZE: Store current bounds first, then maximize
      storedWindowBounds = mainWindow.getBounds();
      console.log('Storing bounds:', storedWindowBounds);
      
      const { screen } = require('electron');
      const display = screen.getDisplayMatching(mainWindow.getBounds());
      const { workArea } = display;
      
      // Calculate frame offsets
      let frameOffset = { x: 0, y: 0, width: 0, height: 0 };
      if (process.platform === 'win32') {
        frameOffset = { x: -8, y: -8, width: 16, height: 16 };
      } else if (process.platform === 'linux') {
        frameOffset = { x: -4, y: -4, width: 8, height: 8 };
      }
      
      // Set to "maximized" position
      mainWindow.setBounds({
        x: workArea.x + frameOffset.x,
        y: workArea.y + frameOffset.y,
        width: workArea.width + frameOffset.width,
        height: workArea.height + frameOffset.height
      });
      
      isWindowMaximized = true;
    }
    
    // Notify renderer of state change
    mainWindow.webContents.send('window-state-changed', { 
      maximized: isWindowMaximized,
      fullscreen: false 
    });
    
    return {
      maximized: isWindowMaximized,
      bounds: mainWindow.getBounds()
    };
  }
  return false;
});

ipcMain.handle('discovery:get-state', async () => {
  try {
    const response = await axios.get(`${API_CONFIG.orchestratorUrl}/api/discovery/state`);
    return response.data;
  } catch (error: any) {
    console.error('Failed to get discovery state:', error);
    return {
      scanning: false,
      scanProgress: 0,
      lastScan: null,
      discoveredDevices: [],
      newDevicesCount: 0,
      scanEnabled: false
    };
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
    return true;
  }
  return false;
});

ipcMain.handle('window-get-state', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return {
      isMaximized: mainWindow.isMaximized(),
      isMinimized: mainWindow.isMinimized(),
      isFullScreen: mainWindow.isFullScreen(),
      isFocused: mainWindow.isFocused(),
      bounds: mainWindow.getBounds()
    };
  }
  return null;
});

ipcMain.handle('window-set-draggable', () => true);

ipcMain.handle('get-platform-info', () => {
  return {
    platform: process.platform,
    version: process.getSystemVersion(),
    arch: process.arch,
    isPackaged: app.isPackaged,
    appVersion: app.getVersion()
  };
});

ipcMain.handle('set-theme', (event, theme: 'light' | 'dark' | 'system') => {
  nativeTheme.themeSource = theme;
  return nativeTheme.shouldUseDarkColors;
});

ipcMain.handle('get-theme', () => {
  return {
    shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
    themeSource: nativeTheme.themeSource
  };
});

ipcMain.handle('get-system-health', async () => {
  try {
    const orchestratorHealth = await axios.get(`${API_CONFIG.orchestratorUrl}/health`);
    return {
      orchestrator: orchestratorHealth.data,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      orchestrator: { status: 'error', error: error.message },
      timestamp: new Date().toISOString()
    };
  }
});

ipcMain.handle('zoom-in', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const currentZoom = mainWindow.webContents.getZoomFactor();
    mainWindow.webContents.setZoomFactor(Math.min(currentZoom + 0.2, 3.0));
  }
});

ipcMain.handle('zoom-out', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const currentZoom = mainWindow.webContents.getZoomFactor();
    mainWindow.webContents.setZoomFactor(Math.max(currentZoom - 0.2, 0.5));
  }
});

ipcMain.handle('reset-zoom', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.setZoomFactor(1.0);
  }
});

function setupRealtimeUpdates() {
  console.log('Setting up real-time WebSocket connection...');
}

