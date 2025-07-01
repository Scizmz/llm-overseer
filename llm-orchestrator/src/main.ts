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
    webPreferences: {
      preload: join(__dirname, 'preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'default',
    icon: join(__dirname, 'assets/icon.png') // Add your app icon
  });

  // In development, use the dev server URL
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools(); // Auto-open DevTools in development
  } else {
    // In production, load the built file
    mainWindow.loadFile(join(__dirname, `renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
}

// IPC Handlers

// LLM Communication
ipcMain.handle(ELECTRON_CHANNELS.LLM_INVOKE, async (_event, prompt: string, framework?: string) => {
  try {
    const request: LLMRequest = {
      prompt,
      framework: framework || 'BMAD-METHOD'
    };
    const result = await sendPrompt(request);
    return result;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || err,
      response: `Error: ${err.message || err}`
    };
  }
});

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

// Real-time updates via WebSocket (when available)
function setupRealtimeUpdates() {
  // This will be implemented when WebSocket integration is ready
  // For now, we can poll for updates or use the existing WebSocket service
  console.log('Real-time updates will be implemented with WebSocket integration');
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
