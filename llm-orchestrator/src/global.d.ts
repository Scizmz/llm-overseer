import { NetworkScanConfig, NetworkDiscoveryState, DiscoveredDevice } from './types/network-discovery';

export {};

declare global {
  interface Window {
    api: {
      invokeLLM: (prompt: string) => Promise<string>;
    };
    electronAPI: {
      // Network Discovery
      startNetworkScan: () => Promise<void>;
      stopNetworkScan: () => Promise<void>;
      getDiscoveryState: () => Promise<NetworkDiscoveryState>;
      onNetworkDiscoveryUpdate: (callback: (data: Partial<NetworkDiscoveryState>) => void) => () => void;
      
      // Device Management
      connectToDevice: (device: DiscoveredDevice) => Promise<boolean>;
      disconnectFromDevice: (deviceId: string) => Promise<void>;
      addDeviceToConfig: (device: DiscoveredDevice) => Promise<void>;
      removeDeviceFromConfig: (deviceId: string) => Promise<void>;
      
      // Scan Configuration
      getScanConfig: () => Promise<NetworkScanConfig>;
      saveScanConfig: (config: NetworkScanConfig) => Promise<void>;
      
      // Configuration Management
      getNetworkConfig: () => Promise<any>;
      updateNetworkConfig: (config: any) => Promise<void>;
      exportConfig: () => Promise<string>;
      importConfig: (configPath: string) => Promise<void>;
    };
  }
}
