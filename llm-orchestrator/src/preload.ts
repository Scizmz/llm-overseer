import { contextBridge, ipcRenderer } from 'electron';
import { ELECTRON_CHANNELS } from './config';

// Enhanced API for window controls and native features
contextBridge.exposeInMainWorld('api', {
  /**
   * Send a prompt to the main process and receive the LLM response.
   * @param prompt The user's prompt string.
   * @param framework Optional framework to use
   * @returns Promise with LLM response
   */
  invokeLLM: (prompt: string, framework?: string) =>
    ipcRenderer.invoke(ELECTRON_CHANNELS.LLM_INVOKE, prompt, framework)
});

// Network Discovery and Device Management API
contextBridge.exposeInMainWorld('electronAPI', {
  // Window Control APIs
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  getWindowState: () => ipcRenderer.invoke('window-get-state'),
  
  // Window State Event Listeners
  onWindowStateChanged: (callback: (state: { maximized: boolean; fullscreen: boolean }) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('window-state-changed', listener);
    
    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener('window-state-changed', listener);
    };
  },

  onWindowFocusChanged: (callback: (state: { focused: boolean }) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('window-focus-changed', listener);
    
    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener('window-focus-changed', listener);
    };
  },
    
  // Platform Information
  getPlatformInfo: () => ipcRenderer.invoke('get-platform-info'),
  
  // Theme Management
  setTheme: (theme: 'light' | 'dark' | 'system') => 
    ipcRenderer.invoke('set-theme', theme),
  getTheme: () => ipcRenderer.invoke('get-theme'),

  // Network Discovery
  startNetworkScan: () => 
    ipcRenderer.invoke(ELECTRON_CHANNELS.DISCOVERY_START_SCAN),
  
  stopNetworkScan: () => 
    ipcRenderer.invoke(ELECTRON_CHANNELS.DISCOVERY_STOP_SCAN),
  
  getDiscoveryState: () => 
    ipcRenderer.invoke(ELECTRON_CHANNELS.DISCOVERY_GET_STATE),
  
  onNetworkDiscoveryUpdate: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on(ELECTRON_CHANNELS.DISCOVERY_UPDATE, listener);
    
    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener(ELECTRON_CHANNELS.DISCOVERY_UPDATE, listener);
    };
  },

  // Device Management
  connectToDevice: (device: any) => 
    ipcRenderer.invoke(ELECTRON_CHANNELS.DEVICE_CONNECT, device),
  
  disconnectFromDevice: (deviceId: string) => 
    ipcRenderer.invoke(ELECTRON_CHANNELS.DEVICE_DISCONNECT, deviceId),
  
  addDeviceToConfig: (device: any) => 
    ipcRenderer.invoke(ELECTRON_CHANNELS.DEVICE_ADD_TO_CONFIG, device),
  
  removeDeviceFromConfig: (deviceId: string) => 
    ipcRenderer.invoke(ELECTRON_CHANNELS.DEVICE_REMOVE_FROM_CONFIG, deviceId),

  // Scan Configuration
  getScanConfig: () => 
    ipcRenderer.invoke(ELECTRON_CHANNELS.CONFIG_GET_SCAN),
  
  saveScanConfig: (config: any) => 
    ipcRenderer.invoke(ELECTRON_CHANNELS.CONFIG_SAVE_SCAN, config),

  // General Configuration
  getNetworkConfig: () => 
    ipcRenderer.invoke(ELECTRON_CHANNELS.CONFIG_GET_NETWORK),
  
  updateNetworkConfig: (config: any) => 
    ipcRenderer.invoke(ELECTRON_CHANNELS.CONFIG_SAVE_NETWORK, config),
  
  exportConfig: () => 
    ipcRenderer.invoke(ELECTRON_CHANNELS.CONFIG_EXPORT),
  
  importConfig: (configPath: string) => 
    ipcRenderer.invoke(ELECTRON_CHANNELS.CONFIG_IMPORT, configPath),

  // System Health and Diagnostics
  getSystemHealth: () => ipcRenderer.invoke('get-system-health'),
  refreshAllData: () => ipcRenderer.invoke('refresh-all-data'),

  // Enhanced Window Management
  setWindowDraggable: (isDraggable: boolean) => 
    ipcRenderer.invoke('window-set-draggable', isDraggable),

  // File System Access (for headless server mode preparation)
  readFile: (path: string) => ipcRenderer.invoke('fs-read-file', path),
  writeFile: (path: string, data: string) => ipcRenderer.invoke('fs-write-file', path, data),
  
  // Server Mode APIs (for future remote access feature)
  startHeadlessServer: (config: any) => ipcRenderer.invoke('start-headless-server', config),
  stopHeadlessServer: () => ipcRenderer.invoke('stop-headless-server'),
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),

  // LLM Interconnect Window Management (for future modal displays)
  openInterconnectWindow: (modelId: string, config?: any) => 
    ipcRenderer.invoke('open-interconnect-window', modelId, config),
  closeInterconnectWindow: (windowId: string) => 
    ipcRenderer.invoke('close-interconnect-window', windowId),
  
  // Advanced Window Features
  enableFullscreen: () => ipcRenderer.invoke('window-fullscreen'),
  disableFullscreen: () => ipcRenderer.invoke('window-exit-fullscreen'),
  enableAlwaysOnTop: () => ipcRenderer.invoke('window-always-on-top', true),
  disableAlwaysOnTop: () => ipcRenderer.invoke('window-always-on-top', false),

  // Application Lifecycle
  restartApp: () => ipcRenderer.invoke('app-restart'),
  quitApp: () => ipcRenderer.invoke('app-quit'),
  
  // Development Tools
  openDevTools: () => ipcRenderer.invoke('open-dev-tools'),
  reloadApp: () => ipcRenderer.invoke('reload-app'),

  // System Integration
  showInFolder: (path: string) => ipcRenderer.invoke('show-in-folder', path),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  
  // Notification Management
  showNotification: (title: string, body: string, options?: any) => 
    ipcRenderer.invoke('show-notification', title, body, options),

  // Performance Monitoring
  getPerformanceMetrics: () => ipcRenderer.invoke('get-performance-metrics'),
  
  // Auto-updater (for future updates)
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),

  // Security Features
  validateCertificate: (url: string) => ipcRenderer.invoke('validate-certificate', url),
  encryptData: (data: string, key: string) => ipcRenderer.invoke('encrypt-data', data, key),
  decryptData: (encryptedData: string, key: string) => ipcRenderer.invoke('decrypt-data', encryptedData, key)
});

