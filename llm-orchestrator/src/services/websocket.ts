import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../config';

interface LLMInfo {
  id: string;
  name: string;
  type: 'local' | 'remote';
  capabilities: string[];
  endpoint: string;
  status: string;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectInterval = 5000;
  private url: string;
  private messageHandlers: Map<string, Set<Function>> = new Map();

  constructor() {
    // Use API_CONFIG instead of process.env to ensure consistency
    this.url = API_CONFIG.orchestratorUrl;
  }

  connect(): void {
    try {
      console.log(`Connecting to WebSocket at: ${this.url}/client`);
      
      // Connect to client namespace
      this.socket = io(`${this.url}/client`, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: this.reconnectInterval,
        autoConnect: true,
        forceNew: true,
      });
      
      // Set up event handlers
      this.socket.on('connect', () => {
        console.log('✅ Connected to orchestrator WebSocket');
        this.emit('socket-connected', true);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from orchestrator:', reason);
        this.emit('socket-connected', false);
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
        this.emit('socket-connected', false);
      });

      this.socket.on('connected', (data) => {
        console.log('📡 Initial connection data:', data);
        this.emit('initial-state', data);
      });

      this.socket.on('llm-update', (data) => {
        console.log('🤖 LLM update:', data);
        this.emit('llm-update', data);
      });

      this.socket.on('llm-response', (data) => {
        console.log('💬 LLM response:', data);
        this.emit('llm-response', data);
      });

      this.socket.on('state-change', (data) => {
        console.log('🔄 State change:', data);
        this.emit('state-change', data);
      });

      // Add error handling for any unexpected events
      this.socket.onAny((eventName, ...args) => {
        console.log(`📨 WebSocket event: ${eventName}`, args);
      });

    } catch (error) {
      console.error('Failed to initialize WebSocket connection:', error);
    }
  }

  // Send chat message with acknowledgment
  sendChat(message: string, models: string[] = ['all'], framework: string = 'BMAD-METHOD'): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      console.log(`📤 Sending chat message: "${message}"`);
      
      this.socket.emit('chat', { message, models, framework }, (response: any) => {
        if (response?.error) {
          console.error('❌ Chat error:', response.error);
          reject(response.error);
        } else {
          console.log('✅ Chat response:', response);
          resolve(response);
        }
      });
    });
  }

  // Ping with callback for connection testing
  ping(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, 5000);

      this.socket.emit('ping', (response: any) => {
        clearTimeout(timeout);
        console.log('🏓 Ping response:', response);
        resolve(response);
      });
    });
  }

  // Event handling
  on(event: string, handler: Function): void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, new Set());
    }
    this.messageHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting WebSocket...');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Add method to get connection status
  getConnectionStatus(): string {
    if (!this.socket) return 'Not initialized';
    if (this.socket.connected) return 'Connected';
    if (this.socket.connecting) return 'Connecting';
    return 'Disconnected';
  }
}

const websocketService = new WebSocketService();
export default websocketService;
