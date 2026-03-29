import { createHash } from 'crypto';

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

// Shared language detection utility — single source of truth
export function detectLanguage(text: string): 'pt' | 'es' | 'fr' | 'en' {
  const isPortuguese = /[áàâãéèêíìîóòôõúùûç]/i.test(text) ||
    /\b(que|como|quando|onde|por|para|com|sem|mas|porque|então|muito|mais|menos|bem|mal|sim|não|este|esta|isso|aquilo|qual|quais|quem|cujo|cuja)\b/i.test(text);
  if (isPortuguese) return 'pt';

  const isSpanish = /[ñáéíóúü]/i.test(text) ||
    /\b(qué|cómo|cuándo|dónde|por|para|con|sin|pero|porque|entonces|muy|más|menos|bien|mal|sí|no|este|esta|esto|aquello|cual|cuales|quien|cuyo|cuya)\b/i.test(text);
  if (isSpanish) return 'es';

  const isFrench = /[àâäéèêëîïôöùûüÿç]/i.test(text) ||
    /\b(que|comment|quand|où|pour|avec|sans|mais|parce|alors|très|plus|moins|bien|mal|oui|non|ce|cette|ceci|cela)\b/i.test(text);
  if (isFrench) return 'fr';

  return 'en';
}

// SHA-256 hash helper for cache keys — non-reversible, collision-resistant
function hashForCache(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 32);
}

export class AIService {
  private extractSources(content: string): Array<{title: string; url: string; type: 'website' | 'document' | 'reference' | 'citation'; description?: string}> {
    const sources: Array<{title: string; url: string; type: 'website' | 'document' | 'reference' | 'citation'; description?: string}> = [];

    // Limit input length to prevent excessive regex processing
    const text = content.length > 50000 ? content.slice(0, 50000) : content;

    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
    const urls = (text.match(urlRegex) || []).map(url => {
      // Strip unbalanced trailing closing parens (e.g. from markdown `[title](url)` context)
      let result = url;
      while (result.endsWith(')') && (result.match(/\(/g) || []).length < (result.match(/\)/g) || []).length) {
        result = result.slice(0, -1);
      }
      return result;
    });

    const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    const markdownMatches = [];
    let match;
    while ((match = markdownLinkRegex.exec(text)) !== null) {
      markdownMatches.push(match);
    }

    const citationRegex = /(?:Source:|Reference:|Analyze:|Consult:)\s*([^\n]+)/gi;
    const citations = [];
    let citationMatch;
    while ((citationMatch = citationRegex.exec(text)) !== null) {
      citations.push(citationMatch);
    }

    // Markdown links first — title takes priority over bare domain name
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

    // Bare URLs — skip any already covered by a markdown link
    urls.forEach(url => {
      if (!sources.some(s => s.url === url)) {
        sources.push({
          title: this.extractDomainFromUrl(url),
          url: url,
          type: 'website'
        });
      }
    });

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

      return {
        content,
        responseTime: Date.now() - startTime,
        tokens: data.usage?.total_tokens,
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

  async callGroq(prompt: string, apiKey?: string, model: string = 'llama3-8b-8192'): Promise<AIResponse> {
    const startTime = Date.now();
    const key = apiKey || process.env.GROQ_API_KEY;

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

      return {
        content,
        responseTime: Date.now() - startTime,
        tokens: data.usage?.total_tokens,
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

    if (!key) {
      return {
        content: '',
        responseTime: Date.now() - startTime,
        error: 'Google API key not configured',
      };
    }

    try {
      // Use x-goog-api-key header instead of query parameter to avoid key exposure in logs
      const response = await this.makeRequest(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key,
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

  async callGoogleWithImage(prompt: string, imageBase64: string, apiKey?: string): Promise<AIResponse> {
    const startTime = Date.now();
    const key = apiKey || process.env.GEMINI_API_KEY;

    if (!key) {
      return {
        content: '',
        responseTime: Date.now() - startTime,
        error: 'Google Gemini API key not configured',
      };
    }

    try {
      const imageData = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      const mimeTypeMatch = imageBase64.match(/^data:(image\/[a-z]+);base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';

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

      // Use x-goog-api-key header instead of query parameter
      const response = await this.makeRequest(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return {
        content: content || 'Não foi possível obter resposta da API Gemini',
        responseTime: Date.now() - startTime,
        tokens: data.usageMetadata?.totalTokenCount,
        sources: this.extractSources(content),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
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

    if (!key) {
      return {
        content: '',
        responseTime: Date.now() - startTime,
        error: 'Llama3 API key not configured',
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
            model: 'llama3-70b-8192',
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
        throw new Error(`Llama3 API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      return {
        content,
        responseTime: Date.now() - startTime,
        tokens: data.usage?.total_tokens,
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
      const lang = detectLanguage(originalPrompt);

      const errorMessages: Record<string, string> = {
        'pt': 'Não foi possível gerar uma síntese pois nenhuma das IAs forneceu uma resposta válida.',
        'es': 'No fue posible generar una síntesis ya que ninguna de las IAs proporcionó una respuesta válida.',
        'fr': 'Impossible de générer une synthèse car aucune des IAs n\'a fourni une réponse valide.',
        'en': 'Unable to generate synthesis as none of the AIs provided a valid response.',
      };

      return {
        content: errorMessages[lang],
        responseTime: Date.now() - startTime,
        error: 'No valid responses to synthesize',
      };
    }

    // Build a clean synthesis prompt
    const responsesText = validResponses.map(([provider, response]) =>
      `**${provider.toUpperCase()}:**
${response.content.trim()}

`).join('\n');

    // Use XML delimiters to separate user prompt from system context (prompt injection mitigation)
    const synthesisPrompt = `${systemPrompt || 'Você é a Pretor IA, especializada em analisar e sintetizar respostas de múltiplas IAs.'}

<user_prompt>${originalPrompt}</user_prompt>

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
      // Use x-goog-api-key header instead of query parameter
      const response = await this.makeRequest(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key,
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
