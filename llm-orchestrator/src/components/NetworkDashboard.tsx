import React from 'react';
import { useStore } from '../store'; // Use existing store
import DeviceGrid from './DeviceGrid';
import ScanControls from './ScanControls';

interface NetworkDashboardProps {
  onScanSettings: () => void;
}

const NetworkDashboard: React.FC<NetworkDashboardProps> = ({ onScanSettings }) => {
  const { 
    networkDevices, 
    networkScanning, 
    networkScanProgress 
  } = useStore(); // Use existing store

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Rest of component same as before */}
      <DeviceGrid devices={networkDevices} />
      <ScanControls 
        scanning={networkScanning}
        scanProgress={networkScanProgress}
        deviceCount={networkDevices.length}
        onScanSettings={onScanSettings}
      />
    </div>
  );
};
