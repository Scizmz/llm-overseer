import React, { useState, useEffect } from "react";
import { useStore } from "../store";

// Enhanced Model interface for native UI
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

interface SidebarProps {
  onSettings: () => void;
  onModelSelect?: (modelId: string) => void;
  onNetworkDiscovery?: () => void;
  onScanSettings?: () => void;
  onViewChange?: (view: 'chat' | 'network' | 'settings') => void;
  currentView?: 'chat' | 'network' | 'settings';
}

// Enhanced mock data with better visual properties
const mockModels: Model[] = [
  {
    id: 'chatgpt-1',
    name: 'CHAT-GPT',
    type: 'cloud',
    status: 'disconnected',
    role: 'General Assistant',
    callsUsed: 0,
    callLimit: 100,
    resetTime: '24h',
    performance: {
      successRate: 98,
      avgResponseTime: 2.1,
      qualityScore: 9.4
    }
  },
  {
    id: 'claude-1',
    name: 'CLAUDE',
    type: 'cloud',
    status: 'ready',
    role: 'Researcher',
    currentTask: 'Processing Assignment: Test driven coding',
    callsUsed: 45,
    callLimit: 100,
    resetTime: '2h 15m',
    performance: {
      successRate: 96,
      avgResponseTime: 1.8,
      qualityScore: 9.2
    }
  },
  {
    id: 'gemini-1',
    name: 'Google Gemini',
    type: 'cloud',
    status: 'idle',
    role: 'Coder',
    callsUsed: 12,
    callLimit: 50,
    performance: {
      successRate: 94,
      avgResponseTime: 2.7,
      qualityScore: 8.8
    }
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
  const [connectionStats, setConnectionStats] = useState({
    available: 3,
    active: 2,
    orchestrator: 'Online'
  });
  
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
      case 'processing': return '#ff6b6b';
      case 'waiting': return '#ffa726';
      case 'ready': return '#4caf50';
      case 'idle': return '#42a5f5';
      case 'disconnected': return '#666';
      default: return '#999';
    }
  };

  const getStatusIcon = (status: Model['status']) => {
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
    const hasDisconnectedModels = displayModels.some(m => m.status === 'disconnected');
    if (hasDisconnectedModels) return '#ff6b6b';
    if (networkScanning) return '#ffa726';
    return '#4caf50';
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0;
    return Math.min((used / limit) * 100, 100);
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

  const handleViewChange = (view: 'chat' | 'network' | 'settings') => {
    if (onViewChange) {
      onViewChange(view);
    }
  };

  useEffect(() => {
    fetchModels();
    refreshNetworkDevices();
    
    const interval = setInterval(() => {
      fetchModels();
      if (!networkScanning) {
        refreshNetworkDevices();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchModels, refreshNetworkDevices, networkScanning]);

  // Use store models if available, fallback to mock for development
  const displayModels = models.length > 0 ? 
    models.map(model => ({
      ...model,
      type: model.type as 'cloud' | 'local',
      status: model.status as Model['status'],
      role: 'Assistant',
      callsUsed: 0,
      callLimit: -1,
      performance: {
        successRate: 95,
        avgResponseTime: 1.5,
        qualityScore: 8.5
      }
    })) : mockModels;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#1e1e1e',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      
      {/* Network Dashboard Header */}
      <div style={{
        padding: '16px 12px',
        borderBottom: '1px solid #333'
      }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: '600',
          margin: '0 0 12px 0',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          Network Dashboard
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: getHealthIndicator(),
            marginLeft: 'auto'
          }} />
        </h2>
        
        {/* Connection Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '8px',
          fontSize: '10px',
          color: '#ccc'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#4caf50', fontWeight: '600' }}>{connectionStats.available}</div>
            <div>Available</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#42a5f5', fontWeight: '600' }}>{connectionStats.active}</div>
            <div>Active</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: getHealthIndicator(), fontWeight: '600' }}>•</div>
            <div>Online</div>
          </div>
        </div>
      </div>

      {/* Models List */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '12px'
      }}>
        {displayModels.map((model) => {
          const isExpanded = expandedCards.has(model.id);
          const usagePercent = getUsagePercentage(model.callsUsed, model.callLimit);
          
          return (
            <div
              key={model.id}
              style={{
                backgroundColor: '#2a2a2a',
                borderRadius: '8px',
                marginBottom: '8px',
                border: '1px solid #404040',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2e2e2e';
                e.currentTarget.style.borderColor = '#555';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#2a2a2a';
                e.currentTarget.style.borderColor = '#404040';
              }}
            >
              {/* Model Header */}
              <div
                style={{
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onClick={() => toggleCard(model.id)}
              >
                {/* Status Indicator */}
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: getStatusColor(model.status),
                  flexShrink: 0
                }} />
                
                {/* Model Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#fff',
                    marginBottom: '2px'
                  }}>
                    {model.name}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#888',
                    textTransform: 'capitalize'
                  }}>
                    {model.status === 'ready' ? 'Connected: Thinking' : 
                     model.status === 'disconnected' ? 'Disconnected' :
                     model.status === 'idle' ? 'Connected: Idle' :
                     model.status}
                  </div>
                  {model.role && (
                    <div style={{
                      fontSize: '9px',
                      color: '#666',
                      marginTop: '2px'
                    }}>
                      Role: {model.role}
                    </div>
                  )}
                </div>

                {/* Expand Arrow */}
                <div style={{
                  fontSize: '10px',
                  color: '#666',
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }}>
                  ▼
                </div>
              </div>

              {/* Usage Bar (if applicable) */}
              {model.callLimit > 0 && (
                <div style={{
                  paddingLeft: '12px',
                  paddingRight: '12px',
                  paddingBottom: isExpanded ? '8px' : '12px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '9px',
                    color: '#888',
                    marginBottom: '4px'
                  }}>
                    <span>{model.callsUsed} calls</span>
                    <span>{model.resetTime}</span>
                  </div>
                  <div style={{
                    height: '2px',
                    backgroundColor: '#404040',
                    borderRadius: '1px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      backgroundColor: usagePercent > 80 ? '#ff6b6b' : 
                                      usagePercent > 60 ? '#ffa726' : '#4caf50',
                      width: `${usagePercent}%`,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              )}

              {/* Expanded Content */}
              {isExpanded && (
                <div style={{
                  padding: '0 12px 12px 12px',
                  borderTop: '1px solid #404040',
                  marginTop: '8px',
                  paddingTop: '12px'
                }}>
                  {/* Current Task */}
                  {model.currentTask && (
                    <div style={{
                      backgroundColor: '#333',
                      padding: '8px',
                      borderRadius: '4px',
                      marginBottom: '8px'
                    }}>
                      <div style={{
                        fontSize: '9px',
                        color: '#888',
                        marginBottom: '4px'
                      }}>
                        Current Task:
                      </div>
                      <div style={{
                        fontSize: '10px',
                        color: '#fff'
                      }}>
                        {model.currentTask}
                      </div>
                    </div>
                  )}

                  {/* Performance Metrics */}
                  {model.performance && (
                    <div style={{
                      backgroundColor: '#333',
                      padding: '8px',
                      borderRadius: '4px',
                      marginBottom: '8px'
                    }}>
                      <div style={{
                        fontSize: '9px',
                        color: '#888',
                        marginBottom: '4px'
                      }}>
                        Performance:
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '4px',
                        fontSize: '9px',
                        color: '#fff'
                      }}>
                        <span>Success: {model.performance.successRate}%</span>
                        <span>Avg: {model.performance.avgResponseTime}s</span>
                        <span>Quality: {model.performance.qualityScore}/10</span>
                        <span>Type: {model.type}</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '4px'
                  }}>
                    <button style={{
                      backgroundColor: '#404040',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 4px',
                      color: '#fff',
                      fontSize: '9px',
                      cursor: 'pointer'
                    }}>
                      Prompt Settings
                    </button>
                    <button style={{
                      backgroundColor: '#404040',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 4px',
                      color: '#fff',
                      fontSize: '9px',
                      cursor: 'pointer'
                    }}>
                      Model Notes
                    </button>
                    <button style={{
                      backgroundColor: '#404040',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 4px',
                      color: '#fff',
                      fontSize: '9px',
                      cursor: 'pointer'
                    }}>
                      API dash
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Network Scan Controls */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid #333'
      }}>
        <div style={{
          backgroundColor: '#2a2a2a',
          borderRadius: '8px',
          padding: '12px',
          border: '1px solid #404040'
        }}>
          <div style={{
            fontSize: '11px',
            color: '#ccc',
            marginBottom: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>Connections Available: {connectionStats.available}</span>
            <span style={{ color: '#888' }}>
              Last scan: {formatLastScan(networkLastScan)}
            </span>
          </div>
          
          <button
            onClick={handleQuickScan}
            disabled={networkScanning}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: networkScanning ? '#555' : '#007acc',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '11px',
              cursor: networkScanning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {networkScanning ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite' }}>⟳</span>
                Scanning...
              </>
            ) : (
              <>
                <span>🔍</span>
                Network Scan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Status */}
      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid #333',
        fontSize: '9px',
        color: '#666',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>Orchestrator: {connectionStats.orchestrator}</span>
        <span>{new Date().toLocaleTimeString()}</span>
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
