import { create } from 'zustand';
import { API_CONFIG } from '../config';
import { DiscoveredDevice, NetworkDiscoveryState } from '../types/network-discovery';

interface Model {
  id: string;
  name: string;
  type: string;
  status: string;
  rateLimit?: {
    used: number;
    limit: number;
    resetTime: string;
  };
}

interface AppState {
  // Existing model state
  models: Model[];
  fetchModels: () => Promise<void>;
  updateModelStatus: (modelId: string, status: string) => void;
  sendMessage: (message: string) => Promise<void>;

  // Network discovery state
  networkDevices: DiscoveredDevice[];
  networkScanning: boolean;
  networkScanProgress: number;
  networkLastScan: Date | null;
  
  // Network actions
  startNetworkScan: () => Promise<void>;
  stopNetworkScan: () => Promise<void>;
  connectToDevice: (device: DiscoveredDevice) => Promise<void>;
  refreshNetworkDevices: () => Promise<void>;
  setNetworkDevices: (devices: DiscoveredDevice[]) => void;
  updateNetworkScanProgress: (progress: number) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Existing model state initialization
  models: [],

  // Network state initialization
  networkDevices: [],
  networkScanning: false,
  networkScanProgress: 0,
  networkLastScan: null,
    
  // Enhanced fetchModels with your improved error handling
  fetchModels: async () => {
    try {
      // Use correct API endpoint - models come from orchestrator, not model-gateway directly
      const response = await fetch(`${API_CONFIG.orchestratorUrl}/api/models`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        set({ models: data.models });
        console.log('Models fetched successfully:', data.models);
      } else {
        throw new Error(data.error || 'Failed to fetch models');
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
      // Don't clear models on error, keep the previous state
    }
  },
  
  // Enhanced sendMessage with your improved error handling
  sendMessage: async (message: string) => {
    try {
      const response = await fetch(`${API_CONFIG.orchestratorUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Message sent successfully:', result);
      // Note: If you add messages state later, uncomment this:
      // set(state => ({ 
      //   messages: [...state.messages, result] 
      // }));
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error; // Re-throw for caller to handle
    }
  },
  
  // Existing updateModelStatus
  updateModelStatus: (modelId: string, status: string) => {
    set((state) => ({
      models: state.models.map(model =>
        model.id === modelId ? { ...model, status } : model
      )
    }));
  },

  // NEW: Network discovery methods
  startNetworkScan: async () => {
    set({ networkScanning: true, networkScanProgress: 0 });
    try {
      if (window.electronAPI?.startNetworkScan) {
        await window.electronAPI.startNetworkScan();
        console.log('Network scan started successfully');
      } else {
        console.warn('Electron API not available - running in development mode');
        // Mock progress for development
        const mockProgress = () => {
          const { networkScanning, networkScanProgress } = get();
          if (networkScanning && networkScanProgress < 100) {
            set({ networkScanProgress: networkScanProgress + 10 });
            setTimeout(mockProgress, 500);
          } else if (networkScanProgress >= 100) {
            set({ networkScanning: false });
          }
        };
        mockProgress();
      }
    } catch (error) {
      console.error('Failed to start network scan:', error);
      set({ networkScanning: false });
      throw error;
    }
  },

  stopNetworkScan: async () => {
    try {
      if (window.electronAPI?.stopNetworkScan) {
        await window.electronAPI.stopNetworkScan();
        console.log('Network scan stopped successfully');
      }
    } catch (error) {
      console.error('Failed to stop network scan:', error);
      throw error;
    } finally {
      set({ networkScanning: false });
    }
  },

  connectToDevice: async (device: DiscoveredDevice) => {
    const { networkDevices } = get();
    
    // Optimistically update UI
    set({
      networkDevices: networkDevices.map(d => 
        d.id === device.id ? { ...d, status: 'connecting' } : d
      )
    });

    try {
      if (window.electronAPI?.connectToDevice) {
        const success = await window.electronAPI.connectToDevice(device);
        console.log(`Device connection ${success ? 'successful' : 'failed'}:`, device.name);
        
        set({
          networkDevices: networkDevices.map(d => 
            d.id === device.id ? { 
              ...d, 
              status: success ? 'connected' : 'failed' 
            } : d
          )
        });
        
        if (!success) {
          throw new Error(`Failed to connect to ${device.name}`);
        }
      } else {
        console.warn('Electron API not available - simulating connection');
        // Mock successful connection for development
        setTimeout(() => {
          set({
            networkDevices: networkDevices.map(d => 
              d.id === device.id ? { ...d, status: 'connected' } : d
            )
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to connect to device:', error);
      set({
        networkDevices: networkDevices.map(d => 
          d.id === device.id ? { ...d, status: 'failed' } : d
        )
      });
      throw error;
    }
  },

  refreshNetworkDevices: async () => {
    try {
      if (window.electronAPI?.getDiscoveryState) {
        const state = await window.electronAPI.getDiscoveryState();
        console.log('Network devices refreshed:', state.discoveredDevices?.length || 0, 'devices');
        
        set({
          networkDevices: state.discoveredDevices || [],
          networkScanning: state.scanning || false,
          networkScanProgress: state.scanProgress || 0,
          networkLastScan: state.lastScan ? new Date(state.lastScan) : null
        });
      } else {
        console.warn('Electron API not available - using mock data');
        // Mock data for development
        const mockDevices: DiscoveredDevice[] = [
          {
            id: '1',
            name: 'Local Ollama',
            host: 'localhost',
            port: 11434,
            type: 'ollama',
            status: 'discovered'
          },
          {
            id: '2',
            name: 'LM Studio',
            host: 'localhost',
            port: 1234,
            type: 'lm-studio',
            status: 'discovered'
          }
        ];
        set({
          networkDevices: mockDevices,
          networkLastScan: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to refresh network devices:', error);
      throw error;
    }
  },

  updateNetworkScanProgress: (progress: number) => {
    set({ networkScanProgress: Math.min(100, Math.max(0, progress)) });
    
    // Auto-stop scanning when complete
    if (progress >= 100) {
      set({ networkScanning: false });
    }
  },

  setNetworkDevices: (devices: DiscoveredDevice[]) => {
    console.log('Setting network devices:', devices.length, 'devices');
    set({ 
      networkDevices: devices, 
      networkLastScan: new Date() 
    });
  }
}));
