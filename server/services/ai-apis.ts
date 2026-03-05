interface AIResponse {
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
}

import { setCache } from './cache'; // Import cache functions

export class AIService {
  private extractSources(content: string): Array<{title: string; url: string; type: 'website' | 'document' | 'reference' | 'citation'; description?: string}> {
    const sources: Array<{title: string; url: string; type: 'website' | 'document' | 'reference' | 'citation'; description?: string}> = [];

    // Regex to completed URLs
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
    const urls = content.match(urlRegex) || [];

    // Regex to format references [texto](url)
    const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    const markdownMatches = [];
    let match;
    while ((match = markdownLinkRegex.exec(content)) !== null) {
      markdownMatches.push(match);
    }

    // Regex to academic citations
    const citationRegex = /(?:Source:|Reference:|Analyze:|Consult:)\s*([^\n.]+)/gi;
    const citations = [];
    let citationMatch;
    while ((citationMatch = citationRegex.exec(content)) !== null) {
      citations.push(citationMatch);
    }

    // Process direct URLs
    urls.forEach(url => {
      if (!sources.some(s => s.url === url)) {
        sources.push({
          title: this.extractDomainFromUrl(url),
          url: url,
          type: 'website'
        });
      }
    });

    // Process markdown links
    markdownMatches.forEach(match => {
      const [, title, url] = match;
      if (!sources.some(s => s.url === url)) {
        sources.push({
          title: title.trim(),
          url: url,
          type: 'website'
        });
      }
    });

    // Processar citações
    citations.forEach(match => {
      const [, citation] = match;
      sources.push({
        title: citation.trim(),
        url: '#citation',
        type: 'citation',
        description: citation.trim()
      });
    });

    return sources;
  }

