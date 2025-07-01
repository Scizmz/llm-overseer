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
      const response = await fetch(`http://localhost:3001/api/models`);
      const models = await response.json();
      set({ models });
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
  },
  sendMessage: async (message: string) => {
    try {
      const response = await fetch(`${API_CONFIG.orchestratorUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const result = await response.json();
      set(state => ({ 
        messages: [...state.messages, result] 
      }));
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
