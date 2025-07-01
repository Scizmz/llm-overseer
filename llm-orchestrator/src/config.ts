export const API_CONFIG = {
  orchestratorUrl: 'http://localhost:3000',
  modelGatewayUrl: 'http://localhost:3001',
  stateManagerUrl: 'http://localhost:3002',
  websocketUrl: 'ws://localhost:3000',
  discoveryServiceUrl: 'http://localhost:3003'
};

export const NETWORK_DISCOVERY_CONFIG = {
  defaultScanTimeout: 2000,
  defaultConcurrency: 50,
  defaultRetries: 1,
  autoScanInterval: 300000, // 5 minutes
  maxScanHistory: 100
};

export const ELECTRON_CHANNELS = {
  // Network Discovery
  DISCOVERY_START_SCAN: 'discovery:start-scan',
  DISCOVERY_STOP_SCAN: 'discovery:stop-scan',
  DISCOVERY_GET_STATE: 'discovery:get-state',
  DISCOVERY_UPDATE: 'discovery:update',
  
  // Device Management
  DEVICE_CONNECT: 'device:connect',
  DEVICE_DISCONNECT: 'device:disconnect',
  DEVICE_ADD_TO_CONFIG: 'device:add-to-config',
  DEVICE_REMOVE_FROM_CONFIG: 'device:remove-from-config',
  
  // Configuration
  CONFIG_GET_SCAN: 'config:get-scan',
  CONFIG_SAVE_SCAN: 'config:save-scan',
  CONFIG_GET_NETWORK: 'config:get-network',
  CONFIG_SAVE_NETWORK: 'config:save-network',
  CONFIG_EXPORT: 'config:export',
  CONFIG_IMPORT: 'config:import',
  
  // LLM
  LLM_INVOKE: 'invoke-llm'
};
