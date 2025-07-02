import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { sendPrompt, getAvailableModels, getModelStatus, LLMRequest } from './llmClient';
import { API_CONFIG, ELECTRON_CHANNELS } from './config';
import axios from 'axios';

// Add this declaration for Vite's special variables
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    // CHANGE: Use native frame with dark styling
    frame: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    resizable: true,
    webPreferences: {
      preload: join(__dirname, 'preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    // Dark window styling
    backgroundColor: '#1a1a1a',
    show: false,
    icon: join(__dirname, 'assets/icon.png'),
    webSecurity: true,
    // Add dark theme for native controls
    ...(process.platform === 'win32' && {
      titleBarOverlay: {
        color: '#1a1a1a',
        symbolColor: '#ffffff'
      }
    }),
    // macOS dark appearance
    ...(process.platform === 'darwin' && {
      vibrancy: 'ultra-dark',
      visualEffectState: 'active'
    })
  });

  // Smooth window appearance with fade-in
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Set dark theme for Windows
    if (process.platform === 'win32') {
      mainWindow.setTitleBarOverlay({
        color: '#1a1a1a',
        symbolColor: '#ffffff',
        height: 32
      });
    }
    
    // Fade-in animation
    mainWindow.setOpacity(0);
    let opacity = 0;
    const fadeIn = setInterval(() => {
      opacity += 0.1;
      mainWindow.setOpacity(opacity);
      if (opacity >= 1) {
        clearInterval(fadeIn);
      }
    }, 16);
  });

  // Load application
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, `renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Simple window state events (no complex bounds calculations needed!)
  mainWindow.on('maximize', () => {
    console.log('Window maximized');
    mainWindow.webContents.send('window-state-changed', { 
      maximized: true,
      fullscreen: false 
    });
  });

  mainWindow.on('unmaximize', () => {
    console.log('Window unmaximized');
    mainWindow.webContents.send('window-state-changed', { 
      maximized: false,
      fullscreen: false 
    });
  });

  mainWindow.on('enter-full-screen', () => {
    console.log('Window entered fullscreen');
    mainWindow.webContents.send('window-state-changed', { 
      maximized: false, 
      fullscreen: true 
    });
  });

  mainWindow.on('leave-full-screen', () => {
    console.log('Window left fullscreen');
    mainWindow.webContents.send('window-state-changed', { 
      maximized: mainWindow.isMaximized(), 
      fullscreen: false 
    });
  });
}

// Network Discovery Handlers
ipcMain.handle(ELECTRON_CHANNELS.DISCOVERY_START_SCAN, async () => {
  try {
    const response = await axios.post(`${API_CONFIG.orchestratorUrl}/api/discovery/scan`);
    return response.data;
  } catch (error: any) {
    console.error('Failed to start network scan:', error);
    throw new Error(`Network scan failed: ${error.message}`);
  }
});

ipcMain.handle(ELECTRON_CHANNELS.DISCOVERY_STOP_SCAN, async () => {
  try {
    const response = await axios.post(`${API_CONFIG.orchestratorUrl}/api/discovery/stop`);
    return response.data;
  } catch (error: any) {
    console.error('Failed to stop network scan:', error);
    throw new Error(`Stop scan failed: ${error.message}`);
  }
});

ipcMain.handle(ELECTRON_CHANNELS.DISCOVERY_GET_STATE, async () => {
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

// Device Management Handlers
ipcMain.handle(ELECTRON_CHANNELS.DEVICE_CONNECT, async (_event, device) => {
  try {
    const response = await axios.post(`${API_CONFIG.orchestratorUrl}/api/discovery/connect/${device.id}`);
    return response.data.success;
  } catch (error: any) {
    console.error('Failed to connect to device:', error);
    return false;
  }
});

ipcMain.handle(ELECTRON_CHANNELS.DEVICE_ADD_TO_CONFIG, async (_event, device) => {
  try {
    const response = await axios.post(`${API_CONFIG.orchestratorUrl}/api/discovery/add-to-config`, { device });
    return response.data;
  } catch (error: any) {
    console.error('Failed to add device to config:', error);
    throw new Error(`Add to config failed: ${error.message}`);
  }
});

ipcMain.handle(ELECTRON_CHANNELS.DEVICE_DISCONNECT, async (_event, deviceId) => {
  try {
    const response = await axios.post(`${API_CONFIG.orchestratorUrl}/api/discovery/disconnect/${deviceId}`);
    return response.data;
  } catch (error: any) {
    console.error('Failed to disconnect device:', error);
    throw new Error(`Disconnect failed: ${error.message}`);
  }
});

// Configuration Handlers
ipcMain.handle(ELECTRON_CHANNELS.CONFIG_GET_SCAN, async () => {
  try {
    const response = await axios.get(`${API_CONFIG.orchestratorUrl}/api/config/scan`);
    return response.data;
  } catch (error: any) {
    console.error('Failed to get scan config:', error);
    return null;
  }
});

ipcMain.handle(ELECTRON_CHANNELS.CONFIG_SAVE_SCAN, async (_event, config) => {
  try {
    const response = await axios.post(`${API_CONFIG.orchestratorUrl}/api/config/scan`, config);
    return response.data;
  } catch (error: any) {
    console.error('Failed to save scan config:', error);
    throw new Error(`Save config failed: ${error.message}`);
  }
});

ipcMain.handle(ELECTRON_CHANNELS.CONFIG_EXPORT, async () => {
  try {
    const response = await axios.get(`${API_CONFIG.orchestratorUrl}/api/config/export`);
    return response.data;
  } catch (error: any) {
    console.error('Failed to export config:', error);
    throw new Error(`Export failed: ${error.message}`);
  }
});

// Window Control Handlers (SINGLE REGISTRATION ONLY)
ipcMain.handle('window-minimize', () => {
  console.log('Minimize requested');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
    return true;
  }
  return false;
});

ipcMain.handle('window-maximize', () => {
  console.log('Maximize/unmaximize requested');
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      // Get the display the window is on
      const { screen } = require('electron');
      const display = screen.getDisplayMatching(mainWindow.getBounds());
      
      // Use workArea instead of bounds to respect taskbars/docks
      const { workArea } = display;
      
      console.log('Display work area:', workArea);
      
      // Set window to fill the work area exactly
      mainWindow.setBounds({
        x: workArea.x,
        y: workArea.y,
        width: workArea.width,
        height: workArea.height
      });
      
      // Force the window to be considered "maximized"
      mainWindow.maximize();
    }
    return true;
  }
  return false;
});

ipcMain.handle('window-close', () => {
  console.log('Close requested');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
    return true;
  }
  return false;
});

// Enhanced window state queries
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

// Add a manual viewport fix handler
ipcMain.handle('window-fix-viewport', () => {
  console.log('Fixing viewport to match display');
  if (mainWindow && !mainWindow.isDestroyed()) {
    const { screen } = require('electron');
    const display = screen.getDisplayMatching(mainWindow.getBounds());
    const { workArea } = display;
    
    console.log('Setting bounds to work area:', workArea);
    
    mainWindow.setBounds({
      x: workArea.x,
      y: workArea.y,
      width: workArea.width,
      height: workArea.height
    });
    
    return {
      success: true,
      workArea,
      currentBounds: mainWindow.getBounds()
    };
  }
  return { success: false };
});

// Force window refresh (emergency fix)
ipcMain.handle('window-force-refresh', () => {
  console.log('Force refresh requested');
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Force window to refresh its state
    const currentBounds = mainWindow.getBounds();
    mainWindow.setBounds({
      ...currentBounds,
      width: currentBounds.width + 1
    });
    setTimeout(() => {
      mainWindow.setBounds(currentBounds);
    }, 50);
    return true;
  }
  return false;
});

// Health check handler
ipcMain.handle('get-system-health', async () => {
  try {
    const orchestratorHealth = await axios.get(`${API_CONFIG.orchestratorUrl}/health`);

    const services = {
      orchestrator: orchestratorHealth.data,
      timestamp: new Date().toISOString()
    };

    return services;
  } catch (error: any) {
    return {
      orchestrator: { status: 'error', error: error.message },
      timestamp: new Date().toISOString()
    };
  }
});

// Manual refresh handler for components
ipcMain.handle('refresh-all-data', async () => {
  try {
    const [discoveryState, systemHealth] = await Promise.all([
      axios.get(`${API_CONFIG.orchestratorUrl}/api/discovery/state`).catch(() => null),
      axios.get(`${API_CONFIG.orchestratorUrl}/health`).catch(() => null)
    ]);

    const refreshData = {
      discovery: discoveryState?.data || null,
      health: systemHealth?.data || null,
      timestamp: new Date().toISOString()
    };

    // Broadcast updates to renderer
    if (mainWindow) {
      if (refreshData.discovery) {
        mainWindow.webContents.send(ELECTRON_CHANNELS.DISCOVERY_UPDATE, refreshData.discovery);
      }
      if (refreshData.health) {
        mainWindow.webContents.send('health-update', refreshData.health);
      }
    }

    return refreshData;
  } catch (error: any) {
    console.error('Failed to refresh all data:', error);
    return { error: error.message };
  }
});

// Real-time updates via WebSocket
function setupRealtimeUpdates() {
  console.log('Setting up real-time WebSocket bridge...');
  
  // Set up periodic heartbeat to backend services
  const heartbeatInterval = setInterval(async () => {
    try {
      // Check orchestrator health
      const healthCheck = await axios.get(`${API_CONFIG.orchestratorUrl}/health`);
      
      // Broadcast health status to renderer if needed
      if (mainWindow && healthCheck.data) {
        mainWindow.webContents.send('health-update', {
          orchestrator: healthCheck.data,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Health check failed:', error);
      if (mainWindow) {
        mainWindow.webContents.send('health-update', {
          orchestrator: { status: 'error', error: error.message },
          timestamp: new Date().toISOString()
        });
      }
    }
  }, 30000); // Every 30 seconds

  // Set up network discovery update polling
  const discoveryInterval = setInterval(async () => {
    try {
      const response = await axios.get(`${API_CONFIG.orchestratorUrl}/api/discovery/state`);
      
      if (mainWindow && response.data) {
        mainWindow.webContents.send(ELECTRON_CHANNELS.DISCOVERY_UPDATE, response.data);
      }
    } catch (error) {
      // Silently handle discovery polling errors
      console.debug('Discovery state polling failed:', error.message);
    }
  }, 10000); // Every 10 seconds

  // Cleanup function
  const cleanup = () => {
    clearInterval(heartbeatInterval);
    clearInterval(discoveryInterval);
  };

  // Store cleanup for app shutdown
  app.on('before-quit', cleanup);
  
  console.log('Real-time updates active: health checks every 30s, discovery updates every 10s');
}

// App Event Handlers
app.whenReady().then(() => {
  createWindow();
  setupRealtimeUpdates();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Graceful shutdown
app.on('before-quit', () => {
  // Cleanup any ongoing network scans or connections
  console.log('Application shutting down...');
});
