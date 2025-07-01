export interface DiscoveredDevice {
  id: string;
  name: string;
  host: string;
  port: number;
  type: 'ollama' | 'lm-studio';
  status: 'discovered' | 'connecting' | 'connected' | 'failed';
  models?: string[];
  version?: string;
}

export interface NetworkDiscoveryState {
  scanning: boolean;
  scanProgress: number;
  lastScan: Date | null;
  discoveredDevices: DiscoveredDevice[];
  newDevicesCount: number;
  scanEnabled: boolean;
}

export interface ScanRange {
  name: string;
  type: 'auto' | 'subnet';
  subnet?: string;
  startIP?: number;
  endIP?: number;
  enabled: boolean;
}

export interface CustomIP {
  name: string;
  ip: string;
  enabled: boolean;
}

export interface ServicePorts {
  ollama: string[];
  lmStudio: string[];
}

export interface ScanSettings {
  enabled: boolean;
  timeout: number;
  concurrency: number;
  retries: number;
}

export interface NetworkScanConfig {
  scanSettings: ScanSettings;
  scanRanges: ScanRange[];
  customIPs: CustomIP[];
  servicePorts: ServicePorts;
  excludeIPs: string[];
}
