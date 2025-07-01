import React, { useState, useEffect } from "react";
import { useStore } from "../store";

// Type definitions for models
interface Model {
  id: string;
  name: string;
  type: 'cloud' | 'local';
  status: 'processing' | 'waiting' | 'ready' | 'idle' | 'disconnected';
  role: string;
  currentTask?: string;
  callsUsed: number;
  callLimit: number;
  resetTime?: string;
  performance?: {
    successRate: number;
    avgResponseTime: number;
    qualityScore: number;
  };
}

// Network Discovery types
interface DiscoveredDevice {
  id: string;
  name: string;
  host: string;
  port: number;
  type: 'ollama' | 'lm-studio';
  status: 'discovered' | 'connecting' | 'connected' | 'failed';
  models?: string[];
}

interface NetworkDiscoveryState {
  scanning: boolean;
  lastScan: Date | null;
  discoveredDevices: DiscoveredDevice[];
  newDevicesCount: number;
}

interface SidebarProps {
  onSettings: () => void;
  onModelSelect?: (modelId: string) => void;
  onNetworkDiscovery?: () => void;
  onScanSettings?: () => void;
}

// Mock data for development (since mockModels wasn't defined in your original)
const mockModels: Model[] = [
  {
    id: '1',
    name: 'GPT-4',
    type: 'cloud',
    status: 'ready',
    role: 'Primary Assistant',
    callsUsed: 45,
    callLimit: 100,
    resetTime: '2h 15m',
    performance: {
      successRate: 98,
      avgResponseTime: 2.3,
      qualityScore: 9.2
    }
  },
  {
    id: '2',
    name: 'Local Llama',
    type: 'local',
    status: 'idle',
    role: 'Code Assistant',
    callsUsed: 0,
    callLimit: -1,
    performance: {
      successRate: 85,
      avgResponseTime: 4.1,
      qualityScore: 7.8
    }
  }
];

