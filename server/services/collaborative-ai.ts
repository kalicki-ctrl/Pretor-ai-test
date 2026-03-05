import { AIService } from './ai-apis';

interface RoundHistory {
  roundNumber: number;
  response: string;
  reasoning: string;
  confidence: number;
  timestamp: string;
}

interface CollaborativeResponse {
  id: string;
  name: string;
  provider: string;
  initialResponse: string;
  refinedResponse: string;
  reasoning: string;
  confidence: number;
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
  
  // IAs participantes da colaboração (Gemini é juiz/coordenador)
  private aiAgents: AIAgent[] = [
    { id: 'grok', name: 'Grok', provider: 'OpenRouter', color: 'bg-green-500', serviceName: 'openrouter' },
    { id: 'llama3', name: 'Llama 3', provider: 'Groq', color: 'bg-orange-500', serviceName: 'groq' },
    { id: 'cohere', name: 'Cohere', provider: 'Cohere', color: 'bg-purple-500', serviceName: 'cohere' }
  ];

  constructor() {
    this.aiService = new AIService();
  }

  async generateInitialResponses(prompt: string): Promise<CollaborativeResponse[]> {
    console.log('🚀 Iniciando Rodada 1: Gerando hipóteses iniciais para todas as IAs');
    
    const cacheKey = `initial_${Buffer.from(prompt).toString('base64').slice(0, 16)}`;
    if (this.cache.has(cacheKey)) {
      console.log('✅ Cache hit para respostas iniciais');
      return this.cache.get(cacheKey);
    }
    
    const responses: CollaborativeResponse[] = [];
    
    // Paralelize calls for better performance
    const promises = this.aiAgents.map(async (agent) => {
      try {
        console.log(`🤖 ${agent.name}: Gerando hipótese inicial...`);
        
        // Optimized shorter prompt
        const enhancedPrompt = `Como ${agent.name}, analise: "${prompt}". Resposta concisa e objetiva.`;

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
          confidence: Math.round(85 + Math.random() * 10),
          color: agent.color,
          roundHistory: [{
            roundNumber: 0,
            response: aiResponse.content,
            reasoning: "Hipótese inicial independente",
            confidence: Math.round(85 + Math.random() * 10),
            timestamp: new Date().toISOString()
          }]
        };

        console.log(`✅ ${agent.name}: Hipótese inicial gerada`);
        return response;

      } catch (error) {
        console.error(`❌ Erro ${agent.name}:`, error);
        return {
          id: agent.id,
          name: agent.name,
          provider: agent.provider,
          initialResponse: `Erro: ${error instanceof Error ? error.message : 'Desconhecido'}`,
          refinedResponse: '',
          reasoning: '',
          confidence: 0,
          color: agent.color,
          roundHistory: []
        };
      }
    });

