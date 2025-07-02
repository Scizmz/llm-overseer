import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { sendPrompt, getAvailableModels, getModelStatus, LLMRequest } from './llmClient';
import { API_CONFIG, ELECTRON_CHANNELS } from './config';
import axios from 'axios';

// Vite build variables
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, 'preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#1a1a1a',
    show: false,
    titleBarStyle: 'customButtonsOnHover',
    icon: join(__dirname, 'assets/icon.png'),
    webSecurity: true,
  });

  // Smooth window appearance
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
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

  // Window state change events
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-state-changed', { maximized: true });
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-state-changed', { maximized: false });
  });
}

// === IPC HANDLERS ===

// Window Controls
ipcMain.handle('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.restore();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

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

// === APP EVENT HANDLERS ===

app.whenReady().then(() => {
  createWindow();
  console.log('🚀 AI-Agentic Overseer ready');
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

app.on('before-quit', () => {
  console.log('📱 Application shutting down...');
});
