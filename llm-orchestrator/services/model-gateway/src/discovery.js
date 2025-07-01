require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { networkInterfaces } = require('os');
const EventEmitter = require('events');
const LMStudioAdapter = require('./adapters/lm-studio-adapter');
const OllamaAdapter = require('./adapters/ollama-adapter');

const configPath = process.env.LOCAL_LLM_CONFIG || './local-llm-config.json';
const scanConfigPath = process.env.NETWORK_SCAN_CONFIG || './network-scan-config.json';
const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://orchestrator:3000';

const adapters = [];
let scanConfig = null;

/**
 * Load network scan configuration
 */
async function loadScanConfig() {
  try {
    const configExists = await fs.access(path.resolve(scanConfigPath)).then(() => true).catch(() => false);
    
    if (!configExists) {
      console.log(`Network scan config not found at ${scanConfigPath}. Creating default config.`);
      await createDefaultScanConfig();
    }

    const file = await fs.readFile(path.resolve(scanConfigPath), 'utf8');
    scanConfig = JSON.parse(file);
    console.log('Network scan configuration loaded');
    
  } catch (error) {
    console.error('Error loading scan config:', error.message);
    scanConfig = getDefaultScanConfig();
  }
}

/**
 * Create default network scan configuration file
 */
async function createDefaultScanConfig() {
  const defaultConfig = getDefaultScanConfig();
  
  try {
    await fs.writeFile(path.resolve(scanConfigPath), JSON.stringify(defaultConfig, null, 2));
    console.log(`Created default network scan config at ${scanConfigPath}`);
  } catch (error) {
    console.error('Failed to create default scan config:', error.message);
  }
}

/**
 * Get default network scan configuration
 */
function getDefaultScanConfig() {
  return {
    scanSettings: {
      enabled: false,
      timeout: 2000,
      concurrency: 50,
      retries: 1
    },
    scanRanges: [
      {
        name: "Local Subnet (Auto)",
        type: "auto",
        enabled: true
      }
    ],
    customIPs: [],
    servicePorts: {
      ollama: ["11434"],
      lmStudio: ["1234"]
    },
    excludeIPs: []
  };
}

/**
 * Save network scan configuration
 */
async function saveScanConfig(newConfig) {
  try {
    scanConfig = newConfig;
    await fs.writeFile(path.resolve(scanConfigPath), JSON.stringify(newConfig, null, 2));
    console.log('Network scan configuration saved');
    return true;
  } catch (error) {
    console.error('Failed to save scan config:', error.message);
    throw error;
  }
}

/**
 * Get current scan configuration
 */
function getScanConfig() {
  return scanConfig;
}
async function loadConfiguredInstances() {
  try {
    const configExists = await fs.access(path.resolve(configPath)).then(() => true).catch(() => false);
    
    if (!configExists) {
      console.log(`Config file not found at ${configPath}. Skipping configured instances.`);
      return;
    }

    const file = await fs.readFile(path.resolve(configPath), 'utf8');
    const instances = JSON.parse(file);
    
    if (!Array.isArray(instances)) {
      console.error('Config file must contain an array of instances');
      return;
    }

    console.log(`Loading ${instances.length} configured instances...`);

    for (const instance of instances) {
      try {
        await createAndConnectAdapter(instance);
      } catch (error) {
        console.error(`Failed to connect to ${instance.name || instance.host}:${instance.port}:`, error.message);
      }
    }
  } catch (err) {
    console.error('Error loading config:', err.message);
  }
}

/**
 * Create and connect adapter based on instance configuration
 */
async function createAndConnectAdapter(instance) {
  // Validate required fields
  if (!instance.host || !instance.port) {
    throw new Error('Instance must have host and port defined');
  }

  // Default to ollama if type not specified
  const type = instance.type || 'ollama';
  const url = `http://${instance.host}:${instance.port}`;
  const name = instance.name || `${type}-${instance.host}:${instance.port}`;

  let adapter;
  
  if (type === 'lm-studio') {
    adapter = new LMStudioAdapter(orchestratorUrl, url, name);
  } else if (type === 'ollama') {
    adapter = new OllamaAdapter(orchestratorUrl, url, name);
  } else {
    throw new Error(`Unknown LLM instance type: ${type}`);
  }

  adapters.push(adapter);
  await adapter.connect();
  console.log(`Successfully connected to ${name} at ${url}`);
}

/**
 * Load and connect to instances defined in config file
 */
