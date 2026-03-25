import { createHash } from 'crypto';
import { AIService } from './ai-apis';

interface RoundHistory {
  roundNumber: number;
  response: string;
  reasoning: string;
  timestamp: string;
}

interface CollaborativeResponse {
  id: string;
  name: string;
  provider: string;
  initialResponse: string;
  refinedResponse: string;
  reasoning: string;
  confidence: number | null; // null — no real quality evaluation is performed
  color: string;
  roundHistory?: RoundHistory[];
}

interface AIAgent {
  id: string;
  name: string;
  provider: string;
  color: string;
  serviceName: string;
}

export class CollaborativeAIService {
  private aiService: AIService;
  private cache = new Map<string, any>();
  private static readonly MAX_CACHE_ENTRIES = 100;

  // IAs participantes da colaboração
  private aiAgents: AIAgent[] = [
    { id: 'grok', name: 'Grok', provider: 'OpenRouter', color: 'bg-green-500', serviceName: 'openrouter' },
    { id: 'llama3', name: 'Llama 3', provider: 'Groq', color: 'bg-orange-500', serviceName: 'groq' },
    { id: 'cohere', name: 'Cohere', provider: 'Cohere', color: 'bg-purple-500', serviceName: 'cohere' }
  ];

  constructor() {
    this.aiService = new AIService();
  }

