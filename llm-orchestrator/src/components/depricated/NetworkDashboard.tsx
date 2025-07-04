import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import './NetworkDashboard.css';

interface NetworkDashboardProps {
  onScanSettings?: () => void;
}

// Simple DeviceGrid component (inline)
const DeviceGrid: React.FC<{ devices: any[] }> = ({ devices }) => {
  return (
    <div className="device-grid">
      {devices.length === 0 ? (
        <div className="device-grid-empty">
          No devices discovered yet. Start a network scan to find LLM services.
        </div>
      ) : (
        devices.map((device, index) => (
          <div key={device.id || index} className="device-card">
            {/* Device Header */}
            <div className="device-header">
              <div className={`device-status-dot ${
                device.status === 'online' ? 'online' : 
                device.status === 'connecting' ? 'connecting' : 'offline'
              }`} />
              <div className="device-name">
                {device.name || device.hostname || 'Unknown Device'}
              </div>
            </div>

            {/* Device Info */}
            <div className="device-info">
              <div>IP: {device.ip || 'Unknown'}</div>
              <div>Type: {device.type || 'LLM Service'}</div>
              {device.port && <div>Port: {device.port}</div>}
            </div>

            {/* Status */}
            <div className="device-status-text">
              Status: {device.status || 'discovered'}
            </div>

            {/* Action Button */}
            <button
              className={`device-connect-btn ${
                device.status === 'online' ? 'available' : 'unavailable'
              }`}
              disabled={device.status !== 'online'}
            >
              {device.status === 'online' ? 'Connect' : 'Unavailable'}
            </button>
          </div>
        ))
      )}
    </div>
  );
};

// Simple ScanControls component (inline)
const ScanControls: React.FC<{
  scanning: boolean;
  scanProgress?: number;
  deviceCount: number;
  onScanSettings?: () => void;
}> = ({ scanning, scanProgress, deviceCount, onScanSettings }) => {
  const { startNetworkScan, stopNetworkScan } = useStore();

  const handleScanToggle = async () => {
    try {
      if (scanning) {
        await stopNetworkScan();
      } else {
        await startNetworkScan();
      }
    } catch (error) {
      console.error('Failed to toggle scan:', error);
    }
  };

  return (
    <div style={{
      padding: '16px',
      borderTop: '1px solid #333',
      backgroundColor: '#1e1e1e'
    }}>
      {/* Scan Progress */}
      {scanning && scanProgress !== undefined && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#ccc',
            marginBottom: '4px'
          }}>
            <span>Scanning network...</span>
            <span>{Math.round(scanProgress)}%</span>
          </div>
          <div style={{
            height: '4px',
            backgroundColor: '#404040',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              backgroundColor: '#007acc',
              width: `${scanProgress}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        <button
          onClick={handleScanToggle}
          disabled={scanning}
          style={{
            padding: '8px 16px',
            backgroundColor: scanning ? '#555' : '#007acc',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
            cursor: scanning ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {scanning ? (
            <>
              <span style={{ animation: 'spin 1s linear infinite' }}>⟳</span>
              Scanning...
            </>
          ) : (
            <>
              <span>🔍</span>
              Start Scan
            </>
          )}
        </button>

        {onScanSettings && (
          <button
            onClick={onScanSettings}
            style={{
              padding: '8px 16px',
              backgroundColor: '#404040',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            ⚙️ Settings
          </button>
        )}

        <div style={{
          marginLeft: 'auto',
          fontSize: '11px',
          color: '#888'
        }}>
          {deviceCount} device{deviceCount !== 1 ? 's' : ''} found
        </div>
      </div>
    </div>
  );
};

const NetworkDashboard: React.FC<NetworkDashboardProps> = ({ onScanSettings }) => {
  const {
    networkDevices,
    networkScanning,
    networkScanProgress,
    refreshNetworkDevices
  } = useStore();

  // Refresh devices on mount
  useEffect(() => {
    refreshNetworkDevices();
  }, [refreshNetworkDevices]);

  return (
    <div className="network-dashboard">
      {/* Header */}
      <div className="network-header">
        <h2 className="network-title">Network Discovery</h2>
        <p className="network-subtitle">
          Discover and manage LLM services on your network
        </p>
      </div>

      {/* Device Grid */}
      <div className="device-grid-container">
        <DeviceGrid devices={networkDevices} />
      </div>

      {/* Scan Controls */}
      <ScanControls
        scanning={networkScanning}
        scanProgress={networkScanProgress}
        deviceCount={networkDevices.length}
        onScanSettings={onScanSettings}
      />
    </div>
  );
};

export default NetworkDashboard;
