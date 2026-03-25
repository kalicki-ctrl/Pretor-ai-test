import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { promptAnalysisSchema, promptUnderstandingSchema, insertPromptSchema, insertAiResponseSchema } from "@shared/schema";
import { aiService, detectLanguage } from "./services/ai-apis";
import { CollaborativeAIService } from "./services/collaborative-ai";
import { storage } from "./storage";
import { GeolocationService } from "./services/geolocation";
import { getCache, setCache, generateCacheKey } from "./services/cache";
import { createHash } from "crypto";

// Zod schema for chat endpoint validation
const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(4000)
  })).max(50).optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {

  // Detect user location endpoint
  app.get("/api/detect-location", async (req, res) => {
    try {
      const location = await GeolocationService.detectLocation(req);

      res.json({
        success: true,
        location: {
          country: location.country,
          countryCode: location.countryCode,
          language: location.language,
          timezone: location.timezone
        }
      });
    } catch (error) {
      console.error('Location detection error:', error);
      res.json({
        success: false,
        location: {
          country: 'United States',
          countryCode: 'US',
          language: 'en-US',
          timezone: 'America/New_York'
        }
      });
    }
  });

  // API Status endpoint — passive checks only, no real LLM calls
  app.get("/api/status", async (req, res) => {
    try {
      const status: Record<string, { available: boolean; message: string }> = {
        openrouter: {
          available: !!process.env.OPENROUTER_API_KEY,
          message: process.env.OPENROUTER_API_KEY ? "API key configured" : "API key not configured"
        },
        groq: {
          available: !!process.env.GROQ_API_KEY,
          message: process.env.GROQ_API_KEY ? "API key configured" : "API key not configured"
        },
        google: {
          available: !!process.env.GEMINI_API_KEY,
          message: process.env.GEMINI_API_KEY ? "API key configured" : "API key not configured"
        },
        llama3: {
          available: !!process.env.GROQ_API_KEY,
          message: process.env.GROQ_API_KEY ? "API key configured" : "API key not configured"
        },
        cohere: {
          available: !!process.env.COHERE_API_KEY,
          message: process.env.COHERE_API_KEY ? "API key configured" : "API key not configured"
        },
      };

      res.json(status);
    } catch (error) {
      console.error('Status error:', error);
      res.status(500).json({ error: 'Failed to get API status' });
    }
  });

  // Get prompt understanding from Llama 3 with alternatives
  app.post("/api/understand", async (req, res) => {
    try {
      const { prompt } = promptUnderstandingSchema.parse(req.body);

      if (!prompt || prompt.trim().length < 10) {
        return res.status(400).json({
          message: 'O prompt deve ter pelo menos 10 caracteres',
          success: false
        });
      }

      // Cache key using SHA-256 hash
      const understandCacheKey = `understand:${createHash('sha256').update(prompt).digest('hex').slice(0, 32)}`;
      const cachedUnderstanding = await getCache(understandCacheKey);

      if (cachedUnderstanding) {
        return res.json({
          ...cachedUnderstanding,
          cached: true
        });
      }

      const groqKey = process.env.GROQ_API_KEY;

      if (!groqKey) {
        return res.status(400).json({
          message: 'API Groq não configurada',
          success: false
        });
      }

      const systemPrompt = `Você é Pretor AI, uma IA assistente especializada em compreensão e reformulação de prompts. Sua tarefa é:

1. ENTENDER o que o usuário está perguntando
2. RESUMIR sua compreensão de forma clara
3. SUGERIR 3 VARIAÇÕES DE PROMPT melhoradas (NÃO respostas ao prompt)
4. IDENTIFICAR qual IA é mais adequada para responder o prompt
5. DEFINIR pesos para cada IA baseado na adequação

**IMPORTANTE**: As alternativas devem ser REFORMULAÇÕES do prompt original, não respostas ao que foi perguntado.

As IAs disponíveis e suas especialidades:
- **OpenRouter**: Raciocínio complexo, análise profunda, problemas técnicos avançados, código, matemática
- **Groq**: Respostas rápidas, conhecimento geral, criatividade, linguagem natural
- **Cohere**: Análise de texto, compreensão semântica, classificação, resumos
- **Llama3**: Compreensão contextual, análise lógica, raciocínio sequencial, síntese

Responda SEMPRE neste formato JSON:
{
  "understanding": "Resumo claro do que você entendeu sobre a solicitação",
  "alternatives": [
    "Primeira REFORMULAÇÃO do prompt original",
    "Segunda REFORMULAÇÃO do prompt original",
    "Terceira REFORMULAÇÃO do prompt original"
  ],
  "recommendedAI": "openrouter|groq|cohere",
  "aiWeights": {
    "openrouter": 0.3,
    "groq": 0.25,
    "cohere": 0.25,
    "llama3": 0.2
  },
  "explanation": "Explicação de por que esta IA é mais adequada e como os pesos foram distribuídos"
}

Regras para pesos:
- Soma deve ser sempre 1.0
- IA mais adequada: 0.4-0.6
- Outras IAs: 0.2-0.4 cada
- Manter equilíbrio para não dominar completamente

REGRAS CRÍTICAS para as alternativas:
- NUNCA forneça respostas ao prompt original
- SEMPRE reformule a PERGUNTA ou SOLICITAÇÃO
- Torne o prompt mais específico, detalhado ou com contexto adicional
- Mantenha o mesmo tipo de solicitação (pergunta→pergunta, pedido→pedido)
- Adicione contexto, exemplos ou especificações ao prompt original
- Escritas na mesma linguagem do prompt original

EXEMPLOS:
❌ ERRADO: Se prompt = "O que é IA?", NÃO responda com "IA é inteligência artificial..."
✅ CORRETO: "Explique o conceito de inteligência artificial e suas principais aplicações"

❌ ERRADO: Se prompt = "Como fazer café?", NÃO responda com "Primeiro pegue o pó..."
✅ CORRETO: "Descreva passo a passo o processo de preparação de café expresso italiano"`;

      // Use XML delimiters for user prompt (prompt injection mitigation)
      const understandingPrompt = `${systemPrompt}

<user_prompt>${prompt}</user_prompt>

LEMBRE-SE: Você deve gerar 3 REFORMULAÇÕES do prompt acima, não respostas ao que foi perguntado. As alternativas devem ser versões melhoradas da MESMA PERGUNTA ou SOLICITAÇÃO.`;

      const response = await aiService.callGroq(understandingPrompt, groqKey, 'llama3-8b-8192');

      if (response.error) {
        return res.status(500).json({
          message: 'Erro ao processar o prompt',
          success: false,
          error: response.error
        });
      }

      try {
        const parsedContent = JSON.parse(response.content);

        const understandingResult = {
          success: true,
          understanding: parsedContent.understanding,
          alternatives: parsedContent.alternatives,
          recommendedAI: parsedContent.recommendedAI,
          aiWeights: parsedContent.aiWeights,
          explanation: parsedContent.explanation,
          responseTime: response.responseTime
        };

        await setCache(understandCacheKey, understandingResult, 3600);

        res.json(understandingResult);
      } catch (parseError) {
        const content = response.content;
        const understandingMatch = content.match(/"understanding":\s*"([^"]+)"/);
        const alternativesMatch = content.match(/"alternatives":\s*\[(.*?)\]/);

        let alternatives: string[] = [];
        if (alternativesMatch) {
          const altText = alternativesMatch[1];
          alternatives = altText.match(/"([^"]+)"/g)?.map(alt => alt.slice(1, -1)) || [];
        }

        const defaultWeights = {
          openrouter: 0.3,
          groq: 0.25,
          cohere: 0.25,
          llama3: 0.2
        };

        const fallbackResult = {
          success: true,
          understanding: understandingMatch ? understandingMatch[1] : "Entendi sua solicitação e vou proceder com a análise.",
          alternatives: alternatives.length > 0 ? alternatives : [
            prompt + " - versão detalhada",
            prompt + " - com exemplos práticos",
            prompt + " - análise aprofundada"
          ],
          recommendedAI: "openrouter",
          aiWeights: defaultWeights,
          explanation: "Distribuição equilibrada de pesos entre as IAs especializadas.",
          responseTime: response.responseTime
        };

        await setCache(understandCacheKey, fallbackResult, 3600);

        res.json(fallbackResult);
      }

    } catch (error) {
      console.error('Understanding error:', error);
      res.status(500).json({
        message: 'Erro interno do servidor',
        success: false
      });
    }
  });

  // Analyze prompt with multiple AIs
  app.post("/api/analyze", async (req, res) => {
    const startTime = Date.now();

    try {
      // Server uses only process.env keys — apiKeys from client is ignored
      const { prompt: originalPrompt, recommendedAI, aiWeights } = promptAnalysisSchema.parse(req.body);

      if (!originalPrompt || originalPrompt.trim().length < 10) {
        return res.status(400).json({
          message: 'O prompt deve ter pelo menos 10 caracteres',
          success: false
        });
      }

      // Check cache
      const cacheKey = generateCacheKey(originalPrompt, aiWeights);
      const cachedResult = await getCache(cacheKey);

      if (cachedResult) {
        return res.json({
          ...cachedResult,
          cached: true,
          cacheHit: true
        });
      }

      // Store the prompt
      const storedPrompt = await storage.createPrompt({ content: originalPrompt });

      // Get API keys from environment only
      const keys = {
        openrouter: process.env.OPENROUTER_API_KEY,
        groq: process.env.GROQ_API_KEY,
        cohere: process.env.COHERE_API_KEY,
        llama3: process.env.GROQ_API_KEY,
      };

      const availableApis = Object.entries(keys).filter(([name, key]) => !!key);

      if (availableApis.length === 0) {
        return res.status(400).json({
          message: 'Nenhuma API configurada. Adicione pelo menos uma chave de API.',
          success: false
        });
      }

      // Call AI APIs in parallel
      const aiProviders = [
        { name: 'openrouter', call: () => aiService.callOpenRouter(originalPrompt, keys.openrouter) },
        { name: 'groq', call: () => aiService.callGroq(originalPrompt, keys.groq) },
        { name: 'cohere', call: () => aiService.callCohere(originalPrompt, keys.cohere) },
        { name: 'llama3', call: () => aiService.callLlama3(originalPrompt, keys.llama3) },
      ];

      const responses: Record<string, any> = {};

      const providerPromises = aiProviders
        .filter(provider => keys[provider.name as keyof typeof keys])
        .map(async provider => {
          try {
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Provider timeout after 90 seconds')), 90000);
            });

            const response = await Promise.race([
              provider.call(),
              timeoutPromise
            ]) as any;

            responses[provider.name] = response;

            await storage.createAiResponse({
              promptId: storedPrompt.id,
              provider: provider.name,
              response: response.content,
              responseTime: response.responseTime,
              tokens: response.tokens || 0,
              status: response.error ? 'error' : 'success',
              error: response.error,
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            responses[provider.name] = {
              content: '',
              responseTime: 0,
              error: errorMessage,
            };

            await storage.createAiResponse({
              promptId: storedPrompt.id,
              provider: provider.name,
              response: '',
              responseTime: 0,
              tokens: 0,
              status: 'error',
              error: errorMessage,
            });
          }
        });

      await Promise.allSettled(providerPromises);

      // Synthesize with Gemini
      let geminiAnalysis = null;
      const geminiKey = process.env.GEMINI_API_KEY;
      if (geminiKey) {
        try {
          const lang = detectLanguage(originalPrompt);

          const systemPrompts: Record<string, string> = {
            'pt': `Você é a Pretor IA, especializada em analisar e sintetizar respostas de múltiplas IAs. SEMPRE responda na mesma lingua do prompt original.

Analise as seguintes respostas e forneça uma síntese estruturada seguindo este formato:

**RESPOSTA SÍNTESE:**
Forneça uma resposta completa e definitiva ao prompt original, baseada nas informações das IAs especialistas.

**ANÁLISE COMPARATIVA:**
1. **Convergências**: Pontos onde as IAs concordam
2. **Divergências**: Diferenças importantes entre as respostas
3. **Pontos de Atenção**: Aspectos importantes ou limitações identificadas
4. **Qualidade das Fontes**: Avaliação da confiabilidade de cada resposta

Seja objetivo, preciso e mantenha um tom profissional.`,
            'es': `Eres Pretor IA, especializada en analizar y sintetizar respuestas de múltiples IAs. SIEMPRE responde en español.

Analiza las siguientes respuestas y proporciona una síntesis estructurada siguiendo este formato:

**RESPUESTA SÍNTESIS:**
Proporciona una respuesta completa y definitiva al prompt original, basada en la información de las IAs especialistas.

**ANÁLISIS COMPARATIVO:**
1. **Convergencias**: Puntos donde las IAs están de acuerdo
2. **Divergencias**: Diferencias importantes entre las respuestas
3. **Puntos de Atención**: Aspectos importantes o limitaciones identificadas
4. **Calidad de las Fuentes**: Evaluación de la confiabilidad de cada respuesta

Sé objetivo, preciso y mantén un tono profesional.`,
            'fr': `Vous êtes Pretor IA, spécialisée dans l'analyse et la synthèse de réponses de multiples IAs. Répondez TOUJOURS en français.

Analysez les réponses suivantes et fournissez une synthèse structurée suivant ce format:

**RÉPONSE SYNTHÈSE:**
Fournissez une réponse complète et définitive au prompt original, basée sur les informations des IAs spécialistes.

**ANALYSE COMPARATIVE:**
1. **Convergences**: Points où les IAs sont d'accord
2. **Divergences**: Différences importantes entre les réponses
3. **Points d'Attention**: Aspects importants ou limitations identifiées
4. **Qualité des Sources**: Évaluation de la fiabilité de chaque réponse

Soyez objectif, précis et maintenez un ton professionnel.`,
            'en': `You are Pretor AI, specialized in analyzing and synthesizing responses from multiple AIs. ALWAYS respond in English.

Analyze the following responses and provide a structured synthesis following this format:

**SYNTHESIS RESPONSE:**
Provide a complete and definitive response to the original prompt, based on information from the specialist AIs.

**COMPARATIVE ANALYSIS:**
1. **Convergences**: Points where the AIs agree
2. **Divergences**: Important differences between the responses
3. **Points of Attention**: Important aspects or limitations identified
4. **Source Quality**: Assessment of the reliability of each response

Be objective, precise and maintain a professional tone.`,
          };

          let enhancedSystemPrompt = systemPrompts[lang];

          if (recommendedAI && aiWeights) {
            const weightsInfo = `

**PESOS DAS IAs PARA ESTE PROMPT:**
${Object.entries(aiWeights).map(([ai, weight]) =>
  `- ${ai.toUpperCase()}: ${(weight * 100).toFixed(0)}% ${ai === recommendedAI ? '(MAIS ADEQUADA)' : ''}`
).join('\n')}

**INSTRUÇÕES DE SÍNTESE:**
- Considere TODAS as respostas das IAs
- Dê mais peso (${(aiWeights[recommendedAI] * 100).toFixed(0)}%) à resposta da ${recommendedAI.toUpperCase()} por ser mais adequada
- Não ignore as outras respostas, use-as para validação e complemento
- Identifique pontos fortes de cada IA na sua análise comparativa`;

            enhancedSystemPrompt += weightsInfo;
          }

          const synthesis = await aiService.synthesizeWithGemini(originalPrompt, responses, geminiKey, enhancedSystemPrompt);
          geminiAnalysis = synthesis;

          await storage.createAiResponse({
            promptId: storedPrompt.id,
            provider: 'gemini_synthesis',
            response: synthesis.content,
            responseTime: synthesis.responseTime,
            tokens: synthesis.tokens || 0,
            status: synthesis.error ? 'error' : 'success',
            error: synthesis.error,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          geminiAnalysis = {
            content: '',
            responseTime: 0,
            error: errorMessage,
          };
        }
      }

      const result = {
        promptId: storedPrompt.id,
        responses,
        llamaAnalysis: geminiAnalysis,
        success: true,
      };

      if (result.success) {
        await setCache(cacheKey, result, 1800);
      }

      res.json(result);

    } catch (error) {
      console.error('Analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(400).json({
        message: errorMessage,
        success: false,
      });
    }
  });

  // Chat mode — validated with Zod schema
  app.post("/api/chat", async (req, res) => {
    try {
      const { message } = chatSchema.parse(req.body);

      const apiKeys = {
        openrouter: process.env.OPENROUTER_API_KEY,
        groq: process.env.GROQ_API_KEY,
        cohere: process.env.COHERE_API_KEY,
        google: process.env.GEMINI_API_KEY,
      };

      const startTime = Date.now();
      const responses: Record<string, any> = {};
      const promises = [];

      if (apiKeys.openrouter) {
        promises.push(
          aiService.callOpenRouter(message, apiKeys.openrouter)
            .then(response => { responses.openrouter = response; })
            .catch(error => {
              responses.openrouter = { content: '', responseTime: 0, error: error.message };
            })
        );
      }

      if (apiKeys.groq) {
        promises.push(
          aiService.callGroq(message, apiKeys.groq)
            .then(response => { responses.groq = response; })
            .catch(error => {
              responses.groq = { content: '', responseTime: 0, error: error.message };
            })
        );
      }

      if (apiKeys.cohere) {
        promises.push(
          aiService.callCohere(message, apiKeys.cohere)
            .then(response => { responses.cohere = response; })
            .catch(error => {
              responses.cohere = { content: '', responseTime: 0, error: error.message };
            })
        );
      }

      if (apiKeys.google) {
        promises.push(
          aiService.callGoogle(message, apiKeys.google)
            .then(response => { responses.google = response; })
            .catch(error => {
              responses.google = { content: '', responseTime: 0, error: error.message };
            })
        );
      }

      await Promise.all(promises);

      res.json({
        success: true,
        responses
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos: ' + error.errors.map(e => e.message).join(', ')
        });
      }
      console.error('Chat error:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  // Image analysis with Gemini
  app.post("/api/analyze-image", async (req, res) => {
    const startTime = Date.now();

    try {
      const { prompt, image, provider = 'google' } = req.body;

      if (!prompt || !image) {
        return res.status(400).json({
          success: false,
          message: "Prompt e imagem são obrigatórios"
        });
      }

      if (provider !== 'google') {
        return res.status(400).json({
          success: false,
          message: "Apenas Google Gemini suporta análise de imagem"
        });
      }

      const googleKey = process.env.GEMINI_API_KEY;

      if (!googleKey) {
        return res.status(400).json({
          success: false,
          message: "Chave da API Google não configurada"
        });
      }

      try {
        const response = await aiService.callGoogleWithImage(prompt, image, googleKey);

        if (response.error) {
          return res.status(500).json({
            success: false,
            message: `Erro da API Gemini: ${response.error}`
          });
        }

        res.json({
          success: true,
          response: {
            content: response.content || 'Resposta vazia da API',
            responseTime: response.responseTime,
            tokens: response.tokens,
            error: response.error
          }
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido na análise';
        res.status(500).json({
          success: false,
          message: `Erro na análise da imagem: ${errorMessage}`
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
      res.status(500).json({
        success: false,
        message: errorMessage
      });
    }
  });

  // Advanced image analysis - Extract with Gemini then analyze with all AIs
  app.post("/api/analyze-image-advanced", async (req, res) => {
    const startTime = Date.now();

    try {
      const { prompt, image, selectedAI, aiWeights } = req.body;

      if (!prompt || !image) {
        return res.status(400).json({
          success: false,
          message: "Prompt e imagem são obrigatórios"
        });
      }

      const apiKeys = {
        openrouter: process.env.OPENROUTER_API_KEY,
        groq: process.env.GROQ_API_KEY,
        cohere: process.env.COHERE_API_KEY,
        google: process.env.GEMINI_API_KEY
      };

      if (!apiKeys.google) {
        return res.status(500).json({
          success: false,
          message: "Chave API do Google não configurada"
        });
      }

      // Extract image content with Gemini
      const extractionPrompt = `Analise esta imagem detalhadamente e descreva tudo o que você vê de forma clara e estruturada. Inclua:

      1. Objetos principais e secundários
      2. Pessoas (se houver) - ações, expressões, roupas
      3. Cenário e ambiente
      4. Cores dominantes e atmosfera
      5. Texto presente na imagem (se houver)
      6. Qualquer detalhe técnico relevante

      Seja específico e detalhado, pois esta descrição será usada por outras IAs para responder: <user_prompt>${prompt}</user_prompt>`;

      const imageData = await aiService.callGoogleWithImage(extractionPrompt, image, apiKeys.google);

      if (imageData.error) {
        return res.status(500).json({
          success: false,
          message: `Erro na extração da imagem: ${imageData.error}`
        });
      }

      // Send extracted content + user prompt to all AIs
      const enhancedPrompt = `Com base na seguinte descrição detalhada de uma imagem:

${imageData.content}

Por favor, responda à seguinte pergunta/solicitação do usuário: <user_prompt>${prompt}</user_prompt>

Use a descrição da imagem como contexto para fornecer uma resposta relevante e precisa.`;

      const responses: Record<string, any> = {};
      const promises: Promise<void>[] = [];

      if (apiKeys.openrouter) {
        promises.push(
          aiService.callOpenRouter(enhancedPrompt, apiKeys.openrouter)
            .then(response => { responses.openrouter = response; })
            .catch(error => {
              responses.openrouter = { content: '', responseTime: 0, error: error.message };
            })
        );
      }

      if (apiKeys.groq) {
        promises.push(
          aiService.callGroq(enhancedPrompt, apiKeys.groq)
            .then(response => { responses.groq = response; })
            .catch(error => {
              responses.groq = { content: '', responseTime: 0, error: error.message };
            })
        );
      }

      if (apiKeys.cohere) {
        promises.push(
          aiService.callCohere(enhancedPrompt, apiKeys.cohere)
            .then(response => { responses.cohere = response; })
            .catch(error => {
              responses.cohere = { content: '', responseTime: 0, error: error.message };
            })
        );
      }

      if (apiKeys.google) {
        promises.push(
          aiService.callGoogle(enhancedPrompt, apiKeys.google)
            .then(response => { responses.google = response; })
            .catch(error => {
              responses.google = { content: '', responseTime: 0, error: error.message };
            })
        );
      }

      await Promise.all(promises);

      // Create synthesis
      let synthesisResponse;
      try {
        synthesisResponse = await aiService.synthesizeWithGemini(prompt, responses, apiKeys.google);
      } catch (error) {
        synthesisResponse = {
          content: 'Erro na síntese das respostas',
          responseTime: 0,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        };
      }

      // Store the prompt and responses
      const savedPrompt = await storage.createPrompt({ content: prompt });

      const savePromises = Object.entries(responses).map(([provider, response]) =>
        storage.createAiResponse({
          promptId: savedPrompt.id,
          provider,
          response: response.content || '',
          responseTime: response.responseTime || 0,
          tokens: response.tokens || 0,
          status: response.error ? 'error' : 'success',
          error: response.error || null
        })
      );

      await Promise.all(savePromises);

      res.json({
        success: true,
        promptId: savedPrompt.id,
        responses,
        llamaAnalysis: synthesisResponse,
        imageExtraction: {
          content: imageData.content,
          responseTime: imageData.responseTime
        }
      });

    } catch (error) {
      console.error('Advanced image analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
      res.status(500).json({
        success: false,
        message: errorMessage
      });
    }
  });

  // Collaborative AI Mode Endpoints
  const collaborativeAI = new CollaborativeAIService();

  app.post("/api/collaborative-ai/initial", async (req, res) => {
    try {
      const { prompt } = req.body;

      if (!prompt || prompt.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: "Prompt deve ter pelo menos 10 caracteres"
        });
      }

      const responses = await collaborativeAI.generateInitialResponses(prompt);

      res.json({
        success: true,
        responses,
        round: 1,
        message: "Hipóteses iniciais geradas com sucesso"
      });

    } catch (error) {
      console.error('Erro na Rodada 1:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Erro na geração de hipóteses iniciais"
      });
    }
  });

  app.post("/api/collaborative-ai/refine", async (req, res) => {
    try {
      const { prompt, initialResponses } = req.body;

      if (!prompt || !initialResponses || !Array.isArray(initialResponses)) {
        return res.status(400).json({
          success: false,
          message: "Prompt e respostas iniciais são obrigatórios"
        });
      }

      const refinedResponses = await collaborativeAI.refineResponses(prompt, initialResponses);

      res.json({
        success: true,
        responses: refinedResponses,
        round: 2,
        message: "Refinamento cruzado concluído com sucesso"
      });

    } catch (error) {
      console.error('Erro na Rodada 2:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Erro no refinamento cruzado"
      });
    }
  });

  app.post("/api/collaborative-ai/synthesize", async (req, res) => {
    try {
      const { prompt, refinedResponses } = req.body;

      if (!prompt || !refinedResponses || !Array.isArray(refinedResponses)) {
        return res.status(400).json({
          success: false,
          message: "Prompt e respostas refinadas são obrigatórios"
        });
      }

      const synthesis = await collaborativeAI.generateFinalSynthesis(prompt, refinedResponses);

      res.json({
        success: true,
        synthesis,
        message: "Síntese colaborativa concluída com sucesso"
      });

    } catch (error) {
      console.error('Erro na Síntese Final:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Erro na síntese colaborativa"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