async function loadConfiguredInstances() {
  try {
    const configExists = await fs.access(path.resolve(configPath)).then(() => true).catch(() => false);
    
    if (!configExists) {
      console.log(`Config file not found at ${configPath}. Skipping configured instances.`);
      return;
    }

    const file = await fs.readFile(path.resolve(configPath), 'utf8');
    const instances = JSON.parse(file);
    
    if (!Array.isArray(instances)) {
      console.error('Config file must contain an array of instances');
      return;
    }

    console.log(`Loading ${instances.length} configured instances...`);

    for (const instance of instances) {
      try {
        await createAndConnectAdapter(instance);
      } catch (error) {
        console.error(`Failed to connect to ${instance.name || instance.host}:${instance.port}:`, error.message);
      }
    }
  } catch (err) {
    console.error('Error loading config:', err.message);
  }
}

/**
 * Create and connect adapter based on instance configuration
 */
async function createAndConnectAdapter(instance) {
  // Validate required fields
  if (!instance.host || !instance.port) {
    throw new Error('Instance must have host and port defined');
  }

  // Default to ollama if type not specified
  const type = instance.type || 'ollama';
  const url = `http://${instance.host}:${instance.port}`;
  const name = instance.name || `${type}-${instance.host}:${instance.port}`;

  let adapter;
  
  if (type === 'lm-studio') {
    adapter = new LMStudioAdapter(orchestratorUrl, url, name);
  } else if (type === 'ollama') {
    adapter = new OllamaAdapter(orchestratorUrl, url, name);
  } else {
    throw new Error(`Unknown LLM instance type: ${type}`);
  }

  adapters.push(adapter);
  await adapter.connect();
  console.log(`Successfully connected to ${name} at ${url}`);
}

/**
 * Discovery Manager Class
 */
class DiscoveryManager extends EventEmitter {
  constructor() {
    super();
    this.discoveredDevices = new Map();
    this.scanning = false;
    this.lastScan = null;
    this.scanProgress = 0;
  }

  async startNetworkScan(options = {}) {
    if (!scanConfig || !scanConfig.scanSettings.enabled) {
      throw new Error('Network scanning is disabled. Enable it in scan settings.');
    }

    if (this.scanning) {
      console.log('Scan already in progress');
      return;
    }

    this.scanning = true;
    this.scanProgress = 0;
    this.emit('scanStarted');
    
    try {
      console.log('Starting network discovery scan...');
      
      const foundDevices = await this.performNetworkDiscovery(options);
      
      // Update discovered devices
      for (const device of foundDevices) {
        this.discoveredDevices.set(device.id, device);
      }
      
      this.lastScan = new Date();
      this.scanProgress = 100;
      this.emit('scanCompleted', {
        devices: Array.from(this.discoveredDevices.values()),
        scanTime: this.lastScan
      });
      
    } catch (error) {
      console.error('Network scan failed:', error);
      this.emit('scanError', error);
    } finally {
      this.scanning = false;
    }
  }

  async performNetworkDiscovery(options) {
    const foundDevices = [];
    const totalTargets = this.calculateTotalTargets();
    let completedTargets = 0;

    // Scan enabled ranges
    for (const range of scanConfig.scanRanges.filter(r => r.enabled)) {
      const targets = await this.generateTargetsFromRange(range);
      
      for (const target of targets) {
        const devices = await this.scanTarget(target);
        foundDevices.push(...devices);
        
        completedTargets++;
        this.scanProgress = Math.round((completedTargets / totalTargets) * 100);
        this.emit('scanProgress', this.scanProgress);
      }
    }

    // Scan custom IPs
    for (const customIP of scanConfig.customIPs.filter(ip => ip.enabled)) {
      const devices = await this.scanIP(customIP.ip);
      foundDevices.push(...devices);
      
      completedTargets++;
      this.scanProgress = Math.round((completedTargets / totalTargets) * 100);
      this.emit('scanProgress', this.scanProgress);
    }
    
    return foundDevices;
  }

  calculateTotalTargets() {
    let total = 0;
    
    // Count range targets
    for (const range of scanConfig.scanRanges.filter(r => r.enabled)) {
      if (range.type === 'auto') {
        total += 254; // Assume /24 subnet
      } else if (range.type === 'subnet') {
        total += (range.endIP - range.startIP + 1);
      }
    }
    
    // Count custom IPs
    total += scanConfig.customIPs.filter(ip => ip.enabled).length;
    
    return total;
  }

  async generateTargetsFromRange(range) {
    const targets = [];
    
    if (range.type === 'auto') {
      // Auto-detect local subnets
      const interfaces = networkInterfaces();
      for (const [name, nets] of Object.entries(interfaces)) {
        for (const net of nets) {
          if (net.family === 'IPv4' && !net.internal) {
            const subnet = net.address.split('.').slice(0, 3).join('.');
            for (let i = 1; i <= 254; i++) {
              const ip = `${subnet}.${i}`;
              if (!scanConfig.excludeIPs.includes(ip)) {
                targets.push(ip);
              }
            }
          }
        }
      }
    } else if (range.type === 'subnet') {
      for (let i = range.startIP; i <= range.endIP; i++) {
        const ip = `${range.subnet}.${i}`;
        if (!scanConfig.excludeIPs.includes(ip)) {
          targets.push(ip);
        }
      }
    }
    
    return targets;
  }

