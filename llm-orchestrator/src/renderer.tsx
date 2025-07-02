import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import websocketService from "./services/websocket";
import ChatPanel from "./components/ChatPanel";
import SettingsPanel from "./components/SettingsPanel";
import NetworkScanSettingsModal from "./components/NetworkScanSettingsModal";
import { NetworkScanConfig } from "./types/network-discovery";
import { useStore } from "./store";

// Modern Card Component
function ModelCard({ model, isExpanded, onToggle, onSelect }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return '#28a745';
      case 'thinking': return '#ffc107';
      case 'idle': return '#6c757d';
      case 'disconnected': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return (
    <div
      onClick={onToggle}
      style={{
        backgroundColor: '#2d2d2d',
        borderRadius: '12px',
        border: '1px solid #404040',
        margin: '6px 0',
        padding: '12px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        userSelect: 'none'
      }}
      onMouseEnter={(e) => {
        e.target.style.backgroundColor = '#3a3a3a';
        e.target.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.target.style.backgroundColor = '#2d2d2d';
        e.target.style.transform = 'translateY(0)';
      }}
    >
      {/* Card Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: getStatusColor(model.status)
          }}
        />
        <div style={{ flex: 1 }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '14px', 
            fontWeight: '600',
            color: '#ffffff'
          }}>
            {model.name}
          </h3>
          {model.status && (
            <p style={{ 
              margin: '2px 0 0 0', 
              fontSize: '11px', 
              color: '#888',
              textTransform: 'capitalize'
            }}>
              {model.status}
            </p>
          )}
        </div>
        <div style={{ 
          fontSize: '10px', 
          color: '#666',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s ease'
        }}>
          ▼
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #404040',
          animation: 'slideDown 0.3s ease'
        }}>
          {model.role && (
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#888', fontSize: '11px' }}>Role: </span>
              <span style={{ color: '#fff', fontSize: '11px' }}>{model.role}</span>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <button style={{
              backgroundColor: '#404040',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 8px',
              color: '#fff',
              fontSize: '10px',
              cursor: 'pointer'
            }}>
              Prompt Settings
            </button>
            <button style={{
              backgroundColor: '#404040',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 8px',
              color: '#fff',
              fontSize: '10px',
              cursor: 'pointer'
            }}>
              Model Notes
            </button>
            <button style={{
              backgroundColor: '#404040',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 8px',
              color: '#fff',
              fontSize: '10px',
              cursor: 'pointer'
            }}>
              API Dash
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scanSettingsOpen, setScanSettingsOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>();
  const [systemStatus, setSystemStatus] = useState("Initializing...");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Use store for network functionality
  const { 
    networkDevices, 
    networkScanning, 
    startNetworkScan, 
    refreshNetworkDevices 
  } = useStore();

  // Mock models for the design
  const models = [
    {
      id: 'chat-gpt',
      name: 'CHAT-GPT',
      status: 'disconnected',
      role: 'Researcher'
    },
    {
      id: 'claude',
      name: 'CLAUDE', 
      status: 'thinking',
      role: 'Researcher'
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      status: 'idle',
      role: 'Assistant'
    }
  ];

  useEffect(() => {
    websocketService.connect();
    setSystemStatus("Ready - All systems operational");
    
    // Load initial network state
    refreshNetworkDevices();
    
    return () => {
      websocketService.disconnect();
    };
  }, [refreshNetworkDevices]);

  const handleCardToggle = (modelId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(modelId)) {
      newExpanded.delete(modelId);
    } else {
      newExpanded.add(modelId);
    }
    setExpandedCards(newExpanded);
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    setSystemStatus(`Selected model: ${modelId}`);
  };

  const handleNetworkScan = async () => {
    try {
      setSystemStatus("Starting network scan...");
      await startNetworkScan();
    } catch (error) {
      console.error('Failed to start network scan:', error);
      setSystemStatus("Network scan failed");
    }
  };

  const handleSaveScanConfig = async (config: NetworkScanConfig) => {
    try {
      if (window.electronAPI?.saveScanConfig) {
        await window.electronAPI.saveScanConfig(config);
        setSystemStatus("Network scan configuration updated");
        console.log('Scan configuration saved successfully');
      } else {
        console.log('Saving scan configuration:', config);
        setSystemStatus("Scan configuration saved (development mode)");
      }
    } catch (error) {
      console.error('Failed to save scan configuration:', error);
      setSystemStatus("Failed to save scan configuration");
      throw error;
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#1a1a1a',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      overflow: 'hidden'
    }}>
      
      {/* Main Content - Now takes full height with native frame */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        minHeight: 0
      }}>
        
        {/* Left Panel - Network Dashboard */}
        <div style={{
          width: '260px',
          backgroundColor: '#1a1a1a',
          padding: '16px 12px',
          overflow: 'auto',
          flexShrink: 0,
          borderRight: '1px solid #333'
        }}>
          <h2 style={{ 
            margin: '0 0 16px 0', 
            fontSize: '16px', 
            fontWeight: '600' 
          }}>
            Network Dashboard
          </h2>
          
          {/* Model Cards */}
          <div style={{ marginBottom: '16px' }}>
            {models.map(model => (
              <ModelCard
                key={model.id}
                model={model}
                isExpanded={expandedCards.has(model.id)}
                onToggle={() => handleCardToggle(model.id)}
                onSelect={() => handleModelSelect(model.id)}
              />
            ))}
          </div>
          
          {/* Connection Stats */}
          <div style={{
            padding: '12px',
            backgroundColor: '#2d2d2d',
            borderRadius: '12px',
            border: '1px solid #404040',
            marginBottom: '12px'
          }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
              Connections Available: <span style={{ color: '#28a745' }}>{networkDevices.length}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
              Active Models: <span style={{ color: '#ffc107' }}>
                {networkDevices.filter(d => d.status === 'connected').length}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#888' }}>
              Orchestrator: <span style={{ color: '#28a745' }}>Online</span>
            </div>
          </div>
          
          {/* Network Scan Button */}
          <button 
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: networkScanning ? '#6c757d' : '#404040',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '12px',
              fontWeight: '500',
              cursor: networkScanning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              opacity: networkScanning ? 0.7 : 1
            }}
            onClick={handleNetworkScan}
            disabled={networkScanning}
          >
            {networkScanning ? 'Scanning... 🔄' : 'Network Scan ⚙️'}
          </button>

          {/* Settings Button */}
          <button 
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: 'transparent',
              border: '1px solid #404040',
              borderRadius: '8px',
              color: '#888',
              fontSize: '11px',
              fontWeight: '400',
              cursor: 'pointer',
              marginTop: '8px'
            }}
            onClick={() => setScanSettingsOpen(true)}
          >
            Scan Settings
          </button>
        </div>
        
        {/* Right Panel - Chat Area */}
        <div style={{
          flex: 1,
          backgroundColor: '#1a1a1a',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0
        }}>
          <ChatPanel 
            currentProject={{
              id: '1',
              name: 'LLM Orchestrator Development',
              phase: 'Development',
              lastCheckpoint: new Date()
            }}
            orchestratorStatus="primary"
          />
        </div>
      </div>

      {/* Modals */}
      {settingsOpen && (
        <SettingsPanel onClose={() => setSettingsOpen(false)} />
      )}

      {scanSettingsOpen && (
        <NetworkScanSettingsModal
          onClose={() => setScanSettingsOpen(false)}
          onSave={handleSaveScanConfig}
        />
      )}
    </div>
  );
}

// Add CSS animation for smooth card expansion
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  /* Ensure no scrollbars on body */
  body {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
  
  /* Hide scrollbars but allow scrolling in sidebar */
  div::-webkit-scrollbar {
    width: 4px;
  }
  
  div::-webkit-scrollbar-track {
    background: transparent;
  }
  
  div::-webkit-scrollbar-thumb {
    background: #404040;
    border-radius: 2px;
  }
  
  div::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;
document.head.appendChild(style);

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
} else {
  console.error("Root element not found");
}
