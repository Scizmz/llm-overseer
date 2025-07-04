import React, { useState, useEffect } from "react";
import { useStore } from "../store";
import "./Sidebar.css"; // Import the CSS file

// Enhanced Model interface with configuration support
interface Model {
  id: string;
  name: string;
  type: 'cloud' | 'local' | 'network';
  status: 'processing' | 'waiting' | 'ready' | 'idle' | 'disconnected' | 'unconfigured';
  role: string;
  currentTask?: string;
  callsUsed: number;
  callLimit: number;
  resetTime?: string;
  host?: string;
  port?: number;
  apiKey?: string;
  isConfigured: boolean;
  performance?: {
    successRate: number;
    avgResponseTime: number;
    qualityScore: number;
  };
}

// Cloud provider configuration
interface CloudProvider {
  id: string;
  name: string;
  displayName: string;
  defaultRole: string;
  requiresApiKey: boolean;
}

interface SidebarProps {
  onSettings: () => void;
  onModelSelect?: (modelId: string) => void;
  onNetworkDiscovery?: () => void;
  onScanSettings?: () => void;
  onViewChange?: (view: 'chat' | 'network' | 'settings') => void;
  currentView?: 'chat' | 'network' | 'settings';
}

// Default cloud providers (can be extended)
const getCloudProviders = (): CloudProvider[] => [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    displayName: 'ChatGPT',
    defaultRole: 'AI Assistant',
    requiresApiKey: true
  },
  {
    id: 'claude',
    name: 'Claude',
    displayName: 'Claude',
    defaultRole: 'AI Assistant', 
    requiresApiKey: true
  },
  // Additional providers can be added here or loaded from config
  {
    id: 'gemini',
    name: 'Gemini',
    displayName: 'Google Gemini',
    defaultRole: 'AI Assistant',
    requiresApiKey: true
  }
];