  async scanTarget(ip) {
    const devices = [];
    const promises = [];
    
    // Scan all configured service ports
    for (const [serviceType, ports] of Object.entries(scanConfig.servicePorts)) {
      for (const port of ports) {
        promises.push(this.testServiceAtIP(ip, parseInt(port), serviceType));
      }
    }
    
    const results = await Promise.allSettled(promises);
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        devices.push(result.value);
      }
    }
    
    return devices;
  }

  async scanIP(ip) {
    return this.scanTarget(ip);
  }

  async testServiceAtIP(ip, port, serviceType) {
    try {
      const url = `http://${ip}:${port}`;
      const timeout = scanConfig.scanSettings.timeout || 2000;
      
      if (serviceType === 'ollama') {
        const response = await axios.get(`${url}/api/version`, { timeout });
        return {
          id: `${ip}-${port}-ollama`,
          name: `Ollama at ${ip}`,
          host: ip,
          port: port,
          type: 'ollama',
          status: 'discovered',
          url: url,
          version: response.data.version || 'unknown'
        };
      } else if (serviceType === 'lmStudio') {
        const response = await axios.get(`${url}/v1/models`, { timeout });
        return {
          id: `${ip}-${port}-lmstudio`,
          name: `LM Studio at ${ip}`,
          host: ip,
          port: port,
          type: 'lm-studio',
          status: 'discovered',
          url: url,
          models: response.data.data || []
        };
      }
    } catch (error) {
      return null;
    }
  }

  async connectToDiscoveredDevice(deviceId) {
    const device = this.discoveredDevices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    try {
      await createAndConnectAdapter({
        host: device.host,
        port: device.port,
        type: device.type,
        name: device.name
      });
      
      device.status = 'connected';
      this.discoveredDevices.set(deviceId, device);
      this.emit('deviceConnected', device);
      
      return true;
    } catch (error) {
      device.status = 'failed';
      this.discoveredDevices.set(deviceId, device);
      this.emit('deviceConnectionFailed', { device, error });
      throw error;
    }
  }

  async addDeviceToConfig(device) {
    try {
      const configExists = await fs.access(path.resolve(configPath)).then(() => true).catch(() => false);
      let config = [];
      
      if (configExists) {
        const file = await fs.readFile(path.resolve(configPath), 'utf8');
        config = JSON.parse(file);
      }
      
      const exists = config.some(c => c.host === device.host && c.port === device.port);
      if (!exists) {
        config.push({
          host: device.host,
          port: device.port,
          type: device.type,
          name: device.name
        });
        
        await fs.writeFile(path.resolve(configPath), JSON.stringify(config, null, 2));
        console.log(`Added ${device.name} to configuration`);
      }
    } catch (error) {
      console.error('Failed to add device to config:', error);
      throw error;
    }
  }

  getDiscoveryState() {
    return {
      scanning: this.scanning,
      scanProgress: this.scanProgress,
      lastScan: this.lastScan,
      devices: Array.from(this.discoveredDevices.values()),
      connectedCount: adapters.length,
      scanEnabled: scanConfig?.scanSettings?.enabled || false
    };
  }

  stopScan() {
    if (this.scanning) {
      this.scanning = false;
      this.emit('scanStopped');
    }
  }
}

// Create global discovery manager instance
const discoveryManager = new DiscoveryManager();

/**
 * Graceful shutdown handler
 */
async function shutdown() {
  console.log('Shutting down adapters...');
  
  for (const adapter of adapters) {
    try {
      adapter.disconnect();
    } catch (error) {
      console.error('Error disconnecting adapter:', error.message);
    }
  }
  
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Main execution
(async () => {
  try {
    console.log('Starting LLM discovery service...');
    
    // Load scan configuration
    await loadScanConfig();
    
    // Always try to load configured instances first
    await loadConfiguredInstances();
    
    console.log(`LLM discovery service started with ${adapters.length} adapters`);
    
    // Keep the process alive
    setInterval(() => {
      // Optional: Add health check logic here
    }, 30000);
    
  } catch (error) {
    console.error('Failed to start discovery service:', error.message);
    process.exit(1);
  }
})();

// Export for use by orchestrator
module.exports = { 
  discoveryManager,
  adapters,
  loadConfiguredInstances,
  createAndConnectAdapter,
  getScanConfig,
  saveScanConfig,
  loadScanConfig
};
