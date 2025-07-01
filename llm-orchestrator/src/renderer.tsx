import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import websocketService from "./services/websocket";
import ChatPanel from "./components/ChatPanel";
import Sidebar from "./components/Sidebar";
import SettingsPanel from "./components/SettingsPanel";
import StatusBar from "./components/StatusBar";
import NetworkDiscoveryModal from "./components/NetworkDiscoveryModal";
import NetworkScanSettingsModal from "./components/NetworkScanSettingsModal";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { NetworkScanConfig } from "./types/network-discovery";

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [networkDiscoveryOpen, setNetworkDiscoveryOpen] = useState(false);
  const [scanSettingsOpen, setScanSettingsOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>();
  const [systemStatus, setSystemStatus] = useState("Initializing...");

  useEffect(() => {
    // Initialize WebSocket connection
    websocketService.connect();
    
    // Set initial status
    setSystemStatus("Ready - All systems operational");
    
    return () => {
      websocketService.disconnect();
    };
  }, []);

  const handleSaveScanConfig = async (config: NetworkScanConfig) => {
    try {
      if (window.electronAPI?.saveScanConfig) {
        await window.electronAPI.saveScanConfig(config);
        setSystemStatus("Network scan configuration updated");
        console.log('Scan configuration saved successfully');
      } else {
        // Fallback for development without Electron
        console.log('Saving scan configuration:', config);
        setSystemStatus("Scan configuration saved (development mode)");
      }
    } catch (error) {
      console.error('Failed to save scan configuration:', error);
      setSystemStatus("Failed to save scan configuration");
      throw error;
    }
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    setSystemStatus(`Selected model: ${modelId}`);
    console.log('Selected model:', modelId);
  };

  const handleNetworkDiscovery = () => {
    setNetworkDiscoveryOpen(true);
    setSystemStatus("Opening network discovery...");
  };

  const handleScanSettings = () => {
    setScanSettingsOpen(true);
    setSystemStatus("Opening scan settings...");
  };

  const handleSettingsOpen = () => {
    setSettingsOpen(true);
    setSystemStatus("Opening settings...");
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-100">
      {/* Connection Status Bar */}
      <div className="bg-gray-800 p-3">
        <ConnectionStatus />
      </div>
      
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          onSettings={handleSettingsOpen}
          onModelSelect={handleModelSelect}
          onNetworkDiscovery={handleNetworkDiscovery}
          onScanSettings={handleScanSettings}
        />
        
        {/* Chat Panel */}
        <div className="flex-1 flex flex-col">
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
      
      {/* Status Bar */}
      <StatusBar status={systemStatus} />
      
      {/* Modals */}
      {settingsOpen && (
        <SettingsPanel onClose={() => {
          setSettingsOpen(false);
          setSystemStatus("Settings closed");
        }} />
      )}

      <NetworkDiscoveryModal
        isOpen={networkDiscoveryOpen}
        onClose={() => {
          setNetworkDiscoveryOpen(false);
          setSystemStatus("Network discovery closed");
        }}
      />

      <NetworkScanSettingsModal
        isOpen={scanSettingsOpen}
        onClose={() => {
          setScanSettingsOpen(false);
          setSystemStatus("Scan settings closed");
        }}
        onSave={handleSaveScanConfig}
      />
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
} else {
  console.error("Root element not found");
}
