import { create } from 'zustand';
import { API_CONFIG } from '../config';

interface Model {
  id: string;
  name: string;
  type: string;
  status: string;
  rateLimit?: {
    used: number;
    limit: number;
    resetTime: string;
  };
}

interface AppState {
  models: Model[];
  fetchModels: () => Promise<void>;
  updateModelStatus: (modelId: string, status: string) => void;
}

export const useStore = create<AppState>((set) => ({
  models: [],
    
  fetchModels: async () => {
    try {
      // Fixed: Use API_CONFIG.orchestratorUrl instead of hardcoded localhost:3001
      const response = await fetch(`${API_CONFIG.orchestratorUrl}/api/models`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        set({ models: data.models });
        console.log('Models fetched successfully:', data.models);
      } else {
        throw new Error(data.error || 'Failed to fetch models');
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
      // Don't clear models on error, keep the previous state
    }
  },
  
  sendMessage: async (message: string) => {
    try {
      const response = await fetch(`${API_CONFIG.orchestratorUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Message sent successfully:', result);
      // Note: This assumes you have a messages state - adjust as needed
      // set(state => ({ 
      //   messages: [...state.messages, result] 
      // }));
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  },
  
  updateModelStatus: (modelId: string, status: string) => {
    set((state) => ({
      models: state.models.map(model =>
        model.id === modelId ? { ...model, status } : model
      )
    }));
  }
}));
