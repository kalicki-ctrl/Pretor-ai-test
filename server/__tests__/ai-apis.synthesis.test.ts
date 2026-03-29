import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIService, detectLanguage } from '../services/ai-apis.js';

// Test response helpers
const validResponse = { content: 'Some valid response', responseTime: 100 };
const errorResponse = { content: '', error: 'API failed', responseTime: 0 };

const GEMINI_OK_BODY = {
  candidates: [{ content: { parts: [{ text: 'synthesis result' }] } }],
  usageMetadata: { totalTokenCount: 42 },
};

function makeFetchMock(options: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  responseBody?: unknown;
} = {}) {
  const { ok = true, status = 200, statusText = 'OK', responseBody = GEMINI_OK_BODY } = options;
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText,
    json: async () => responseBody,
    text: async () => JSON.stringify(responseBody),
  });
}

interface CapturedRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

function makeCapturingFetchMock(captured: CapturedRequest, responseBody: unknown = GEMINI_OK_BODY) {
  return vi.fn().mockImplementation((url: string, init: RequestInit) => {
    captured.url = url;
    captured.headers = (init.headers ?? {}) as Record<string, string>;
    captured.body = init.body as string;
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => responseBody,
      text: async () => JSON.stringify(responseBody),
    });
  });
}

describe('synthesizeWithGemini', () => {
  let service: AIService;
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    service = new AIService();
    vi.stubGlobal('fetch', makeFetchMock());
    process.env.GEMINI_API_KEY = 'test-key-123';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  it('returns language-appropriate error when responses are empty', async () => {
    const result = await service.synthesizeWithGemini('What is AI?', {});
    expect(result.error).toBe('No valid responses to synthesize');
    expect(result.content).toBeTruthy();
  });

  it('returns language-appropriate error when all responses have errors', async () => {
    const result = await service.synthesizeWithGemini('What is AI?', {
      model1: errorResponse,
      model2: { content: '', error: 'timeout', responseTime: 0 },
    });
    expect(result.error).toBe('No valid responses to synthesize');
    expect(result.content).toContain('Unable to generate synthesis');
  });

  it('returns Portuguese error message for Portuguese prompt', async () => {
    const result = await service.synthesizeWithGemini('Qual é a capital do Brasil?', {});
    expect(result.error).toBe('No valid responses to synthesize');
    expect(result.content).toContain('Não foi possível');
  });

  it('returns Spanish error message for Spanish prompt', async () => {
    // detectLanguage checks Portuguese first; avoid accented vowels shared with PT to reach the Spanish branch
    const result = await service.synthesizeWithGemini('El nino juega pero sin dinero entonces bien', {});
    expect(result.error).toBe('No valid responses to synthesize');
    expect(result.content).toContain('No fue posible');
  });

  it('returns error when Gemini API key is not configured', async () => {
    delete process.env.GEMINI_API_KEY;
    const result = await service.synthesizeWithGemini('Hello', { model1: validResponse });
    expect(result.error).toBe('Gemini API key not configured for synthesis');
    expect(result.content).toBe('');
  });

  it('uses explicit apiKey param over env var', async () => {
    delete process.env.GEMINI_API_KEY;
    const captured: CapturedRequest = { url: '', headers: {}, body: '' };
    vi.stubGlobal('fetch', makeCapturingFetchMock(captured));

    await service.synthesizeWithGemini('Hello', { model1: validResponse }, 'explicit-key');
    expect(captured.headers['x-goog-api-key']).toBe('explicit-key');
  });

  it('only sends valid responses to Gemini synthesis prompt', async () => {
    const captured: CapturedRequest = { url: '', headers: {}, body: '' };
    vi.stubGlobal('fetch', makeCapturingFetchMock(captured));

    await service.synthesizeWithGemini('test prompt', {
      goodModel: validResponse,
      badModel: errorResponse,
    });

    const sentText: string = JSON.parse(captured.body).contents[0].parts[0].text;
    expect(sentText).toContain('GOODMODEL');
    expect(sentText).not.toContain('BADMODEL');
  });

  it('sends x-goog-api-key header rather than URL query parameter', async () => {
    const captured: CapturedRequest = { url: '', headers: {}, body: '' };
    vi.stubGlobal('fetch', makeCapturingFetchMock(captured));

    await service.synthesizeWithGemini('Hello', { model1: validResponse });

    expect(captured.headers['x-goog-api-key']).toBe('test-key-123');
    expect(captured.url).not.toContain('key=');
    expect(captured.url).not.toContain('test-key-123');
  });

  it('includes custom systemPrompt in the text sent to Gemini', async () => {
    const captured: CapturedRequest = { url: '', headers: {}, body: '' };
    vi.stubGlobal('fetch', makeCapturingFetchMock(captured));

    const customPrompt = 'You are a specialized legal AI summarizer.';
    await service.synthesizeWithGemini('test', { model1: validResponse }, undefined, customPrompt);

    const sentText: string = JSON.parse(captured.body).contents[0].parts[0].text;
    expect(sentText).toContain(customPrompt);
  });

  it('returns synthesized content from Gemini response', async () => {
    const result = await service.synthesizeWithGemini('Hello', { model1: validResponse });
    expect(result.content).toBe('synthesis result');
    expect(result.error).toBeUndefined();
  });

  it('returns empty content when Gemini response has no candidates', async () => {
    vi.stubGlobal('fetch', makeFetchMock({ responseBody: { candidates: [] } }));

    const result = await service.synthesizeWithGemini('Hello', { model1: validResponse });
    expect(result.content).toBe('');
    expect(result.error).toBeUndefined();
  });

  it('returns error object without throwing when Gemini returns 500', async () => {
    vi.stubGlobal('fetch', makeFetchMock({ ok: false, status: 500, statusText: 'Internal Server Error' }));

    const result = await service.synthesizeWithGemini('Hello', { model1: validResponse });
    expect(result.content).toBe('');
    expect(result.error).toMatch(/500/);
  });

  it('returns error object without throwing when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    const result = await service.synthesizeWithGemini('Hello', { model1: validResponse });
    expect(result.content).toBe('');
    expect(result.error).toContain('Network failure');
  });

  it('returns English error message for English prompt', async () => {
    const result = await service.synthesizeWithGemini('What is the meaning of life?', {});
    expect(result.content).toContain('Unable to generate synthesis');
  });

  it('returns French error message for French prompt', async () => {
    // detectLanguage checks Portuguese first; avoid accented vowels shared with PT to reach the French branch
    const result = await service.synthesizeWithGemini('Bonjour avec oui non cela ceci', {});
    expect(result.error).toBe('No valid responses to synthesize');
    expect(result.content).toContain('Impossible de');
  });
});

describe('detectLanguage', () => {
  it('detects Portuguese', () => {
    expect(detectLanguage('Qual é a capital do Brasil?')).toBe('pt');
    expect(detectLanguage('Não foi possível gerar')).toBe('pt');
  });

  it('detects Spanish', () => {
    // detectLanguage checks Portuguese first; avoid accented vowels shared with PT to reach the Spanish branch
    expect(detectLanguage('El nino juega pero sin dinero entonces bien')).toBe('es');
  });

  it('detects French', () => {
    // detectLanguage checks Portuguese first; avoid accented vowels shared with PT to reach the French branch
    expect(detectLanguage('Bonjour avec oui non cela ceci')).toBe('fr');
  });

  it('defaults to English', () => {
    expect(detectLanguage('What is the capital of France?')).toBe('en');
    expect(detectLanguage('Hello world')).toBe('en');
  });
});
