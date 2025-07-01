import React, { useState, useRef, useEffect } from "react";
import websocketService from "../services/websocket";

// Type definitions
interface Message {
  id: string;
  type: 'user' | 'overseer' | 'model' | 'system';
  content: string;
  timestamp: Date;
  modelName?: string;
  modelId?: string;
  parentMessageId?: string;
  isExpanded?: boolean;
  metadata?: {
    tokensUsed?: number;
    framework?: string;
    taskId?: string;
    deviceInfo?: {
      name: string;
      type: 'cloud' | 'local';
      endpoint?: string;
    };
  };
}

interface Project {
  id: string;
  name: string;
  phase: 'Planning' | 'Development' | 'Testing' | 'Deployment';
  lastCheckpoint: Date;
}

interface ChatPanelProps {
  currentProject?: Project;
  orchestratorStatus?: 'primary' | 'backup' | 'recovering';
}

export default function ChatPanel({ 
  currentProject = {
    id: '1',
    name: 'LLM Orchestrator Development',
    phase: 'Development',
    lastCheckpoint: new Date()
  },
  orchestratorStatus = 'primary'
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: 'System initialized. Orchestrator ready. Network discovery available.',
      timestamp: new Date(Date.now() - 3600000),
      metadata: {
        deviceInfo: {
          name: 'System',
          type: 'cloud'
        }
      }
    }
  ]);
  
  const [inputValue, setInputValue] = useState("");
  const [selectedFramework, setSelectedFramework] = useState("BMAD-METHOD");
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Available frameworks
  const frameworks = ["BMAD-METHOD", "CRISPE", "Custom-1", "Industry-Specific"];

  useEffect(() => {
    // WebSocket event listeners
    const handleResponse = (data: any) => {
      const newMessage: Message = {
        id: Date.now().toString(),
        type: 'overseer',
        content: data.message,
        timestamp: new Date(data.timestamp || Date.now()),
        metadata: { 
          framework: data.framework,
          tokensUsed: data.tokensUsed,
          deviceInfo: data.deviceInfo
        }
      };
      setMessages(prev => [...prev, newMessage]);
      setIsProcessing(false);
    };

    const handleProcessing = (data: any) => {
      const statusMessage: Message = {
        id: Date.now().toString(),
        type: 'system',
        content: `Processing with ${data.framework} on ${data.modelName || 'unknown model'}...`,
        timestamp: new Date(),
        metadata: {
          framework: data.framework,
          deviceInfo: data.deviceInfo
        }
      };
      setMessages(prev => [...prev, statusMessage]);
      setIsProcessing(true);
    };

    const handleModelUpdate = (data: any) => {
      const modelMessage: Message = {
        id: Date.now().toString(),
        type: 'model',
        content: data.content,
        timestamp: new Date(),
        modelName: data.modelName,
        modelId: data.modelId,
        parentMessageId: data.parentMessageId,
        metadata: {
          tokensUsed: data.tokensUsed,
          deviceInfo: data.deviceInfo
        }
      };
      setMessages(prev => [...prev, modelMessage]);
    };

    const handleNetworkDiscovery = (data: any) => {
      const discoveryMessage: Message = {
        id: Date.now().toString(),
        type: 'system',
        content: data.type === 'device-found' ? 
          `🔍 Discovered ${data.device.type} service: ${data.device.name} at ${data.device.host}:${data.device.port}` :
          data.type === 'device-connected' ?
          `✅ Connected to ${data.device.name}` :
          `❌ Failed to connect to ${data.device.name}: ${data.error}`,
        timestamp: new Date(),
        metadata: {
          deviceInfo: {
            name: data.device?.name || 'Unknown',
            type: 'local',
            endpoint: data.device ? `${data.device.host}:${data.device.port}` : undefined
          }
        }
      };
      setMessages(prev => [...prev, discoveryMessage]);
    };

    // Attach event listeners
    websocketService.on('response', handleResponse);
    websocketService.on('processing', handleProcessing);
    websocketService.on('model_update', handleModelUpdate);
    websocketService.on('network-discovery', handleNetworkDiscovery);

    // Cleanup
    return () => {
      websocketService.off('response', handleResponse);
      websocketService.off('processing', handleProcessing);
      websocketService.off('model_update', handleModelUpdate);
      websocketService.off('network-discovery', handleNetworkDiscovery);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isProcessing) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      metadata: { framework: selectedFramework }
    };
    setMessages(prev => [...prev, userMessage]);

    const messageText = inputValue;
    setInputValue("");
    setIsProcessing(true);

    // Send via WebSocket
    try {
      websocketService.sendMessage(messageText, selectedFramework);
    } catch (error) {
      console.error('WebSocket send failed:', error);
    }

    // Try Electron API if available
    if (window.api?.invokeLLM) {
      try {
        const result = await window.api.invokeLLM(messageText, selectedFramework);
        if (result.success && result.response) {
          const electronMessage: Message = {
            id: Date.now().toString(),
            type: 'model',
            content: result.response,
            timestamp: new Date(),
            modelName: 'Direct LLM',
            metadata: {
              framework: selectedFramework,
              tokensUsed: result.tokensUsed,
              deviceInfo: {
                name: 'Local Electron',
                type: 'local'
              }
            }
          };
          setMessages(prev => [...prev, electronMessage]);
          setIsProcessing(false);
        }
      } catch (error) {
        console.error('Electron LLM error:', error);
        setIsProcessing(false);
      }
    }

    // HTTP API fallback
    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: messageText,
          framework: selectedFramework,
          projectId: currentProject.id
        })
      });
      
      if (!response.ok) {
        throw new Error('API request failed');
      }
      
      const data = await response.json();
      console.log('API response:', data);
    } catch (error) {
      console.error('API error:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'system',
        content: 'Warning: Failed to save message to server. Using local processing only.',
        timestamp: new Date(),
        metadata: {
          deviceInfo: {
            name: 'System',
            type: 'cloud'
          }
        }
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    inputRef.current?.focus();
  };

  const handleExportConversation = async () => {
    try {
      if (window.electronAPI?.exportConfig) {
        await window.electronAPI.exportConfig();
      }
      
      // Create downloadable file
      const exportData = {
        project: currentProject,
        messages: messages,
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-${currentProject.name}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export conversation:', error);
    }
  };

  const handleSaveCheckpoint = () => {
    const checkpointMessage: Message = {
      id: Date.now().toString(),
      type: 'system',
      content: `💾 Checkpoint saved for project "${currentProject.name}" at ${new Date().toLocaleString()}`,
      timestamp: new Date(),
      metadata: {
        deviceInfo: {
          name: 'Checkpoint System',
          type: 'cloud'
        }
      }
    };
    setMessages(prev => [...prev, checkpointMessage]);
    currentProject.lastCheckpoint = new Date();
  };

  const toggleThread = (messageId: string) => {
    const newExpanded = new Set(expandedThreads);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedThreads(newExpanded);
  };

  const getOrchestratorStatusColor = () => {
    switch (orchestratorStatus) {
      case 'primary': return 'text-green-600';
      case 'backup': return 'text-yellow-600';
      case 'recovering': return 'text-red-600';
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getPhaseColor = (phase: Project['phase']) => {
    switch (phase) {
      case 'Planning': return 'bg-blue-100 text-blue-800';
      case 'Development': return 'bg-purple-100 text-purple-800';
      case 'Testing': return 'bg-orange-100 text-orange-800';
      case 'Deployment': return 'bg-green-100 text-green-800';
    }
  };

  const getDeviceTypeIcon = (deviceInfo?: Message['metadata']['deviceInfo']) => {
    if (!deviceInfo) return '💻';
    if (deviceInfo.type === 'local') {
      if (deviceInfo.name.toLowerCase().includes('ollama')) return '🦙';
      if (deviceInfo.name.toLowerCase().includes('lm studio')) return '🤖';
      return '🖥️';
    }
    return '☁️';
  };

  const getChildMessages = (parentId: string) => {
    return messages.filter(m => m.parentMessageId === parentId);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Project Status Bar */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-sm font-medium text-gray-600">Project: </span>
              <span className="font-semibold">{currentProject.name}</span>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPhaseColor(currentProject.phase)}`}>
              {currentProject.phase}
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Orchestrator:</span>
              <span className={`font-medium ${getOrchestratorStatusColor()}`}>
                {orchestratorStatus.charAt(0).toUpperCase() + orchestratorStatus.slice(1)}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Last Checkpoint:</span>
              <span className="font-medium">
                {currentProject.lastCheckpoint.toLocaleTimeString()}
              </span>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center space-x-2 ml-4">
              <button 
                className="p-1 hover:bg-gray-200 rounded transition-colors" 
                title="Save Checkpoint"
                onClick={handleSaveCheckpoint}
              >
                💾
              </button>
              <button className="p-1 hover:bg-gray-200 rounded transition-colors" title="Pause Project">
                ⏸️
              </button>
              <button className="p-1 hover:bg-gray-200 rounded transition-colors" title="Change Orchestrator">
                🔄
              </button>
              <button 
                className="p-1 hover:bg-gray-200 rounded transition-colors" 
                title="Export Conversation"
                onClick={handleExportConversation}
              >
                📥
              </button>
              <button className="p-1 hover:bg-gray-200 rounded transition-colors" title="Settings">
                ⚙️
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Communication Log */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((message) => {
          const childMessages = getChildMessages(message.id);
          const hasChildren = childMessages.length > 0;
          const isExpanded = expandedThreads.has(message.id);

          return (
            <div key={message.id}>
              {/* Main Message */}
              <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-3xl ${message.type === 'user' ? 'order-1' : ''}`}>
                  <div className={`rounded-lg px-4 py-2 shadow-sm ${
                    message.type === 'user' ? 'bg-blue-500 text-white' :
                    message.type === 'overseer' ? 'bg-gray-200 text-gray-800' :
                    message.type === 'model' ? 'bg-gray-100 text-gray-700 border border-gray-300' :
                    'bg-yellow-50 text-yellow-800 border border-yellow-200'
                  }`}>
                    {/* Message Header */}
                    {message.type !== 'user' && (
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">
                            {message.type === 'overseer' ? '🤖' :
                             message.type === 'model' ? getDeviceTypeIcon(message.metadata?.deviceInfo) :
                             '📢'}
                          </span>
                          <span className="font-medium text-sm">
                            {message.type === 'overseer' ? 'Overseer' :
                             message.type === 'model' ? `${message.modelName}` :
                             'System'}
                          </span>
                          {message.metadata?.deviceInfo?.endpoint && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {message.metadata.deviceInfo.endpoint}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {message.metadata?.framework && (
                            <span className="text-xs bg-white/30 px-2 py-1 rounded">
                              {message.metadata.framework}
                            </span>
                          )}
                          {message.metadata?.tokensUsed && (
                            <span className="text-xs bg-white/30 px-2 py-1 rounded">
                              {message.metadata.tokensUsed} tokens
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Message Content */}
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </div>
                    
                    {/* Timestamp and Actions */}
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs ${
                        message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatTimestamp(message.timestamp)}
                      </span>
                      
                      {/* Thread Toggle */}
                      {hasChildren && (
                        <button
                          onClick={() => toggleThread(message.id)}
                          className="text-xs underline hover:no-underline transition-all"
                        >
                          {isExpanded ? 'Hide' : 'Show'} {childMessages.length} response{childMessages.length !== 1 ? 's' : ''}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Child Messages (Model Interactions) */}
                  {hasChildren && isExpanded && (
                    <div className="ml-8 mt-3 space-y-3 border-l-2 border-gray-300 pl-4">
                      {childMessages.map((child) => (
                        <div key={child.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2 text-gray-600">
                              <span className="text-lg">{getDeviceTypeIcon(child.metadata?.deviceInfo)}</span>
                              <span className="font-medium text-sm">{child.modelName}</span>
                              <span className="text-xs">→ Overseer</span>
                            </div>
                            {child.metadata?.tokensUsed && (
                              <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                                {child.metadata.tokensUsed} tokens
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {child.content}
                          </div>
                          <div className="text-xs text-gray-400 mt-2">
                            {formatTimestamp(child.timestamp)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* State Checkpoint Notifications */}
              {message.type === 'system' && message.content.includes('Checkpoint saved') && (
                <div className="flex justify-center my-3">
                  <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200">
                    ✓ State checkpoint saved
                  </span>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* User Input Area */}
      <div className="border-t border-gray-200 px-4 py-4 bg-gray-50">
        <div className="flex items-start space-x-3">
          {/* Framework Selector */}
          <select
            value={selectedFramework}
            onChange={(e) => setSelectedFramework(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            disabled={isProcessing}
          >
            {frameworks.map(fw => (
              <option key={fw} value={fw}>{fw}</option>
            ))}
          </select>

          {/* Input Field */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isProcessing ? "Processing..." : "Type your message... (Shift+Enter for new line)"}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              rows={2}
              disabled={isProcessing}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {inputValue.length} chars
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2">
            <button
              onClick={handleSend}
              disabled={isProcessing || !inputValue.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
            >
              <span>{isProcessing ? 'Processing...' : 'Send'}</span>
              <span className="text-xs">{isProcessing ? '⏳' : '📤'}</span>
            </button>
            <div className="flex space-x-2">
              <button 
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50" 
                title="Attach File"
                disabled={isProcessing}
              >
                📎
              </button>
              <button 
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50" 
                title="Voice Input"
                disabled={isProcessing}
              >
                🎤
              </button>
            </div>
          </div>
        </div>
        
        {/* Processing Indicator */}
        {isProcessing && (
          <div className="mt-3 flex items-center space-x-2 text-sm text-gray-600">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Processing your request with {selectedFramework}...</span>
          </div>
        )}
      </div>
    </div>
  );
}