export default function Sidebar({ onSettings, onModelSelect, onNetworkDiscovery, onScanSettings }: SidebarProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [systemHealth, setSystemHealth] = useState<'healthy' | 'warning' | 'error'>('healthy');
  const [discoveryState, setDiscoveryState] = useState<NetworkDiscoveryState>({
    scanning: false,
    lastScan: null,
    discoveredDevices: [],
    newDevicesCount: 0
  });
  
  const { models, fetchModels } = useStore();

  const toggleCard = (modelId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(modelId)) {
      newExpanded.delete(modelId);
    } else {
      newExpanded.add(modelId);
    }
    setExpandedCards(newExpanded);
  };

  const getStatusColor = (status: Model['status']) => {
    switch (status) {
      case 'processing': return 'bg-red-500';
      case 'waiting': return 'bg-yellow-500';
      case 'ready': return 'bg-green-500';
      case 'idle': return 'bg-blue-500';
      case 'disconnected': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusEmoji = (status: Model['status']) => {
    switch (status) {
      case 'processing': return '🔴';
      case 'waiting': return '🟡';
      case 'ready': return '🟢';
      case 'idle': return '🔵';
      case 'disconnected': return '⚫';
      default: return '⚪';
    }
  };

  const getHealthIndicator = () => {
    switch (systemHealth) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
    }
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return (used / limit) * 100;
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
    setDiscoveryState(prev => ({ ...prev, scanning: true }));
    
    try {
      // This will be implemented when you add the Electron API
      console.log('Starting network scan...');
      // Mock for now
      setTimeout(() => {
        setDiscoveryState(prev => ({ 
          ...prev, 
          scanning: false, 
          lastScan: new Date(),
          discoveredDevices: [
            {
              id: '1',
              name: 'Ollama Server',
              host: '192.168.1.100',
              port: 11434,
              type: 'ollama',
              status: 'discovered'
            }
          ]
        }));
      }, 3000);
    } catch (error) {
      console.error('Failed to start network scan:', error);
      setDiscoveryState(prev => ({ ...prev, scanning: false }));
    }
  };

  useEffect(() => {
    fetchModels();
    // Refresh every 5 seconds
    const interval = setInterval(fetchModels, 5000);
    return () => clearInterval(interval);
  }, [fetchModels]);

  // Use mockModels if models from store are empty (for development)
  const displayModels = models.length > 0 ? models : mockModels;

  return (
    <div className="w-80 bg-gray-50 h-full flex flex-col overflow-hidden border-r border-gray-200">
      {/* Dashboard/Home Button */}
      <div className="p-4 border-b border-gray-200">
        <button
          className="w-full px-4 py-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center justify-center space-x-2 border border-gray-200"
          onClick={() => window.location.reload()} // Reset to default view
        >
          <span className="text-xl">🏠</span>
          <span className="font-medium">Dashboard</span>
          <span className={`w-2 h-2 rounded-full ${getHealthIndicator()} ml-auto`}></span>
        </button>
      </div>

      {/* Network Discovery Card */}
      <div className="px-4 pb-2">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🔍</span>
                <h3 className="font-medium text-gray-900">Network Discovery</h3>
              </div>
              <div className="flex items-center space-x-1">
                {discoveryState.scanning && (
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                )}
                {discoveryState.newDevicesCount > 0 && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    {discoveryState.newDevicesCount} new
                  </span>
                )}
              </div>
            </div>

            {/* Status Line */}
            <div className="text-sm text-gray-600 mb-3">
              <div className="flex justify-between">
                <span>Last scan: {formatLastScan(discoveryState.lastScan)}</span>
                <span>{discoveryState.discoveredDevices.length} devices</span>
              </div>
              {discoveryState.scanning && (
                <div className="text-xs text-blue-600 mt-1">
                  Scanning network...
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
                onClick={handleQuickScan}
                disabled={discoveryState.scanning}
              >
                <span>🔍</span>
                <span>{discoveryState.scanning ? 'Scanning...' : 'Quick Scan'}</span>
              </button>
              <button
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors flex items-center justify-center"
                onClick={onScanSettings}
                title="Scan Settings"
              >
                <span>⚙️</span>
              </button>
              <button
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors flex items-center justify-center space-x-1"
                onClick={onNetworkDiscovery}
              >
                <span>📋</span>
                <span>Manage</span>
              </button>
            </div>

            {/* Recent Discoveries Preview */}
            {discoveryState.discoveredDevices.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500 mb-2">Recent discoveries:</div>
                <div className="space-y-1">
                  {discoveryState.discoveredDevices.slice(0, 2).map((device) => (
                    <div key={device.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${
                          device.status === 'connected' ? 'bg-green-500' :
                          device.status === 'connecting' ? 'bg-yellow-500' :
                          device.status === 'failed' ? 'bg-red-500' :
                          'bg-gray-400'
                        }`}></span>
                        <span className="text-gray-700">{device.name}</span>
                      </div>
                      <span className="text-gray-500">{device.type}</span>
                    </div>
                  ))}
                  {discoveryState.discoveredDevices.length > 2 && (
                    <div className="text-xs text-gray-400 text-center pt-1">
                      +{discoveryState.discoveredDevices.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Model Cards Container */}
      <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-3">
        {displayModels.map((model) => {
          const isExpanded = expandedCards.has(model.id);
          const usagePercent = getUsagePercentage(model.callsUsed, model.callLimit);
          
          return (
            <div
              key={model.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200"
            >
              {/* Card Header (Always Visible) */}
              <div
                className="p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleCard(model.id)}
              >
                <div className="flex items-start space-x-2">
                  <span className="text-lg mt-0.5">{getStatusEmoji(model.status)}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">{model.name}</h3>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {model.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Role: {model.role}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Status: {model.status.charAt(0).toUpperCase() + model.status.slice(1)}
                    </p>
                    
                    {/* Rate Limit Info */}
                    {model.callLimit !== -1 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Calls: {model.callsUsed}/{model.callLimit}</span>
                          {model.resetTime && <span>Reset in: {model.resetTime}</span>}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              usagePercent > 80 ? 'bg-red-500' : 
                              usagePercent > 50 ? 'bg-yellow-500' : 
                              'bg-green-500'
                            }`}
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-100 mt-2 pt-3 text-sm">
                  <div className="space-y-2">
                    {/* Detailed Status */}
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="font-medium text-gray-700 mb-1">Detailed Status:</p>
                      <p className="text-xs text-gray-600">
                        {model.currentTask ? 
                          `Currently ${model.status}: ${model.currentTask}` : 
                          `Model is ${model.status} and available for tasks`
                        }
                      </p>
                    </div>

                    {/* Performance Metrics */}
                    {model.performance && (
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="font-medium text-gray-700 mb-1">Performance:</p>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <span>Success Rate:</span>
                          <span className="text-right">{model.performance.successRate}%</span>
                          <span>Avg Response:</span>
                          <span className="text-right">{model.performance.avgResponseTime}s</span>
                          <span>Quality Score:</span>
                          <span className="text-right">{model.performance.qualityScore}/10</span>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-2 mt-2">
                      <button 
                        className="flex-1 px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onModelSelect?.(model.id);
                        }}
                      >
                        View Details
                      </button>
                      <button className="flex-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200">
                        Configure
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-400 mt-2 text-right">
                    Last Update: {new Date().toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Settings Button (moved to bottom) */}
      <div className="p-4 border-t border-gray-200">
        <button
          className="w-full px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center space-x-2 transition-colors"
          onClick={onSettings}
        >
          <span>⚙️</span>
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}
