import { API_CONFIG } from './config';

export interface LLMResponse {
  success: boolean;
  response?: string;
  error?: string;
  modelId?: string;
  tokensUsed?: number;
}

export interface LLMRequest {
  prompt: string;
  framework?: string;
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
}

// Direct LLM communication (for Electron main process)
export async function sendPrompt(request: LLMRequest): Promise<LLMResponse> {
  try {
    // This will be enhanced to work with your discovery system
    // For now, it's a placeholder that can be expanded
    
    const response = await fetch(`${API_CONFIG.orchestratorUrl}/api/llm/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      response: data.response,
      modelId: data.modelId,
      tokensUsed: data.tokensUsed
    };
    
  } catch (error: any) {
    console.error('LLM invocation failed:', error);
    
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      response: `Error: ${error.message || error}`
    };
  }
}

// Network discovery integration
export async function getAvailableModels(): Promise<any[]> {
  try {
    const response = await fetch(`${API_CONFIG.orchestratorUrl}/api/models/available`);
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to get available models:', error);
    return [];
  }
}

export async function getModelStatus(modelId: string): Promise<any> {
  try {
    const response = await fetch(`${API_CONFIG.orchestratorUrl}/api/models/${modelId}/status`);
    if (!response.ok) {
      throw new Error(`Failed to get model status: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to get model status:', error);
    return { status: 'unknown', error: error.message };
  }
}
