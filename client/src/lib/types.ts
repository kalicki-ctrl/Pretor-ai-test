export interface AIResponseStatus {
  provider: string;
  status: 'waiting' | 'processing' | 'success' | 'error';
  response?: string;
  responseTime?: number;
  tokens?: number;
  error?: string;
}

export interface AnalysisResult {
  promptId: number;
  responses: Record<string, {
    content: string;
    responseTime: number;
    tokens?: number;
    error?: string;
    sources?: Array<{
      title: string;
      url: string;
      type: 'website' | 'document' | 'reference' | 'citation';
      description?: string;
    }>;
  }>;
  llamaAnalysis?: {
    content: string;
    responseTime: number;
    tokens?: number;
    error?: string;
  };
  success: boolean;
}

export interface PromptUnderstanding {
  understanding: string;
  alternatives: string[];
  recommendedAI: string;
  aiWeights: Record<string, number>;
  explanation: string;
  responseTime: number;
  success: boolean;
}