// Global error handling for the renderer process
window.addEventListener('error', (event) => {
  console.error('Renderer Error:', event.error);
  // Optionally send to main process for logging
  ipcRenderer.send('renderer-error', {
    message: event.error?.message,
    stack: event.error?.stack,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Rejection:', event.reason);
  // Optionally send to main process for logging
  ipcRenderer.send('renderer-unhandled-rejection', {
    reason: event.reason?.toString(),
    stack: event.reason?.stack
  });
});

// Enhanced type definitions for TypeScript
declare global {
  interface Window {
    api: {
      invokeLLM: (prompt: string, framework?: string) => Promise<string>;
    };
    electronAPI: {
      // Window Controls
      windowMinimize: () => Promise<boolean>;
      windowMaximize: () => Promise<{ maximized: boolean; bounds: any } | false>;
      windowClose: () => Promise<boolean>;
      getWindowState: () => Promise<{
        isMaximized: boolean;
        isMinimized: boolean;
        isFullScreen: boolean;
        isFocused: boolean;
        bounds: any;
      } | null>;
      
      // Event Listeners
      onWindowStateChanged: (callback: (state: { maximized: boolean; fullscreen: boolean }) => void) => () => void;
      onWindowFocusChanged: (callback: (state: { focused: boolean }) => void) => () => void;
      onNetworkDiscoveryUpdate: (callback: (data: any) => void) => () => void;
      
      // Platform & Theme
      getPlatformInfo: () => Promise<{
        platform: string;
        version: string;
        arch: string;
        isPackaged: boolean;
        appVersion: string;
      }>;
      setTheme: (theme: 'light' | 'dark' | 'system') => Promise<boolean>;
      getTheme: () => Promise<{ shouldUseDarkColors: boolean; themeSource: string }>;
      
      // Network Discovery
      startNetworkScan: () => Promise<any>;
      stopNetworkScan: () => Promise<any>;
      getDiscoveryState: () => Promise<any>;
      
      // Device Management
      connectToDevice: (device: any) => Promise<boolean>;
      disconnectFromDevice: (deviceId: string) => Promise<any>;
      addDeviceToConfig: (device: any) => Promise<any>;
      removeDeviceFromConfig: (deviceId: string) => Promise<any>;
      
      // Configuration
      getScanConfig: () => Promise<any>;
      saveScanConfig: (config: any) => Promise<any>;
      getNetworkConfig: () => Promise<any>;
      updateNetworkConfig: (config: any) => Promise<any>;
      exportConfig: () => Promise<any>;
      importConfig: (configPath: string) => Promise<any>;
      
      // System & Health
      getSystemHealth: () => Promise<any>;
      refreshAllData: () => Promise<any>;
      
      // Extended Features (for future use)
      [key: string]: any;
    };
  }
}
