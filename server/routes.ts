import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { promptAnalysisSchema, promptUnderstandingSchema, insertPromptSchema, insertAiResponseSchema } from "@shared/schema";
import { aiService } from "./services/ai-apis";
import { CollaborativeAIService } from "./services/collaborative-ai";
import { storage } from "./storage";
import { GeolocationService } from "./services/geolocation";
import { getCache, setCache, generateCacheKey } from "./services/cache";

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

  // Test Google API endpoint
  app.get("/api/test-google", async (req, res) => {
    try {
      const testPrompt = "Diga olá em português";
      console.log("Test prompt:", testPrompt); // Para verificar o que está sendo enviado

      const result = await aiService.callGoogle(testPrompt);

      console.log("Google API Result:", result); // Para verificar o resultado da chamada

      res.json({
        success: !result.error,
        message: result.error || "Google API funcionando corretamente",
        content: result.content,
        responseTime: result.responseTime,
        tokens: result.tokens
      });
    } catch (error) {
      console.error("Error in test-google:", error); // Para verificar o erro
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // API Status endpoint with live validation
  app.get("/api/status", async (req, res) => {
    try {
      // Check which API keys are available
      const apiKeys = {
        openrouter: process.env.OPENROUTER_API_KEY,
        groq: process.env.GROQ_API_KEY,
        cohere: process.env.COHERE_API_KEY,
        google: process.env.GEMINI_API_KEY,
        llama3: process.env.GROQ_API_KEY,
      };

      // Test each API with a simple prompt to verify tokens work
      const testPrompt = "Hello";
      const status: any = {};

      // Test OpenRouter
      if (apiKeys.openrouter) {
        try {
          const result = await aiService.callOpenRouter(testPrompt, apiKeys.openrouter);
          status.openrouter = {
            available: !result.error,
            message: result.error || "API connected successfully",
            responseTime: result.responseTime
          };
        } catch (error) {
          status.openrouter = {
            available: false,
            message: `API key invalid: ${error instanceof Error ? error.message : String(error)}`,
            responseTime: 0
          };
        }
      } else {
        status.openrouter = {
          available: false,
          message: "API key not configured"
        };
      }

      // Test Groq
      if (apiKeys.groq) {
        try {
          const result = await aiService.callGroq(testPrompt, apiKeys.groq);
          status.groq = {
            available: !result.error,
            message: result.error || "API connected successfully",
            responseTime: result.responseTime
          };
        } catch (error) {
          status.groq = {
            available: false,
            message: `API key invalid: ${error instanceof Error ? error.message : String(error)}`,
            responseTime: 0
          };
        }
      } else {
        status.groq = {
          available: false,
          message: "API key not configured"
        };
      }

      // Test Google
      if (apiKeys.google) {
        try {
          const result = await aiService.callGoogle(testPrompt, apiKeys.google);
          status.google = {
            available: !result.error,
            message: result.error || "API connected successfully",
            responseTime: result.responseTime
          };
        } catch (error) {
          status.google = {
            available: false,
            message: `API key invalid: ${error instanceof Error ? error.message : String(error)}`,
            responseTime: 0
          };
        }
      } else {
        status.google = {
          available: false,
          message: "API key not configured"
        };
      }

      // Test Llama3
      if (apiKeys.llama3) {
        try {
          const result = await aiService.callLlama3(testPrompt, apiKeys.llama3);
          status.llama3 = {
            available: !result.error,
            message: result.error || "API connected successfully",
            responseTime: result.responseTime
          };
        } catch (error) {
          status.llama3 = {
            available: false,
            message: `API key invalid: ${error instanceof Error ? error.message : String(error)}`,
            responseTime: 0
          };
        }
      } else {
        status.llama3 = {
          available: false,
          message: "API key not configured"
        };
      }

      // Test Cohere
      if (apiKeys.cohere) {
        try {
          const result = await aiService.callCohere(testPrompt, apiKeys.cohere);
          status.cohere = {
            available: !result.error,
            message: result.error || "API connected successfully",
            responseTime: result.responseTime
          };
        } catch (error) {
          status.cohere = {
            available: false,
            message: `API key invalid: ${error instanceof Error ? error.message : String(error)}`,
            responseTime: 0
          };
        }
      } else {
        status.cohere = {
          available: false,
          message: "API key not configured"
        };
      }

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

      // Verificar cache para entendimento
      const understandCacheKey = `understand:${Buffer.from(prompt).toString('base64').slice(0, 50)}`;
      const cachedUnderstanding = await getCache(understandCacheKey);
      
      if (cachedUnderstanding) {
        console.log('🎯 Understanding cache hit!');
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

      // System prompt for understanding and generating alternatives
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

      // Create a specialized prompt for understanding
      const understandingPrompt = `${systemPrompt}

PROMPT DO USUÁRIO: "${prompt}"

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
        // Try to parse the JSON response
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

        // Cache do entendimento por 1 hora
        await setCache(understandCacheKey, understandingResult, 3600);
        
        res.json(understandingResult);
      } catch (parseError) {
        // If JSON parsing fails, extract manually
        const content = response.content;
        const understandingMatch = content.match(/"understanding":\s*"([^"]+)"/);
        const alternativesMatch = content.match(/"alternatives":\s*\[(.*?)\]/);
        
        let alternatives: string[] = [];
        if (alternativesMatch) {
          const altText = alternativesMatch[1];
          alternatives = altText.match(/"([^"]+)"/g)?.map(alt => alt.slice(1, -1)) || [];
        }

        // Fallback with default weights
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

        // Cache do fallback por 1 hora
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
    console.log('🚀 Starting analysis request...');

    try {
      const { prompt: originalPrompt, apiKeys = {}, recommendedAI, aiWeights } = promptAnalysisSchema.parse(req.body);
      console.log('✅ Request body parsed successfully');

      // Validate prompt length
      if (!originalPrompt || originalPrompt.trim().length < 10) {
        console.log('❌ Prompt too short');
        return res.status(400).json({ 
          message: 'O prompt deve ter pelo menos 10 caracteres',
          success: false 
        });
      }

      // Verificar cache primeiro
      const cacheKey = generateCacheKey(originalPrompt, aiWeights);
      const cachedResult = await getCache(cacheKey);
      
      if (cachedResult) {
        console.log('🎯 Cache hit! Returning cached result');
        return res.json({
          ...cachedResult,
          cached: true,
          cacheHit: true
        });
      }
      
      console.log('💾 Cache miss, proceeding with analysis...');

      // Store the prompt
      const storedPrompt = await storage.createPrompt({ content: originalPrompt });
      console.log('💾 Prompt stored with ID:', storedPrompt.id);

      // Get API keys from environment (backend)
      const keys = {
        openrouter: process.env.OPENROUTER_API_KEY,
        groq: process.env.GROQ_API_KEY,
        cohere: process.env.COHERE_API_KEY,
        llama3: process.env.GROQ_API_KEY,
      };

      // Check available APIs
      const availableApis = Object.entries(keys).filter(([name, key]) => !!key);
      console.log('🔑 Available APIs:', availableApis.map(([name]) => name));

      if (availableApis.length === 0) {
        console.log('❌ No API keys available');
        return res.status(400).json({
          message: 'Nenhuma API configurada. Adicione pelo menos uma chave de API.',
          success: false
        });
      }

      // Call AI APIs in parallel with Llama3 included
      const aiProviders = [
        { name: 'openrouter', call: () => aiService.callOpenRouter(originalPrompt, keys.openrouter) },
        { name: 'groq', call: () => aiService.callGroq(originalPrompt, keys.groq) },
        { name: 'cohere', call: () => aiService.callCohere(originalPrompt, keys.cohere) },
        { name: 'llama3', call: () => aiService.callLlama3(originalPrompt, keys.llama3) },
      ];

      console.log('🔍 Available providers:', aiProviders.map(p => p.name));
      console.log('🔑 Llama3 key available:', !!keys.llama3);

      const responses: Record<string, any> = {};

      // Execute AI calls in parallel with timeout protection
      console.log('🤖 Starting AI provider calls...');

      const providerPromises = aiProviders
        .filter(provider => keys[provider.name as keyof typeof keys])
        .map(async provider => {
          console.log(`📡 Calling ${provider.name}...`);

          try {
            // Add timeout wrapper for each provider
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Provider timeout after 90 seconds')), 90000);
            });

            const response = await Promise.race([
              provider.call(),
              timeoutPromise
            ]) as any;

            console.log(`✅ ${provider.name} completed in ${response.responseTime}ms`);
            responses[provider.name] = response;

            // Store response in database
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
            console.log(`❌ ${provider.name} failed: ${errorMessage}`);

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

      // Wait for all API calls to complete with timeout
      console.log('⏳ Waiting for all AI calls to complete...');
      try {
        await Promise.allSettled(providerPromises);
        console.log('✅ All AI calls completed');
      } catch (error) {
        console.log('⚠️ Some AI calls may have timed out, continuing with available responses');
      }

      // Synthesize with Gemini if key is available
      let geminiAnalysis = null;
      const geminiKey = process.env.GEMINI_API_KEY;
      if (geminiKey) {
        try {
          console.log('🧠 Starting Gemini synthesis...');

          // Enhanced language detection
          const isPortuguese = /[áàâãéèêíìîóòôõúùûç]/i.test(originalPrompt) || 
                             /\b(que|como|quando|onde|por|para|com|sem|mas|porque|então|muito|mais|menos|bem|mal|sim|não|este|esta|isso|aquilo|qual|quais|quem|cujo|cuja)\b/i.test(originalPrompt);
          
          const isSpanish = !isPortuguese && (/[ñáéíóúü]/i.test(originalPrompt) || 
                           /\b(qué|cómo|cuándo|dónde|por|para|con|sin|pero|porque|entonces|muy|más|menos|bien|mal|sí|no|este|esta|esto|aquello|cual|cuales|quien|cuyo|cuya)\b/i.test(originalPrompt));
          
          const isFrench = !isPortuguese && !isSpanish && (/[àâäéèêëîïôöùûüÿç]/i.test(originalPrompt) || 
                          /\b(que|comment|quand|où|pour|avec|sans|mais|parce|alors|très|plus|moins|bien|mal|oui|non|ce|cette|ceci|cela)\b/i.test(originalPrompt));

          let systemPrompt = '';

          if (isPortuguese) {
            systemPrompt = `Você é a Pretor IA, especializada em analisar e sintetizar respostas de múltiplas IAs. SEMPRE responda na mesma lingua do prompt original.

Analise as seguintes respostas e forneça uma síntese estruturada seguindo este formato:

**RESPOSTA SÍNTESE:**
Forneça uma resposta completa e definitiva ao prompt original, baseada nas informações das IAs especialistas.

**ANÁLISE COMPARATIVA:**
1. **Convergências**: Pontos onde as IAs concordam
2. **Divergências**: Diferenças importantes entre as respostas  
3. **Pontos de Atenção**: Aspectos importantes ou limitações identificadas
4. **Qualidade das Fontes**: Avaliação da confiabilidade de cada resposta

Seja objetivo, preciso e mantenha um tom profissional.`;
          } else if (isSpanish) {
            systemPrompt = `Eres Pretor IA, especializada en analizar y sintetizar respuestas de múltiples IAs. SIEMPRE responde en español.

Analiza las siguientes respuestas y proporciona una síntesis estructurada siguiendo este formato:

**RESPUESTA SÍNTESIS:**
Proporciona una respuesta completa y definitiva al prompt original, basada en la información de las IAs especialistas.

**ANÁLISIS COMPARATIVO:**
1. **Convergencias**: Puntos donde las IAs están de acuerdo
2. **Divergencias**: Diferencias importantes entre las respuestas  
3. **Puntos de Atención**: Aspectos importantes o limitaciones identificadas
4. **Calidad de las Fuentes**: Evaluación de la confiabilidad de cada respuesta

Sé objetivo, preciso y mantén un tono profesional.`;
          } else if (isFrench) {
            systemPrompt = `Vous êtes Pretor IA, spécialisée dans l'analyse et la synthèse de réponses de multiples IAs. Répondez TOUJOURS en français.

Analysez les réponses suivantes et fournissez une synthèse structurée suivant ce format:

**RÉPONSE SYNTHÈSE:**
Fournissez une réponse complète et définitive au prompt original, basée sur les informations des IAs spécialistes.

**ANALYSE COMPARATIVE:**
1. **Convergences**: Points où les IAs sont d'accord
2. **Divergences**: Différences importantes entre les réponses  
3. **Points d'Attention**: Aspects importants ou limitations identifiées
4. **Qualité des Sources**: Évaluation de la fiabilité de chaque réponse

Soyez objectif, précis et maintenez un ton professionnel.`;
          } else {
            // Default to English
            systemPrompt = `You are Pretor AI, specialized in analyzing and synthesizing responses from multiple AIs. ALWAYS respond in English.

Analyze the following responses and provide a structured synthesis following this format:

**SYNTHESIS RESPONSE:**
Provide a complete and definitive response to the original prompt, based on information from the specialist AIs.

**COMPARATIVE ANALYSIS:**
1. **Convergences**: Points where the AIs agree
2. **Divergences**: Important differences between the responses  
3. **Points of Attention**: Important aspects or limitations identified
4. **Source Quality**: Assessment of the reliability of each response

Be objective, precise and maintain a professional tone.`;
          }

          // Enhanced system prompt with AI weights
          let enhancedSystemPrompt = systemPrompt;
          
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

          console.log('📝 Calling synthesis with AI weights...');
          const synthesis = await aiService.synthesizeWithGemini(originalPrompt, responses, geminiKey, enhancedSystemPrompt);
          console.log('✅ Gemini synthesis completed');
          geminiAnalysis = synthesis;

          // Store Gemini analysis
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
          console.log('❌ Gemini synthesis failed:', errorMessage);
          geminiAnalysis = {
            content: '',
            responseTime: 0,
            error: errorMessage,
          };
        }
      }

      console.log(`🎉 Analysis completed in ${Date.now() - startTime}ms`);

      const result = {
        promptId: storedPrompt.id,
        responses,
        llamaAnalysis: geminiAnalysis, // Mantém compatibilidade com frontend
        success: true,
      };

      // Armazenar no cache apenas se a análise foi bem-sucedida
      if (result.success) {
        await setCache(cacheKey, result, 1800); // Cache por 30 minutos
        console.log('💾 Result cached successfully');
      }

      res.json(result);

    } catch (error) {
      console.error('❌ Analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(400).json({ 
        message: errorMessage,
        success: false,
      });
    }
  });



  // Chat mode - send message to all AIs
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, conversationHistory } = req.body;
      
      if (!message) {
        return res.status(400).json({ 
          success: false, 
          message: "Mensagem é obrigatória" 
        });
      }

      const apiKeys = {
        openrouter: process.env.OPENROUTER_API_KEY,
        groq: process.env.GROQ_API_KEY,
        cohere: process.env.COHERE_API_KEY,
        google: process.env.GEMINI_API_KEY,
      };

      console.log('💬 Starting chat with all AIs...');
      const startTime = Date.now();

      const responses: Record<string, any> = {};
      const promises = [];

      // OpenRouter
      if (apiKeys.openrouter) {
        promises.push(
          aiService.callOpenRouter(message, apiKeys.openrouter)
            .then(response => { responses.openrouter = response; })
            .catch(error => { 
              responses.openrouter = { content: '', responseTime: 0, error: error.message }; 
            })
        );
      }

      // Groq
      if (apiKeys.groq) {
        promises.push(
          aiService.callGroq(message, apiKeys.groq)
            .then(response => { responses.groq = response; })
            .catch(error => { 
              responses.groq = { content: '', responseTime: 0, error: error.message }; 
            })
        );
      }

      // Cohere
      if (apiKeys.cohere) {
        promises.push(
          aiService.callCohere(message, apiKeys.cohere)
            .then(response => { responses.cohere = response; })
            .catch(error => { 
              responses.cohere = { content: '', responseTime: 0, error: error.message }; 
            })
        );
      }

      // Google Gemini
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

      console.log(`✅ Chat completed in ${Date.now() - startTime}ms`);
      
      res.json({
        success: true,
        responses
      });

    } catch (error) {
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
      console.log('🖼️ Received image analysis request');
      const { prompt, image, provider = 'google' } = req.body;
      
      if (!prompt || !image) {
        console.log('❌ Missing prompt or image');
        return res.status(400).json({ 
          success: false, 
          message: "Prompt e imagem são obrigatórios" 
        });
      }

      if (provider !== 'google') {
        console.log('❌ Invalid provider:', provider);
        return res.status(400).json({ 
          success: false, 
          message: "Apenas Google Gemini suporta análise de imagem" 
        });
      }

      const apiKeys = {
        google: process.env.GEMINI_API_KEY
      };

      if (!apiKeys.google) {
        console.log('❌ Google API key not configured');
        return res.status(400).json({ 
          success: false, 
          message: "Chave da API Google não configurada" 
        });
      }

      console.log('📝 Prompt length:', prompt.length);
      console.log('🖼️ Image size (bytes):', image.length);
      console.log('🔑 API key available:', !!apiKeys.google);
      console.log('🚀 Starting image analysis with Gemini...');

      try {
        const response = await aiService.callGoogleWithImage(prompt, image, apiKeys.google);
        
        const totalTime = Date.now() - startTime;
        console.log(`✅ Image analysis completed in ${totalTime}ms`);
        console.log('📊 Response length:', response.content?.length || 0);
        console.log('🔍 Response error:', response.error || 'none');
        
        if (response.error) {
          console.log('❌ AI Service returned error:', response.error);
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
        console.error('❌ AI Service call failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido na análise';
        res.status(500).json({ 
          success: false,
          message: `Erro na análise da imagem: ${errorMessage}` 
        });
      }

    } catch (error) {
      console.error('❌ Route error:', error);
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
      console.log('🖼️ Advanced image analysis started');
      const { prompt, image, selectedAI, aiWeights } = req.body;
      
      if (!prompt || !image) {
        return res.status(400).json({ 
          success: false, 
          message: "Prompt e imagem são obrigatórios" 
        });
      }

      // Step 1: Extract image content using Gemini
      console.log('🔍 Step 1: Extracting image content with Gemini...');
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
      
      Seja específico e detalhado, pois esta descrição será usada por outras IAs para responder: "${prompt}"`;

      const imageData = await aiService.callGoogleWithImage(extractionPrompt, image, apiKeys.google);
      
      if (imageData.error) {
        return res.status(500).json({ 
          success: false,
          message: `Erro na extração da imagem: ${imageData.error}` 
        });
      }

      console.log('✅ Image content extracted, length:', imageData.content?.length || 0);

      // Step 2: Send extracted content + user prompt to all AIs
      console.log('🤖 Step 2: Sending to all AIs...');
      
      const enhancedPrompt = `Com base na seguinte descrição detalhada de uma imagem:

${imageData.content}

Por favor, responda à seguinte pergunta/solicitação do usuário: ${prompt}

Use a descrição da imagem como contexto para fornecer uma resposta relevante e precisa.`;

      const responses: Record<string, any> = {};
      const promises: Promise<void>[] = [];

      // Call all available AIs with the enhanced prompt
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

      // Step 3: Create synthesis with selected AI or best weighted AI
      console.log('🔄 Step 3: Creating synthesis...');
      
      let synthesisResponse;
      const weights = aiWeights || { groq: 0.4, openrouter: 0.3, google: 0.2, cohere: 0.1 };
      
      try {
        if (selectedAI === 'gemini' && apiKeys.google) {
          synthesisResponse = await aiService.synthesizeWithGemini(prompt, responses, apiKeys.google);
        } else {
          synthesisResponse = await aiService.synthesizeWithOpenRouter(prompt, responses, apiKeys.openrouter);
        }
      } catch (error) {
        console.error('Synthesis error:', error);
        synthesisResponse = { 
          content: 'Erro na síntese das respostas', 
          responseTime: 0, 
          error: error instanceof Error ? error.message : 'Erro desconhecido' 
        };
      }

      // Store the prompt and responses
      const savedPrompt = await storage.createPrompt({ content: prompt });
      
      // Save all AI responses
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

      const totalTime = Date.now() - startTime;
      console.log(`✅ Advanced image analysis completed in ${totalTime}ms`);

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
      console.error('❌ Advanced image analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
      res.status(500).json({ 
        success: false,
        message: errorMessage 
      });
    }
  });

  // Collaborative AI Mode Endpoints
  const collaborativeAI = new CollaborativeAIService();

  // Rodada 1: Gerar hipóteses iniciais
  app.post("/api/collaborative-ai/initial", async (req, res) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt || prompt.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: "Prompt deve ter pelo menos 10 caracteres"
        });
      }

      console.log('🚀 Collaborative AI: Iniciando Rodada 1');
      const responses = await collaborativeAI.generateInitialResponses(prompt);

      res.json({
        success: true,
        responses,
        round: 1,
        message: "Hipóteses iniciais geradas com sucesso"
      });

    } catch (error) {
      console.error('❌ Erro na Rodada 1:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Erro na geração de hipóteses iniciais"
      });
    }
  });

  // Rodada 2: Refinamento cruzado
  app.post("/api/collaborative-ai/refine", async (req, res) => {
    try {
      const { prompt, initialResponses } = req.body;
      
      if (!prompt || !initialResponses || !Array.isArray(initialResponses)) {
        return res.status(400).json({
          success: false,
          message: "Prompt e respostas iniciais são obrigatórios"
        });
      }

      console.log('🔄 Collaborative AI: Iniciando Rodada 2');
      const refinedResponses = await collaborativeAI.refineResponses(prompt, initialResponses);

      res.json({
        success: true,
        responses: refinedResponses,
        round: 2,
        message: "Refinamento cruzado concluído com sucesso"
      });

    } catch (error) {
      console.error('❌ Erro na Rodada 2:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Erro no refinamento cruzado"
      });
    }
  });

  // Síntese final pelo Gemini
  app.post("/api/collaborative-ai/synthesize", async (req, res) => {
    try {
      const { prompt, refinedResponses } = req.body;
      
      if (!prompt || !refinedResponses || !Array.isArray(refinedResponses)) {
        return res.status(400).json({
          success: false,
          message: "Prompt e respostas refinadas são obrigatórios"
        });
      }

      console.log('🎯 Collaborative AI: Iniciando síntese final');
      const synthesis = await collaborativeAI.generateFinalSynthesis(prompt, refinedResponses);

      res.json({
        success: true,
        synthesis,
        message: "Síntese colaborativa concluída com sucesso"
      });

    } catch (error) {
      console.error('❌ Erro na síntese final:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Erro na síntese final"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}