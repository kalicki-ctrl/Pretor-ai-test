import { describe, it, expect, vi, afterEach } from 'vitest';
import { AIService } from '../services/ai-apis';

// Helper to create mock fetch responses
function mockFetchResponse(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GROQ_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.COHERE_API_KEY;
  delete process.env.GEMINI_API_KEY;
});

describe('callGroq', () => {
  it('returns error object when no API key (no env var, no param)', async () => {
    const service = new AIService();
    const result = await service.callGroq('hello');
    expect(result.content).toBe('');
    expect(result.error).toBe('Groq API key not configured');
  });

  it('sends POST to https://api.groq.com/openai/v1/chat/completions', async () => {
    const fetchMock = mockFetchResponse({
      choices: [{ message: { content: 'test response' } }],
      usage: { total_tokens: 10 },
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    await service.callGroq('hello', 'test-key');

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
  });

  it('sends Authorization header with Bearer token', async () => {
    const fetchMock = mockFetchResponse({
      choices: [{ message: { content: 'hi' } }],
      usage: { total_tokens: 5 },
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    await service.callGroq('hello', 'my-groq-key');

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers?.Authorization).toBe('Bearer my-groq-key');
  });

  it('returns content from data.choices[0].message.content', async () => {
    const fetchMock = mockFetchResponse({
      choices: [{ message: { content: 'groq answer' } }],
      usage: { total_tokens: 8 },
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    const result = await service.callGroq('hello', 'test-key');

    expect(result.content).toBe('groq answer');
    expect(result.error).toBeUndefined();
  });

  it('returns error when HTTP status is 400', async () => {
    const fetchMock = mockFetchResponse({ error: 'bad request' }, false, 400);
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    const result = await service.callGroq('hello', 'test-key');

    expect(result.content).toBe('');
    expect(result.error).toContain('400');
  });

  it('uses default model llama3-8b-8192', async () => {
    const fetchMock = mockFetchResponse({
      choices: [{ message: { content: 'ok' } }],
      usage: { total_tokens: 3 },
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    await service.callGroq('hello', 'test-key');

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.model).toBe('llama3-8b-8192');
  });

  it('accepts a custom model parameter', async () => {
    const fetchMock = mockFetchResponse({
      choices: [{ message: { content: 'ok' } }],
      usage: { total_tokens: 3 },
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    await service.callGroq('hello', 'test-key', 'mixtral-8x7b-32768');

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.model).toBe('mixtral-8x7b-32768');
  });

  it('reads API key from environment variable', async () => {
    process.env.GROQ_API_KEY = 'env-groq-key';
    const fetchMock = mockFetchResponse({
      choices: [{ message: { content: 'from env' } }],
      usage: { total_tokens: 3 },
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    const result = await service.callGroq('hello');

    expect(result.content).toBe('from env');
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers?.Authorization).toBe('Bearer env-groq-key');
  });
});

describe('callOpenRouter', () => {
  it('returns error when no API key', async () => {
    const service = new AIService();
    const result = await service.callOpenRouter('hello');
    expect(result.content).toBe('');
    expect(result.error).toBe('OpenRouter API key not configured');
  });

  it('sends POST to the correct URL', async () => {
    const fetchMock = mockFetchResponse({
      choices: [{ message: { content: 'openrouter response' } }],
      usage: { total_tokens: 10 },
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    await service.callOpenRouter('hello', undefined, 'or-key');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
  });

  it('uses default model meta-llama/llama-3.1-8b-instruct:free', async () => {
    const fetchMock = mockFetchResponse({
      choices: [{ message: { content: 'ok' } }],
      usage: { total_tokens: 3 },
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    await service.callOpenRouter('hello', undefined, 'or-key');

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.model).toBe('meta-llama/llama-3.1-8b-instruct:free');
  });

  it('returns content from choices[0].message.content', async () => {
    const fetchMock = mockFetchResponse({
      choices: [{ message: { content: 'openrouter answer' } }],
      usage: { total_tokens: 5 },
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    const result = await service.callOpenRouter('hello', undefined, 'or-key');

    expect(result.content).toBe('openrouter answer');
    expect(result.error).toBeUndefined();
  });

  it('reads API key from environment variable', async () => {
    process.env.OPENROUTER_API_KEY = 'env-or-key';
    const fetchMock = mockFetchResponse({
      choices: [{ message: { content: 'from env' } }],
      usage: { total_tokens: 3 },
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    const result = await service.callOpenRouter('hello');

    expect(result.content).toBe('from env');
  });
});

describe('callCohere', () => {
  it('returns error when no API key', async () => {
    const service = new AIService();
    const result = await service.callCohere('hello');
    expect(result.content).toBe('');
    expect(result.error).toBe('Cohere API key not configured');
  });

  it('sends POST to https://api.cohere.ai/v1/generate', async () => {
    const fetchMock = mockFetchResponse({
      generations: [{ text: 'cohere response' }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    await service.callCohere('hello', 'cohere-key');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.cohere.ai/v1/generate');
  });

  it('returns content from data.generations[0].text', async () => {
    const fetchMock = mockFetchResponse({
      generations: [{ text: 'cohere answer' }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    const result = await service.callCohere('hello', 'cohere-key');

    expect(result.content).toBe('cohere answer');
    expect(result.error).toBeUndefined();
  });

  it('sends Authorization Bearer header', async () => {
    const fetchMock = mockFetchResponse({
      generations: [{ text: 'ok' }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    await service.callCohere('hello', 'cohere-key-123');

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers?.Authorization).toBe('Bearer cohere-key-123');
  });

  it('returns error when HTTP request fails', async () => {
    const fetchMock = mockFetchResponse({ message: 'unauthorized' }, false, 401);
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    const result = await service.callCohere('hello', 'bad-key');

    expect(result.content).toBe('');
    expect(result.error).toContain('401');
  });
});

describe('callGoogle', () => {
  it('returns error when no API key', async () => {
    const service = new AIService();
    const result = await service.callGoogle('hello');
    expect(result.content).toBe('');
    expect(result.error).toBe('Google API key not configured');
  });

  it('uses x-goog-api-key header (not a query parameter)', async () => {
    const fetchMock = mockFetchResponse({
      candidates: [{ content: { parts: [{ text: 'google response' }] } }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    await service.callGoogle('hello', 'google-key');

    const [url, options] = fetchMock.mock.calls[0];
    expect(options.headers?.['x-goog-api-key']).toBe('google-key');
    expect(url).not.toContain('key=');
    expect(url).not.toContain('google-key');
  });

  it('returns content from data.candidates[0].content.parts[0].text', async () => {
    const fetchMock = mockFetchResponse({
      candidates: [{ content: { parts: [{ text: 'google answer' }] } }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    const result = await service.callGoogle('hello', 'google-key');

    expect(result.content).toBe('google answer');
    expect(result.error).toBeUndefined();
  });

  it('returns error when HTTP request fails', async () => {
    const fetchMock = mockFetchResponse({ error: { message: 'invalid key' } }, false, 403);
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    const result = await service.callGoogle('hello', 'bad-key');

    expect(result.content).toBe('');
    expect(result.error).toContain('403');
  });

  it('reads API key from environment variable', async () => {
    process.env.GEMINI_API_KEY = 'env-gemini-key';
    const fetchMock = mockFetchResponse({
      candidates: [{ content: { parts: [{ text: 'from env' }] } }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    const result = await service.callGoogle('hello');

    expect(result.content).toBe('from env');
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers?.['x-goog-api-key']).toBe('env-gemini-key');
  });
});

describe('callLlama3', () => {
  it('returns error when no API key', async () => {
    const service = new AIService();
    const result = await service.callLlama3('hello');
    expect(result.content).toBe('');
    expect(result.error).toBe('Llama3 API key not configured');
  });

  it('uses model llama3-70b-8192 (different from callGroq default)', async () => {
    const fetchMock = mockFetchResponse({
      choices: [{ message: { content: 'llama3 response' } }],
      usage: { total_tokens: 10 },
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    await service.callLlama3('hello', 'groq-key');

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.model).toBe('llama3-70b-8192');
  });

  it('sends POST to Groq completions endpoint', async () => {
    const fetchMock = mockFetchResponse({
      choices: [{ message: { content: 'ok' } }],
      usage: { total_tokens: 3 },
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    await service.callLlama3('hello', 'groq-key');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
  });

  it('returns content from choices[0].message.content', async () => {
    const fetchMock = mockFetchResponse({
      choices: [{ message: { content: 'llama3 answer' } }],
      usage: { total_tokens: 8 },
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    const result = await service.callLlama3('hello', 'groq-key');

    expect(result.content).toBe('llama3 answer');
    expect(result.error).toBeUndefined();
  });
});

describe('callGoogleWithImage', () => {
  it('returns error when no API key', async () => {
    const service = new AIService();
    const result = await service.callGoogleWithImage('describe this', 'data:image/jpeg;base64,abc123');
    expect(result.content).toBe('');
    expect(result.error).toBe('Google Gemini API key not configured');
  });

  it('strips data:image/jpeg;base64, prefix from imageBase64 before sending', async () => {
    const fetchMock = mockFetchResponse({
      candidates: [{ content: { parts: [{ text: 'image description' }] } }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    const rawBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ';
    await service.callGoogleWithImage('describe', `data:image/jpeg;base64,${rawBase64}`, 'google-key');

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body as string);
    const inlineData = body.contents[0].parts[1].inline_data;
    expect(inlineData.data).toBe(rawBase64);
    expect(inlineData.data).not.toContain('data:image');
  });

  it('extracts MIME type from data URI prefix', async () => {
    const fetchMock = mockFetchResponse({
      candidates: [{ content: { parts: [{ text: 'png image' }] } }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    await service.callGoogleWithImage('describe', 'data:image/png;base64,abc123', 'google-key');

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body as string);
    const inlineData = body.contents[0].parts[1].inline_data;
    expect(inlineData.mime_type).toBe('image/png');
  });

  it('defaults to image/jpeg when no data URI prefix matches', async () => {
    const fetchMock = mockFetchResponse({
      candidates: [{ content: { parts: [{ text: 'image' }] } }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    await service.callGoogleWithImage('describe', 'raw-base64-without-prefix', 'google-key');

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body as string);
    const inlineData = body.contents[0].parts[1].inline_data;
    expect(inlineData.mime_type).toBe('image/jpeg');
  });

  it('sends inline_data in request body', async () => {
    const fetchMock = mockFetchResponse({
      candidates: [{ content: { parts: [{ text: 'described' }] } }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    await service.callGoogleWithImage('what is this?', 'data:image/jpeg;base64,testdata', 'google-key');

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body as string);
    const parts = body.contents[0].parts;
    expect(parts).toHaveLength(2);
    expect(parts[0].text).toBe('what is this?');
    expect(parts[1].inline_data).toBeDefined();
    expect(parts[1].inline_data.data).toBe('testdata');
  });

  it('uses x-goog-api-key header', async () => {
    const fetchMock = mockFetchResponse({
      candidates: [{ content: { parts: [{ text: 'ok' }] } }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    await service.callGoogleWithImage('describe', 'data:image/jpeg;base64,abc', 'my-gemini-key');

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers?.['x-goog-api-key']).toBe('my-gemini-key');
  });

  it('returns content from candidates[0].content.parts[0].text', async () => {
    const fetchMock = mockFetchResponse({
      candidates: [{ content: { parts: [{ text: 'a beautiful image' }] } }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new AIService();
    const result = await service.callGoogleWithImage('describe', 'data:image/jpeg;base64,abc', 'google-key');

    expect(result.content).toBe('a beautiful image');
    expect(result.error).toBeUndefined();
  });
});

describe('makeRequest timeout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws error containing "timeout" when fetch never resolves within timeout window', async () => {
    vi.useFakeTimers();

    // A fetch that never resolves but respects AbortSignal — necessary so the
    // AbortController inside makeRequest can actually cancel the pending fetch.
    const neverResolvingFetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      return new Promise((_resolve, reject) => {
        if (opts.signal) {
          opts.signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            (err as any).name = 'AbortError';
            reject(err);
          });
        }
      });
    });
    vi.stubGlobal('fetch', neverResolvingFetch);

    const service = new AIService();
    const promise = (service as any).makeRequest('https://example.com', { method: 'GET' }, 100);

    // Attach rejection handler before advancing timers to prevent unhandled-rejection warning.
    const result = promise.catch((err: Error) => err);
    await vi.advanceTimersByTimeAsync(200);

    const error = await result;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatch(/timeout/i);
  }, 10000);
});
