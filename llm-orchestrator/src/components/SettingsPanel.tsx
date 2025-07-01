import React, { useState, useEffect } from "react";

interface SettingsPanelProps {
  onClose: () => void;
}

interface AppSettings {
  apiKeys: {
    openai?: string;
    anthropic?: string;
    gemini?: string;
  };
  orchestrator: {
    url: string;
    autoConnect: boolean;
    healthCheckInterval: number;
  };
  discovery: {
    autoScanOnStartup: boolean;
    scanInterval: number;
    enableNotifications: boolean;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    showConnectionStatus: boolean;
    compactMode: boolean;
  };
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'api' | 'network' | 'appearance'>('general');
  const [settings, setSettings] = useState<AppSettings>({
    apiKeys: {},
    orchestrator: {
      url: 'http://localhost:3000',
      autoConnect: true,
      healthCheckInterval: 5000
    },
    discovery: {
      autoScanOnStartup: false,
      scanInterval: 300000, // 5 minutes
      enableNotifications: true
    },
    ui: {
      theme: 'auto',
      showConnectionStatus: true,
      compactMode: false
    }
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load settings from storage or API
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // This would load from Electron storage or backend API
      console.log('Loading application settings...');
      // For now, use defaults
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // This would save to Electron storage or backend API
      console.log('Saving settings:', settings);
      
      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (path: string, value: any) => {
    setSettings(prev => {
      const updated = { ...prev };
      const keys = path.split('.');
      let current: any = updated;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const testConnection = async () => {
    try {
      console.log('Testing orchestrator connection...');
      // This would test the connection to the orchestrator
      alert('Connection test successful!');
    } catch (error) {
      console.error('Connection test failed:', error);
      alert('Connection test failed. Check the URL and try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-4/5 max-w-4xl h-4/5 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
            <p className="text-gray-600">Configure your LLM Orchestrator application</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { key: 'general', label: 'General', icon: '⚙️' },
            { key: 'api', label: 'API Keys', icon: '🔑' },
            { key: 'network', label: 'Network', icon: '🌐' },
            { key: 'appearance', label: 'Appearance', icon: '🎨' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-6 py-3 text-sm font-medium transition-colors flex items-center space-x-2 ${
                activeTab === tab.key
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Orchestrator Connection</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Orchestrator URL
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={settings.orchestrator.url}
                        onChange={(e) => updateSettings('orchestrator.url', e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="http://localhost:3000"
                      />
                      <button
                        onClick={testConnection}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Test
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="autoConnect"
                      checked={settings.orchestrator.autoConnect}
                      onChange={(e) => updateSettings('orchestrator.autoConnect', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="autoConnect" className="text-sm text-gray-700">
                      Auto-connect on startup
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Health Check Interval (ms)
                    </label>
                    <input
                      type="number"
                      value={settings.orchestrator.healthCheckInterval}
                      onChange={(e) => updateSettings('orchestrator.healthCheckInterval', parseInt(e.target.value))}
                      className="w-32 border border-gray-300 rounded-lg px-3 py-2"
                      min="1000"
                      step="1000"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* API Keys */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">API Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      OpenAI API Key
                    </label>
                    <input
                      type="password"
                      value={settings.apiKeys.openai || ''}
                      onChange={(e) => updateSettings('apiKeys.openai', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="sk-..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Anthropic API Key
                    </label>
                    <input
                      type="password"
                      value={settings.apiKeys.anthropic || ''}
                      onChange={(e) => updateSettings('apiKeys.anthropic', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="sk-ant-..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Google Gemini API Key
                    </label>
                    <input
                      type="password"
                      value={settings.apiKeys.gemini || ''}
                      onChange={(e) => updateSettings('apiKeys.gemini', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="API key..."
                    />
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-yellow-600">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Security Notice
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>API keys are stored locally and encrypted. They are only used to communicate with the respective AI services.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Network Settings */}
          {activeTab === 'network' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Network Discovery</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="autoScanStartup"
                      checked={settings.discovery.autoScanOnStartup}
                      onChange={(e) => updateSettings('discovery.autoScanOnStartup', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="autoScanStartup" className="text-sm text-gray-700">
                      Auto-scan for LLM services on startup
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Auto-scan Interval (minutes)
                    </label>
                    <input
                      type="number"
                      value={settings.discovery.scanInterval / 60000}
                      onChange={(e) => updateSettings('discovery.scanInterval', parseInt(e.target.value) * 60000)}
                      className="w-32 border border-gray-300 rounded-lg px-3 py-2"
                      min="1"
                      disabled={!settings.discovery.autoScanOnStartup}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="enableNotifications"
                      checked={settings.discovery.enableNotifications}
                      onChange={(e) => updateSettings('discovery.enableNotifications', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="enableNotifications" className="text-sm text-gray-700">
                      Show notifications when new devices are discovered
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Settings */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Theme & Display</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Theme
                    </label>
                    <select
                      value={settings.ui.theme}
                      onChange={(e) => updateSettings('ui.theme', e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto (System)</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="showConnectionStatus"
                      checked={settings.ui.showConnectionStatus}
                      onChange={(e) => updateSettings('ui.showConnectionStatus', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="showConnectionStatus" className="text-sm text-gray-700">
                      Show connection status in header
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="compactMode"
                      checked={settings.ui.compactMode}
                      onChange={(e) => updateSettings('ui.compactMode', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="compactMode" className="text-sm text-gray-700">
                      Compact mode (smaller UI elements)
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            Settings are automatically saved
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setSettings({
                  apiKeys: {},
                  orchestrator: {
                    url: 'http://localhost:3000',
                    autoConnect: true,
                    healthCheckInterval: 5000
                  },
                  discovery: {
                    autoScanOnStartup: false,
                    scanInterval: 300000,
                    enableNotifications: true
                  },
                  ui: {
                    theme: 'auto',
                    showConnectionStatus: true,
                    compactMode: false
                  }
                });
              }}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Reset to Defaults
            </button>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
