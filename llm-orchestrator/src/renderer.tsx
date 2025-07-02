import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import websocketService from "./services/websocket";
import ChatPanel from "./components/ChatPanel";
import SettingsPanel from "./components/SettingsPanel";
import NetworkDiscoveryModal from "./components/NetworkDiscoveryModal";
import NetworkScanSettingsModal from "./components/NetworkScanSettingsModal";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { NetworkScanConfig } from "./types/network-discovery";

// Custom Window Controls Component
function WindowControls() {
  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimizeWindow?.();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.maximizeWindow?.();
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.closeWindow?.();
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      gap: '8px',
      padding: '8px',
      userSelect: 'none'
    }}>
      <button
        onClick={handleMinimize}
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: '#ffc107',
          cursor: 'pointer',
          transition: 'opacity 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.opacity = '0.8'}
        onMouseLeave={(e) => e.target.style.opacity = '1'}
      />
      <button
        onClick={handleMaximize}
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: '#28a745',
          cursor: 'pointer',
          transition: 'opacity 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.opacity = '0.8'}
        onMouseLeave={(e) => e.target.style.opacity = '1'}
      />
      <button
        onClick={handleClose}
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: '#dc3545',
          cursor: 'pointer',
          transition: 'opacity 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.opacity = '0.8'}
        onMouseLeave={(e) => e.target.style.opacity = '1'}
      />
    </div>
  );
}

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
  const [networkDiscoveryOpen, setNetworkDiscoveryOpen] = useState(false);
  const [scanSettingsOpen, setScanSettingsOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>();
  const [systemStatus, setSystemStatus] = useState("Initializing...");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

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
    
    return () => {
      websocketService.disconnect();
    };
  }, []);

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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#1a1a1a',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      overflow: 'hidden', // Prevent scrollbars
      position: 'fixed', // Ensure it stays within viewport
      top: 0,
      left: 0
    }}>
      
      {/* Custom Title Bar with Drag Region */}
      <div style={{
        height: '32px', // Slightly smaller
        backgroundColor: '#1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        borderBottom: '1px solid #333',
        WebkitAppRegion: 'drag',
        userSelect: 'none',
        flexShrink: 0 // Don't shrink
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          WebkitAppRegion: 'no-drag'
        }}>
          <span style={{ fontSize: '12px', fontWeight: '500' }}>File</span>
          <span style={{ fontSize: '12px', fontWeight: '500' }}>Models</span>
          <span style={{ fontSize: '12px', fontWeight: '500' }}>Networks</span>
          <span style={{ fontSize: '12px', fontWeight: '500' }}>Prompts</span>
          <span style={{ fontSize: '12px', fontWeight: '500' }}>Windows</span>
        </div>
        
        <div style={{ WebkitAppRegion: 'no-drag' }}>
          <WindowControls />
        </div>
      </div>

      {/* Main Content - Fixed Height */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        minHeight: 0 // Important for flex children
      }}>
        
        {/* Left Panel - Network Dashboard */}
        <div style={{
          width: '260px', // Fixed width
          backgroundColor: '#1a1a1a',
          padding: '16px 12px',
          overflow: 'auto',
          flexShrink: 0, // Don't shrink
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
              Connections Available: <span style={{ color: '#28a745' }}>3</span>
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
              Active Models: <span style={{ color: '#ffc107' }}>2</span>
            </div>
            <div style={{ fontSize: '11px', color: '#888' }}>
              Orchestrator: <span style={{ color: '#28a745' }}>Online</span>
            </div>
          </div>
          
          {/* Network Scan Button */}
          <button style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#404040',
            border: 'none',
            borderRadius: '10px',
            color: '#fff',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}>
            Network Scan ⚙️
          </button>
        </div>
        
        {/* Right Panel - Chat Area */}
        <div style={{
          flex: 1,
          backgroundColor: '#1a1a1a',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0 // Important for flex children
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