  private extractDomainFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'Link externo';
    }
  }

  private async makeRequest(url: string, options: RequestInit, timeout = 90000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw new Error(`Network error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async callOpenRouter(prompt: string, model?: string, apiKey?: string): Promise<AIResponse> {
    const startTime = Date.now();
    const key = apiKey || process.env.OPENROUTER_API_KEY;
    const selectedModel = model || 'meta-llama/llama-3.1-8b-instruct:free';
    const cacheKey = `openrouter:${prompt}:${key}:${selectedModel}`; // Unique key for the prompt, API key and model

    // Check cache first
    // const cachedResponse = await getCache(cacheKey);
    // if (cachedResponse) {
    //   console.log(`Cache hit for OpenRouter: ${prompt.substring(0, 20)}...`);
    //   return cachedResponse as AIResponse;
    // }

    if (!key) {
      return {
        content: '',
        responseTime: Date.now() - startTime,
        error: 'OpenRouter API key not configured',
      };
    }

    try {
      const response = await this.makeRequest(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'HTTP-Referer': process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000',
            'X-Title': 'AI Comparator',
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ]
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      const result = {
        content,
        responseTime: Date.now() - startTime,
        tokens: data.usage?.total_tokens,
        sources: this.extractSources(content),
      };

      // Cache por 15 minutos
      await setCache(cacheKey, result, 900);

      return result;
    } catch (error) {
      return {
        content: '',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async callGroq(prompt: string, apiKey?: string, model: string = 'llama3-8b-8192'): Promise<AIResponse> {
    const startTime = Date.now();
    const key = apiKey || process.env.GROQ_API_KEY;
    const cacheKey = `groq:${prompt}:${apiKey}:${model}`; // Unique key for the prompt, API key and model

    // Check cache first
    // const cachedResponse = await getCache(cacheKey);
    // if (cachedResponse) {
    //   console.log(`Cache hit for Groq: ${prompt.substring(0, 20)}...`);
    //   return cachedResponse as AIResponse;
    // }

    if (!key) {
      return {
        content: '',
        responseTime: Date.now() - startTime,
        error: 'Groq API key not configured',
      };
    }

    try {
      const response = await this.makeRequest(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ]
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      const result = {
        content,
        responseTime: Date.now() - startTime,
        tokens: data.usage?.total_tokens,
        sources: this.extractSources(content),
      };

      // Cache por 15 minutos
      await setCache(cacheKey, result, 900);

      return result;
    } catch (error) {
      return {
        content: '',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async callCohere(prompt: string, apiKey?: string): Promise<AIResponse> {
    const startTime = Date.now();
    const key = apiKey || process.env.COHERE_API_KEY;

    if (!key) {
      return {
        content: '',
        responseTime: Date.now() - startTime,
        error: 'Cohere API key not configured',
      };
    }

    try {
      const response = await this.makeRequest(
        'https://api.cohere.ai/v1/generate',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: 'command',
            prompt: prompt,
            max_tokens: 500,
            temperature: 0.7,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Cohere API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.generations?.[0]?.text || '';

      return {
        content,
        responseTime: Date.now() - startTime,
        tokens: data.meta?.tokens?.output_tokens,
        sources: this.extractSources(content),
      };
    } catch (error) {
      return {
        content: '',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async callGoogle(prompt: string, apiKey?: string): Promise<AIResponse> {
    const startTime = Date.now();
    const key = apiKey || process.env.GEMINI_API_KEY;
    const cacheKey = `google:${prompt}:${apiKey}`; // Unique key for the prompt and API key

    // Check cache first
    // const cachedResponse = await getCache(cacheKey);
    // if (cachedResponse) {
    //   console.log(`Cache hit for Google: ${prompt.substring(0, 20)}...`);
    //   return cachedResponse as AIResponse;
    // }

    if (!key) {
      return {
        content: '',
        responseTime: Date.now() - startTime,
        error: 'Google API key not configured',
      };
    }

    try {
      const response = await this.makeRequest(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Google API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      const result = {
        content,
        responseTime: Date.now() - startTime,
        tokens: data.usageMetadata?.totalTokenCount,
        sources: this.extractSources(content),
      };

      // Cache por 15 minutos
      await setCache(cacheKey, result, 900);

      return result;
    } catch (error) {
      return {
        content: '',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async callGoogleWithImage(prompt: string, imageBase64: string, apiKey?: string): Promise<AIResponse> {
    const startTime = Date.now();
    const key = apiKey || process.env.GEMINI_API_KEY;

    console.log('🔍 callGoogleWithImage started');
    console.log('📝 Prompt:', prompt.substring(0, 100) + '...');
    console.log('🖼️ Image base64 length:', imageBase64.length);
    console.log('🔑 API key available:', !!key);

    if (!key) {
      console.log('❌ No API key provided');
      return {
        content: '',
        responseTime: Date.now() - startTime,
        error: 'Google Gemini API key not configured',
      };
    }

    try {
      // Extract base64 data and mime type from data URL
      const imageData = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      const mimeTypeMatch = imageBase64.match(/^data:(image\/[a-z]+);base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';

      console.log('🔍 Extracted mime type:', mimeType);
      console.log('📊 Image data length after processing:', imageData.length);

      const requestBody = {
        contents: [{
          parts: [
            {
              text: prompt
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageData
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      };

      console.log('📡 Making request to Gemini API...');

      const response = await this.makeRequest(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      console.log('📡 Gemini API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Gemini API error response:', errorText);
        throw new Error(`Google Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📊 Gemini API response data:', JSON.stringify(data, null, 2));

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('✅ Extracted content length:', content.length);

      if (!content) {
        console.log('⚠️ Warning: Empty content from Gemini API');
        console.log('📊 Full response structure:', JSON.stringify(data, null, 2));
      }

      return {
        content: content || 'Não foi possível obter resposta da API Gemini',
        responseTime: Date.now() - startTime,
        tokens: data.usageMetadata?.totalTokenCount,
        sources: this.extractSources(content),
      };
    } catch (error) {
      console.error('❌ Error in callGoogleWithImage:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('📊 Error details:', errorMessage);

      return {
        content: '',
        responseTime: Date.now() - startTime,
        error: errorMessage,
      };
    }
  }

  async callLlama3(prompt: string, apiKey?: string): Promise<AIResponse> {
    const startTime = Date.now();
    const key = apiKey || process.env.GROQ_API_KEY;
    const cacheKey = `llama3:${prompt}:${apiKey}`; // Unique key for the prompt and API key

    // Check cache first
    // const cachedResponse = await getCache(cacheKey);
    // if (cachedResponse) {
    //   console.log(`Cache hit for Llama3: ${prompt.substring(0, 20)}...`);
    //   return cachedResponse as AIResponse;
    // }

    if (!key) {
      console.log('❌ Llama3: No API key configured');
      return {
        content: '',
        responseTime: Date.now() - startTime,
        error: 'Llama3 API key not configured',
      };
    }

    try {
      console.log('📡 Llama3: Making request...');
      const response = await this.makeRequest(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: 'llama3-70b-8192', // Usar modelo específico do Llama3
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 1000
          }),
        }
      );

      if (!response.ok) {
        console.log(`❌ Llama3: API error ${response.status}`);
        throw new Error(`Llama3 API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      const result = {
        content,
        responseTime: Date.now() - startTime,
        tokens: data.usage?.total_tokens,
        sources: this.extractSources(content),
      };

      // Cache por 15 minutos
      await setCache(cacheKey, result, 900);

      return result;
    } catch (error) {
      console.log('❌ Llama3: Error:', error instanceof Error ? error.message : String(error));
      return {
        content: '',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async synthesizeWithOpenRouter(originalPrompt: string, responses: Record<string, AIResponse>, apiKey?: string, systemPrompt?: string): Promise<AIResponse> {
    const startTime = Date.now();
    const key = apiKey || process.env.OPENROUTER_API_KEY;

    if (!key) {
      return {
        content: '',
        responseTime: Date.now() - startTime,
        error: 'OpenRouter API key not configured for synthesis',
      };
    }

    // Filter out responses with errors and ensure we have valid content
    const validResponses = Object.entries(responses).filter(([_, response]) => 
      !response.error && response.content && response.content.trim().length > 0
    );

    if (validResponses.length === 0) {
      // Detect language for error message
      const isPortuguese = /[áàâãéèêíìîóòôõúùûç]/i.test(originalPrompt) || 
                          /\b(que|como|quando|onde|por|para|com|sem|mas|porque|então|muito|mais|menos|bem|mal|sim|não|este|esta|isso|aquilo)\b/i.test(originalPrompt);
      const isSpanish = !isPortuguese && (/[ñáéíóúü]/i.test(originalPrompt) || 
                       /\b(qué|cómo|cuándo|dónde|por|para|con|sin|pero|porque|entonces|muy|más|menos|bien|mal|sí|no|este|esta|esto|aquello)\b/i.test(originalPrompt));
      const isFrench = !isPortuguese && !isSpanish && (/[àâäéèêëîïôöùûüÿç]/i.test(originalPrompt) || 
                      /\b(que|comment|quand|où|pour|avec|sans|mais|parce|alors|très|plus|moins|bien|mal|oui|non|ce|cette|ceci|cela)\b/i.test(originalPrompt));

      let errorMessage = 'Unable to generate synthesis as none of the AIs provided a valid response.';
      if (isPortuguese) {
        errorMessage = 'Não foi possível gerar uma síntese pois nenhuma das IAs forneceu uma resposta válida.';
      } else if (isSpanish) {
        errorMessage = 'No fue posible generar una síntesis ya que ninguna de las IAs proporcionó una respuesta válida.';
      } else if (isFrench) {
        errorMessage = 'Impossible de générer une synthèse car aucune des IAs n\'a fourni une réponse valide.';
      }

      return {
        content: errorMessage,
        responseTime: Date.now() - startTime,
        error: 'No valid responses to synthesize',
      };
    }

    // Build a clean synthesis prompt
    const responsesText = validResponses.map(([provider, response]) => 
      `**${provider.toUpperCase()}:**
${response.content.trim()}

`).join('\n');

    const synthesisPrompt = `Você é a Pretor IA, especializada em analisar e sintetizar respostas de múltiplas IAs.

PROMPT ORIGINAL: "${originalPrompt}"

RESPOSTAS DAS IAS ESPECIALISTAS:
${responsesText}

TAREFA: Analise as respostas acima e forneça uma síntese estruturada seguindo este formato:

**RESPOSTA SÍNTESE:**
Forneça uma resposta completa e definitiva ao prompt original, baseada nas informações das IAs especialistas.

**ANÁLISE COMPARATIVA:**
1. **Convergências**: Pontos onde as IAs concordam
2. **Divergências**: Diferenças importantes entre as respostas  
3. **Pontos de Atenção**: Aspectos importantes ou limitações identificadas
4. **Qualidade das Fontes**: Avaliação da confiabilidade de cada resposta

Seja objetivo, preciso e mantenha um tom profissional.`;

    try {
      console.log('🔍 Debug - Original prompt:', originalPrompt);
      console.log('🔍 Debug - Responses count:', validResponses.length);
      console.log('🔍 Debug - Response keys:', validResponses.map(([key]) => key));

      // Log response lengths for debugging
      validResponses.forEach(([provider, response]) => {
        console.log(`🔍 Debug - ${provider} content length:`, response.content.length);
      });

      console.log('🔍 Debug - Complete prompt length:', synthesisPrompt.length);
      console.log('🔍 Debug - Complete prompt preview:', synthesisPrompt.substring(0, 500) + '...');

      const response = await this.makeRequest(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'HTTP-Referer': process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000',
            'X-Title': 'AI Comparator - Synthesis',
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-3.1-8b-instruct:free',
            messages: [
              {
                role: 'system',
                content: systemPrompt || 'You are an assistant specialized in synthesis and comparative analysis of multiple AI responses. Always respond clearly and in a structured manner in the same language as the original prompt.'
              },
              {
                role: 'user',
                content: synthesisPrompt
              }
            ],
            temperature: 0.7,
            max_tokens: 2000
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`OpenRouter synthesis error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      return {
        content,
        responseTime: Date.now() - startTime,
        tokens: data.usageMetadata?.totalTokenCount,
        sources: this.extractSources(content),
      };
    } catch (error) {
      return {
        content: '',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async synthesizeWithGemini(originalPrompt: string, responses: Record<string, AIResponse>, apiKey?: string, systemPrompt?: string): Promise<AIResponse> {
    const startTime = Date.now();
    const key = apiKey || process.env.GEMINI_API_KEY;

    if (!key) {
      return {
        content: '',
        responseTime: Date.now() - startTime,
        error: 'Gemini API key not configured for synthesis',
      };
    }

    // Filter out responses with errors and ensure we have valid content
    const validResponses = Object.entries(responses).filter(([_, response]) => 
      !response.error && response.content && response.content.trim().length > 0
    );

    if (validResponses.length === 0) {
      // Detect language for error message
      const isPortuguese = /[áàâãéèêíìîóòôõúùûç]/i.test(originalPrompt) || 
                          /\b(que|como|quando|onde|por|para|com|sem|mas|porque|então|muito|mais|menos|bem|mal|sim|não|este|esta|isso|aquilo)\b/i.test(originalPrompt);
      const isSpanish = !isPortuguese && (/[ñáéíóúü]/i.test(originalPrompt) || 
                       /\b(qué|cómo|cuándo|dónde|por|para|con|sin|pero|porque|entonces|muy|más|menos|bien|mal|sí|no|este|esta|esto|aquello)\b/i.test(originalPrompt));
      const isFrench = !isPortuguese && !isSpanish && (/[àâäéèêëîïôöùûüÿç]/i.test(originalPrompt) || 
                      /\b(que|comment|quand|où|pour|avec|sans|mais|parce|alors|très|plus|moins|bien|mal|oui|non|ce|cette|ceci|cela)\b/i.test(originalPrompt));

      let errorMessage = 'Unable to generate synthesis as none of the AIs provided a valid response.';
      if (isPortuguese) {
        errorMessage = 'Não foi possível gerar uma síntese pois nenhuma das IAs forneceu uma resposta válida.';
      } else if (isSpanish) {
        errorMessage = 'No fue posible generar una síntesis ya que ninguna de las IAs proporcionó una respuesta válida.';
      } else if (isFrench) {
        errorMessage = 'Impossible de générer une synthèse car aucune des IAs n\'a fourni une réponse valide.';
      }

      return {
        content: errorMessage,
        responseTime: Date.now() - startTime,
        error: 'No valid responses to synthesize',
      };
    }

    // Build a clean synthesis prompt
    const responsesText = validResponses.map(([provider, response]) => 
      `**${provider.toUpperCase()}:**
${response.content.trim()}

`).join('\n');

    const synthesisPrompt = `${systemPrompt || 'Você é a Pretor IA, especializada em analisar e sintetizar respostas de múltiplas IAs.'}

PROMPT ORIGINAL: "${originalPrompt}"

RESPOSTAS DAS IAS ESPECIALISTAS:
${responsesText}

TAREFA: Analise as respostas acima e forneça uma síntese estruturada seguindo este formato:

**RESPOSTA SÍNTESE:**
Forneça uma resposta completa e definitiva ao prompt original, baseada nas informações das IAs especialistas.

**ANÁLISE COMPARATIVA:**
1. **Convergências**: Pontos onde as IAs concordam
2. **Divergências**: Diferenças importantes entre as respostas  
3. **Pontos de Atenção**: Aspectos importantes ou limitações identificadas
4. **Qualidade das Fontes**: Avaliação da confiabilidade de cada resposta

Seja objetivo, preciso e mantenha um tom profissional.`;

    try {
      const response = await this.makeRequest(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: synthesisPrompt
              }]
            }]
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini synthesis error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return {
        content,
        responseTime: Date.now() - startTime,
        tokens: data.usageMetadata?.totalTokenCount,
        sources: this.extractSources(content),
      };
    } catch (error) {
      return {
        content: '',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export const aiService = new AIService();