export default function Sidebar({ 
  onSettings, 
  onModelSelect, 
  onNetworkDiscovery, 
  onScanSettings, 
  onViewChange,
  currentView = 'chat'
}: SidebarProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [localLLMConfig, setLocalLLMConfig] = useState<any[]>([]);
  const [hideDisconnected, setHideDisconnected] = useState<boolean>(true);
  
  // Use store for network-related state
  const { 
    models, 
    fetchModels,
    networkDevices,
    networkScanning,
    networkLastScan,
    startNetworkScan,
    refreshNetworkDevices
  } = useStore();

  // Load local LLM configuration
  const loadLocalLLMConfig = async () => {
    try {
      // In a real implementation, this would fetch from the model-gateway service
      const response = await fetch('/api/model-gateway/config');
      if (response.ok) {
        const config = await response.json();
        setLocalLLMConfig(config);
      }
    } catch (error) {
      console.error('Failed to load local LLM config:', error);
      // Fallback to example configuration structure
      setLocalLLMConfig([
        {
          host: "192.168.1.247",
          port: 1234,
          type: "lm-studio",
          name: "Server LM Studio"
        },
        {
          host: "localhost",
          port: 1234,
          type: "lm-studio", 
          name: "Local Development LM Studio"
        },
        {
          host: "192.168.0.247",
          port: 11434,
          type: "ollama",
          name: "Server Room Ollama"
        }
      ]);
    }
  };

  // Generate models from various sources
  const generateDynamicModels = (): Model[] => {
    const dynamicModels: Model[] = [];
    
    // 1. Add cloud provider models
    getCloudProviders().forEach(provider => {
      const model: Model = {
        id: `cloud-${provider.id}`,
        name: provider.displayName,
        type: 'cloud',
        status: 'unconfigured', // Default to unconfigured until API key is added
        role: provider.defaultRole,
        callsUsed: 0,
        callLimit: -1,
        isConfigured: false
      };
      dynamicModels.push(model);
    });
    
    // 2. Add models from local LLM config
    localLLMConfig.forEach(config => {
      const model: Model = {
        id: `local-${config.type}-${config.host}-${config.port}`,
        name: config.name || `${config.type.toUpperCase()} ${config.host}:${config.port}`,
        type: 'local',
        status: 'disconnected', // Default to disconnected until proven otherwise
        role: config.type === 'lm-studio' ? 'Local LM Studio' : 'Local Ollama',
        callsUsed: 0,
        callLimit: -1,
        host: config.host,
        port: config.port,
        isConfigured: true
      };
      dynamicModels.push(model);
    });
    
    // 3. Add models from network discovery
    networkDevices.forEach(device => {
      if (device.type === 'ollama' || device.type === 'lm-studio') {
        const model: Model = {
          id: `network-${device.ip}-${device.port}`,
          name: `${device.name || device.type.toUpperCase()} (Discovered)`,
          type: 'network',
          status: device.status === 'online' ? 'idle' : 'disconnected',
          role: `Network ${device.type.toUpperCase()}`,
          callsUsed: 0,
          callLimit: -1,
          host: device.ip,
          port: device.port,
          isConfigured: false // Newly discovered devices need configuration
        };
        dynamicModels.push(model);
      }
    });
    
    // 4. Merge with models from store (orchestrator-provided models)
    models.forEach(storeModel => {
      const existingIndex = dynamicModels.findIndex(m => m.id === storeModel.id);
      if (existingIndex >= 0) {
        // Update existing model with store data
        dynamicModels[existingIndex] = {
          ...dynamicModels[existingIndex],
          ...storeModel,
          isConfigured: true
        };
      } else {
        // Add new model from store
        dynamicModels.push({
          ...storeModel,
          isConfigured: true,
          type: storeModel.type as 'cloud' | 'local' | 'network'
        } as Model);
      }
    });
    
    return dynamicModels;
  };

  const toggleCard = (modelId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(modelId)) {
      newExpanded.delete(modelId);
    } else {
      newExpanded.add(modelId);
    }
    setExpandedCards(newExpanded);
  };

  const getStatusClass = (status: Model['status']) => {
    return `status-${status}`;
  };

  const getStatusText = (status: Model['status']) => {
    switch (status) {
      case 'processing': return 'Processing';
      case 'waiting': return 'Waiting';
      case 'ready': return 'Ready';
      case 'idle': return 'Idle';
      case 'disconnected': return 'Disconnected';
      case 'unconfigured': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  const getTypeIcon = (type: Model['type']) => {
    switch (type) {
      case 'cloud': return '☁️';
      case 'local': return '💻';
      case 'network': return '🌐';
      default: return '🤖';
    }
  };

  const formatLastScan = (lastScan: Date | null) => {
    if (!lastScan) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - lastScan.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const handleQuickScan = async () => {
    try {
      await startNetworkScan();
    } catch (error) {
      console.error('Failed to start network scan:', error);
    }
  };

  const handleConfigureModel = (model: Model) => {
    console.log('Configure model:', model);
    // This would open a configuration modal
  };

  const handleDashboardClick = () => {
    if (onViewChange) {
      onViewChange('chat');
    } else {
      window.location.reload();
    }
  };

  const handleNetworkViewClick = () => {
    if (onViewChange) {
      onViewChange('network');
    } else if (onNetworkDiscovery) {
      onNetworkDiscovery();
    }
  };

  useEffect(() => {
    fetchModels();
    refreshNetworkDevices();
    loadLocalLLMConfig();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchModels();
      if (!networkScanning) {
        refreshNetworkDevices();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchModels, refreshNetworkDevices, networkScanning]);

  // Generate the final list of models to display
  const displayModels = generateDynamicModels().filter(model => {
    if (hideDisconnected) {
      return model.status !== 'disconnected' && model.status !== 'unconfigured';
    }
    return true;
  });

  return (
    <div className="sidebar-container">
      {/* Header */}
      <div className="sidebar-header">
        <h2 className="sidebar-title">Network Dashboard</h2>
      </div>

      {/* Models List */}
      <div className="models-list-container space-y-3">
        {displayModels.map((model) => {
          const isExpanded = expandedCards.has(model.id);
          const isUnconfigured = !model.isConfigured || model.status === 'unconfigured';

          return (
            <div
              key={model.id}
              className="model-card"
              onClick={() => toggleCard(model.id)}
            >
              {/* Card Header */}
              <div className="model-card__header">
                <div className="model-card__content">
                  <div className="model-card__info">
                    <div className="model-card__icon">{getTypeIcon(model.type)}</div>
                    <div className="model-card__details">
                      <h3>{model.name}</h3>
                      <div className="model-card__status-row">
                        <div className={`model-card__status-dot ${getStatusClass(model.status)}`} />
                        <span className="model-card__status-text">{getStatusText(model.status)}</span>
                      </div>
                      <p className="model-card__role">Role: {model.role}</p>
                    </div>
                  </div>
                  
                  {isUnconfigured && (
                    <span className="model-card__badge">
                      🔴 Disconnected
                    </span>
                  )}
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="model-card__expanded">
                    <div className="model-card__expanded-content">
                      {/* Configuration Buttons */}
                      <div className="model-card__button-grid">
                        <button
                          className="model-card__button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfigureModel(model);
                          }}
                        >
                          Prompt Settings
                        </button>
                        <button
                          className="model-card__button"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Model Notes for', model.name);
                          }}
                        >
                          Model Notes
                        </button>
                        <button
                          className="model-card__button"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('API Dashboard for', model.name);
                          }}
                        >
                          Api dash
                        </button>
                      </div>

                      {/* Model Details */}
                      {model.host && (
                        <div className="model-card__connection">
                          <span className="model-card__connection-label">Connection:</span> {model.host}:{model.port}
                        </div>
                      )}
                      
                      {model.performance && (
                        <div className="model-card__performance">
                          <h4 className="model-card__performance-title">Performance</h4>
                          <div className="model-card__performance-grid">
                            <div className="model-card__performance-metric">
                              <div className="model-card__performance-value model-card__performance-value--success">{model.performance.successRate}%</div>
                              <div className="model-card__performance-label">Success</div>
                            </div>
                            <div className="model-card__performance-metric">
                              <div className="model-card__performance-value model-card__performance-value--response">{model.performance.avgResponseTime}s</div>
                              <div className="model-card__performance-label">Response</div>
                            </div>
                            <div className="model-card__performance-metric">
                              <div className="model-card__performance-value model-card__performance-value--quality">{model.performance.qualityScore}/10</div>
                              <div className="model-card__performance-label">Quality</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {displayModels.length === 0 && (
          <div className="empty-state">
            <div className="empty-state__icon">🤖</div>
            <p className="empty-state__title">No models available</p>
            <p className="empty-state__description">
              {hideDisconnected ? 'Try unchecking "Hide disconnected" or run a network scan' : 'Run a network scan to discover models'}
            </p>
          </div>
        )}
      </div>

      {/* Network Scan Card - Anchored to bottom */}
      <div className="network-scan-container">
        <div className="network-scan-card">
          <div className="network-scan-card__content">
            <div className="network-scan-card__header">
              <h3 className="network-scan-card__title">Network Scan</h3>
            </div>
            
            {/* Button Row with Scan Button and Settings */}
            <div className="network-scan-card__button-row">
              <button
                className={`network-scan-card__scan-btn ${
                  networkScanning 
                    ? 'network-scan-card__scan-btn--scanning' 
                    : 'network-scan-card__scan-btn--active'
                }`}
                onClick={handleQuickScan}
                disabled={networkScanning}
              >
                {networkScanning ? 'Scanning...' : 'Scan'}
              </button>
              
              <button
                className="network-scan-card__settings-btn"
                onClick={onScanSettings}
                title="Scan Settings"
              >
                ⚙️
              </button>
            </div>

            {/* Hide Disconnected Toggle */}
            <div className="network-scan-card__toggle-container">
              <label className="network-scan-card__toggle-label">
                <input
                  type="checkbox"
                  checked={hideDisconnected}
                  onChange={(e) => setHideDisconnected(e.target.checked)}
                  className="network-scan-card__toggle-input"
                />
                <span className="network-scan-card__toggle-text">Hide disconnected models</span>
              </label>
            </div>

            {/* Status Info */}
            <div className="network-scan-card__status space-y-1">
              <div>Connections Available: 3</div>
              <div>Active Models: {displayModels.filter(m => m.status === 'ready' || m.status === 'idle').length}</div>
              <div>Orchestrator: Online</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