  // FIFO eviction when cache exceeds max size
  private setCacheEntry(key: string, value: any): void {
    if (this.cache.size >= CollaborativeAIService.MAX_CACHE_ENTRIES) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  async generateInitialResponses(prompt: string): Promise<CollaborativeResponse[]> {
    const cacheKey = createHash('sha256').update(prompt).digest('hex').slice(0, 32);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const responses: CollaborativeResponse[] = [];

    const promises = this.aiAgents.map(async (agent) => {
      try {
        // Use XML delimiters for user prompt (prompt injection mitigation)
        const enhancedPrompt = `Como ${agent.name}, analise: <user_prompt>${prompt}</user_prompt>. Resposta concisa e objetiva.`;

        let aiResponse;

        switch (agent.serviceName) {
          case 'openrouter':
            aiResponse = agent.id === 'grok'
              ? await this.aiService.callOpenRouter(enhancedPrompt, 'x-ai/grok-beta')
              : await this.aiService.callOpenRouter(enhancedPrompt, 'meta-llama/llama-3.1-8b-instruct:free');
            break;
          case 'groq':
            aiResponse = await this.aiService.callGroq(enhancedPrompt);
            break;
          case 'cohere':
            aiResponse = await this.aiService.callCohere(enhancedPrompt);
            break;
          default:
            throw new Error(`Serviço desconhecido: ${agent.serviceName}`);
        }

        const response: CollaborativeResponse = {
          id: agent.id,
          name: agent.name,
          provider: agent.provider,
          initialResponse: aiResponse.content,
          refinedResponse: '',
          reasoning: '',
          confidence: null,
          color: agent.color,
          roundHistory: [{
            roundNumber: 0,
            response: aiResponse.content,
            reasoning: "Hipótese inicial independente",
            timestamp: new Date().toISOString()
          }]
        };

        return response;

      } catch (error) {
        console.error(`Erro ${agent.name}:`, error);
        return {
          id: agent.id,
          name: agent.name,
          provider: agent.provider,
          initialResponse: `Erro: ${error instanceof Error ? error.message : 'Desconhecido'}`,
          refinedResponse: '',
          reasoning: '',
          confidence: null,
          color: agent.color,
          roundHistory: []
        };
      }
    });

    try {
      const results = await Promise.all(promises);
      responses.push(...results);

      if (results.every(r => r.initialResponse && !r.initialResponse.startsWith('Erro:'))) {
        this.setCacheEntry(cacheKey, responses);
      }

      return responses;
    } catch (error) {
      console.error('Erro crítico na geração de hipóteses iniciais:', error);
      throw error;
    }
  }

  async refineResponses(prompt: string, initialResponses: CollaborativeResponse[]): Promise<CollaborativeResponse[]> {
    let currentResponses = [...initialResponses];
    let round = 1;
    const maxRounds = 4; // Reduced from 8 to limit LLM cost per request

    while (round <= maxRounds) {
      const refinementPromises = currentResponses.map(async (currentResponse) => {
        try {
          const otherResponses = currentResponses
            .filter(r => r.id !== currentResponse.id)
            .map(r => `${r.name}: ${r.refinedResponse || r.initialResponse}`)
            .join('\n\n');

          const refinementPrompt = `
Prompt original: <user_prompt>${prompt}</user_prompt>
Outras análises:
${otherResponses}

Sua análise atual: ${currentResponse.refinedResponse || currentResponse.initialResponse}

Refine sua resposta considerando as outras perspectivas. Seja conciso.

Resposta Refinada: [sua resposta melhorada]
Raciocínio: [por que mudou/manteve]`;

          let aiResponse;
          const agent = this.aiAgents.find(a => a.id === currentResponse.id);
          if (!agent) throw new Error(`Agent não encontrado: ${currentResponse.id}`);

          switch (agent.serviceName) {
            case 'openrouter':
              aiResponse = agent.id === 'grok'
                ? await this.aiService.callOpenRouter(refinementPrompt, 'x-ai/grok-beta')
                : await this.aiService.callOpenRouter(refinementPrompt, 'meta-llama/llama-3.1-8b-instruct:free');
              break;
            case 'groq':
              aiResponse = await this.aiService.callGroq(refinementPrompt);
              break;
            case 'cohere':
              aiResponse = await this.aiService.callCohere(refinementPrompt);
              break;
            default:
              throw new Error(`Serviço desconhecido: ${agent.serviceName}`);
          }

          const fullResponse = aiResponse.content;
          const responseMatch = fullResponse.match(/Resposta Refinada:\s*(.*?)(?=\n.*?Raciocínio:|$)/);
          const reasoningMatch = fullResponse.match(/Raciocínio:\s*(.*)/);

          const newResponse = responseMatch ? responseMatch[1].trim() : fullResponse;
          const newReasoning = reasoningMatch ? reasoningMatch[1].trim() : `Análise refinada na rodada ${round}`;

          const refinedResponse: CollaborativeResponse = {
            ...currentResponse,
            refinedResponse: newResponse,
            reasoning: newReasoning,
            confidence: null, // No real quality evaluation
            roundHistory: [
              ...(currentResponse.roundHistory || []),
              {
                roundNumber: round,
                response: newResponse,
                reasoning: newReasoning,
                timestamp: new Date().toISOString()
              }
            ]
          };

          return refinedResponse;

        } catch (error) {
          console.error(`Erro ${currentResponse.name} rodada ${round}:`, error);
          return currentResponse;
        }
      });

      try {
        currentResponses = await Promise.all(refinementPromises);

        // Deterministic stop decision based on content convergence (not fake scores)
        const shouldContinue = this.shouldContinueRefinement(currentResponses, round, maxRounds);

        if (!shouldContinue) {
          break;
        }

        round++;
      } catch (error) {
        console.error(`Erro crítico na rodada ${round}:`, error);
        break;
      }
    }

    return currentResponses;
  }

  // Deterministic stop condition — no fake quality evaluation
  // Stops after minimum 3 rounds, or earlier if responses haven't changed
  private shouldContinueRefinement(responses: CollaborativeResponse[], round: number, maxRounds: number): boolean {
    // Always do at least 3 rounds
    if (round < 3) {
      return true;
    }

    // Stop at max rounds
    if (round >= maxRounds) {
      return false;
    }

    // Check if responses changed meaningfully in this round
    // Compare latest refined response against previous round
    const significantChange = responses.some(r => {
      const history = r.roundHistory || [];
      if (history.length < 2) return true;
      const latest = history[history.length - 1]?.response || '';
      const previous = history[history.length - 2]?.response || '';
      // If content length changed by more than 10%, consider it significant
      const lengthDiff = Math.abs(latest.length - previous.length);
      return lengthDiff > previous.length * 0.1;
    });

    return significantChange;
  }

  async generateFinalSynthesis(prompt: string, refinedResponses: CollaborativeResponse[]): Promise<any> {
    try {
      const responsesText = refinedResponses
        .map(r => `${r.name}: ${r.refinedResponse}`)
        .join('\n\n');

      const synthesisPrompt = `Prompt: <user_prompt>${prompt}</user_prompt>

Análises colaborativas:
${responsesText}

Crie uma síntese final integrativa e concisa considerando todas as perspectivas.`;

      const synthesisResponse = await this.aiService.callGoogle(synthesisPrompt);

      const synthesis = {
        content: synthesisResponse.content,
        synthesisMetadata: {
          totalAIs: refinedResponses.length,
          totalInteractions: refinedResponses.reduce((sum, r) => sum + (r.roundHistory?.length || 1), 0),
          timestamp: new Date().toISOString()
        }
      };

      return synthesis;

    } catch (error) {
      console.error('Erro na síntese final:', error);
      throw error;
    }
  }
}