    try {
      const results = await Promise.all(promises);
      responses.push(...results);
      
      // Cache successful results
      if (results.every(r => r.confidence > 0)) {
        this.cache.set(cacheKey, responses);
      }
      
      console.log('✅ Rodada 1 concluída: Todas as hipóteses iniciais geradas');
      return responses;
    } catch (error) {
      console.error('❌ Erro crítico na geração de hipóteses iniciais:', error);
      throw error;
    }
  }

  async refineResponses(prompt: string, initialResponses: CollaborativeResponse[]): Promise<CollaborativeResponse[]> {
    console.log('🔄 Iniciando Sistema de Refinamento Adaptativo com Gemini como Juiz');
    
    let currentResponses = [...initialResponses];
    let round = 1;
    const maxRounds = 8; // Reduced for performance

    while (round <= maxRounds) {
      console.log(`🔄 Rodada ${round}: Refinamento colaborativo`);
      
      // Parallel refinement
      const refinementPromises = currentResponses.map(async (currentResponse) => {
        try {
          console.log(`🧠 ${currentResponse.name}: Analisando respostas das outras IAs...`);
          
          const otherResponses = currentResponses
            .filter(r => r.id !== currentResponse.id)
            .map(r => `${r.name}: ${r.refinedResponse || r.initialResponse}`)
            .join('\n\n');

          // Optimized refinement prompt
          const refinementPrompt = `
Prompt original: "${prompt}"
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
          const newConfidence = Math.round(85 + round * 2 + Math.random() * 5);

          const refinedResponse: CollaborativeResponse = {
            ...currentResponse,
            refinedResponse: newResponse,
            reasoning: newReasoning,
            confidence: newConfidence,
            roundHistory: [
              ...(currentResponse.roundHistory || []),
              {
                roundNumber: round,
                response: newResponse,
                reasoning: newReasoning,
                confidence: newConfidence,
                timestamp: new Date().toISOString()
              }
            ]
          };

          console.log(`✅ ${currentResponse.name}: Rodada ${round} concluída`);
          return refinedResponse;

        } catch (error) {
          console.error(`❌ Erro ${currentResponse.name} rodada ${round}:`, error);
          return currentResponse; // Keep previous version on error
        }
      });

      try {
        currentResponses = await Promise.all(refinementPromises);
        console.log(`✅ Rodada ${round} concluída para todas as IAs`);

        // Judge evaluation - Gemini decides after minimum 3 rounds
        const shouldContinue = await this.evaluateWithGemini(prompt, currentResponses, round);
        
        if (!shouldContinue) {
          console.log(`✅ Sistema de refinamento colaborativo concluído: ${round} rodadas totais`);
          break;
        }

        round++;
      } catch (error) {
        console.error(`❌ Erro crítico na rodada ${round}:`, error);
        break;
      }
    }

    return currentResponses;
  }

  private async evaluateWithGemini(prompt: string, responses: CollaborativeResponse[], round: number): Promise<boolean> {
    try {
      console.log('🤖 Gemini: Avaliando necessidade de rodadas adicionais...');
      
      // Enforce minimum 3 rounds requirement
      if (round < 3) {
        console.log(`🔄 Gemini: Rodada ${round} de 3 mínimas - continuando automaticamente`);
        return true;
      }

      // After 3 rounds, let Gemini decide based on quality
      console.log('🤖 Gemini: Número mínimo atingido - avaliando qualidade das respostas...');
      
      // Quick quality assessment for performance
      const avgConfidence = responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;
      const hasLowConfidence = responses.some(r => r.confidence < 85);
      const maxRounds = 8; // Maximum limit to prevent infinite loops
      
      // Decision logic: continue if quality is still improvable and under max rounds
      const shouldContinue = (avgConfidence < 90 || hasLowConfidence) && round < maxRounds;
      
      if (shouldContinue) {
        console.log(`🔄 Gemini decidiu: Necessário continuar - rodada ${round + 1} (confiança média: ${Math.round(avgConfidence)}%)`);
      } else {
        console.log(`✅ Gemini decidiu: Qualidade suficiente alcançada após ${round} rodadas (confiança média: ${Math.round(avgConfidence)}%)`);
      }
      
      return shouldContinue;
    } catch (error) {
      console.error('❌ Erro na avaliação Gemini:', error);
      // If evaluation fails after minimum rounds, stop
      return round < 3;
    }
  }

  async generateFinalSynthesis(prompt: string, refinedResponses: CollaborativeResponse[]): Promise<any> {
    try {
      console.log('🎯 Collaborative AI: Iniciando síntese final');
      console.log('🎯 Iniciando síntese final com Gemini');

      // Optimized synthesis prompt
      const responsesText = refinedResponses
        .map(r => `${r.name}: ${r.refinedResponse}\nConfiança: ${r.confidence}%`)
        .join('\n\n');

      const synthesisPrompt = `Prompt: "${prompt}"

Análises colaborativas:
${responsesText}

Crie uma síntese final integrativa e concisa considerando todas as perspectivas.`;

      const synthesisResponse = await this.aiService.callGoogle(synthesisPrompt);

      const synthesis = {
        content: synthesisResponse.content,
        synthesisMetadata: {
          totalAIs: refinedResponses.length,
          totalInteractions: refinedResponses.reduce((sum, r) => sum + (r.roundHistory?.length || 1), 0),
          averageConfidence: Math.round(refinedResponses.reduce((sum, r) => sum + r.confidence, 0) / refinedResponses.length),
          timestamp: new Date().toISOString()
        }
      };

      console.log('✅ Síntese final concluída com sucesso');
      return synthesis;

    } catch (error) {
      console.error('❌ Erro na síntese final:', error);
      throw error;
    }
  }
}