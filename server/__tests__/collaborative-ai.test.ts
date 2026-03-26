import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted before variable declarations, so mock methods are set up
// via the constructor implementation and retrieved through mock.instances.
vi.mock('../services/ai-apis', () => ({
  AIService: vi.fn().mockImplementation(function (this: any) {
    this.callOpenRouter = vi.fn();
    this.callGroq = vi.fn();
    this.callCohere = vi.fn();
    this.callGoogle = vi.fn();
  }),
  detectLanguage: vi.fn().mockReturnValue('en'),
  aiService: {},
}));

import { CollaborativeAIService } from '../services/collaborative-ai';
import { AIService } from '../services/ai-apis';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeAIResponse = (content: string) => ({ content, responseTime: 5 });

/** Return the AIService instance created by the most recent `new CollaborativeAIService()`. */
function getMockAIService() {
  const MockAIService = AIService as unknown as ReturnType<typeof vi.fn>;
  const lastInstance = MockAIService.mock.instances[MockAIService.mock.instances.length - 1];
  return lastInstance as {
    callOpenRouter: ReturnType<typeof vi.fn>;
    callGroq: ReturnType<typeof vi.fn>;
    callCohere: ReturnType<typeof vi.fn>;
    callGoogle: ReturnType<typeof vi.fn>;
  };
}

function buildInitialResponses() {
  return [
    {
      id: 'grok',
      name: 'Grok',
      provider: 'OpenRouter',
      initialResponse: 'Grok initial answer',
      refinedResponse: '',
      reasoning: '',
      confidence: null as null,
      color: 'bg-green-500',
      roundHistory: [
        { roundNumber: 0, response: 'Grok initial answer', reasoning: 'Hipótese inicial independente', timestamp: new Date().toISOString() },
      ],
    },
    {
      id: 'llama3',
      name: 'Llama 3',
      provider: 'Groq',
      initialResponse: 'Llama initial answer',
      refinedResponse: '',
      reasoning: '',
      confidence: null as null,
      color: 'bg-orange-500',
      roundHistory: [
        { roundNumber: 0, response: 'Llama initial answer', reasoning: 'Hipótese inicial independente', timestamp: new Date().toISOString() },
      ],
    },
    {
      id: 'cohere',
      name: 'Cohere',
      provider: 'Cohere',
      initialResponse: 'Cohere initial answer',
      refinedResponse: '',
      reasoning: '',
      confidence: null as null,
      color: 'bg-purple-500',
      roundHistory: [
        { roundNumber: 0, response: 'Cohere initial answer', reasoning: 'Hipótese inicial independente', timestamp: new Date().toISOString() },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// generateInitialResponses
// ---------------------------------------------------------------------------
describe('CollaborativeAIService.generateInitialResponses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls openrouter, groq, and cohere providers in parallel', async () => {
    const svc = new CollaborativeAIService();
    const mock = getMockAIService();
    mock.callOpenRouter.mockResolvedValue(makeAIResponse('OpenRouter response'));
    mock.callGroq.mockResolvedValue(makeAIResponse('Groq response'));
    mock.callCohere.mockResolvedValue(makeAIResponse('Cohere response'));

    await svc.generateInitialResponses('test prompt');

    expect(mock.callOpenRouter).toHaveBeenCalledTimes(1);
    expect(mock.callGroq).toHaveBeenCalledTimes(1);
    expect(mock.callCohere).toHaveBeenCalledTimes(1);
  });

  it('returns an array of 3 CollaborativeResponse objects', async () => {
    const svc = new CollaborativeAIService();
    const mock = getMockAIService();
    mock.callOpenRouter.mockResolvedValue(makeAIResponse('OpenRouter response'));
    mock.callGroq.mockResolvedValue(makeAIResponse('Groq response'));
    mock.callCohere.mockResolvedValue(makeAIResponse('Cohere response'));

    const result = await svc.generateInitialResponses('test prompt');

    expect(result).toHaveLength(3);
  });

  it('each result has the required CollaborativeResponse shape', async () => {
    const svc = new CollaborativeAIService();
    const mock = getMockAIService();
    mock.callOpenRouter.mockResolvedValue(makeAIResponse('OpenRouter response'));
    mock.callGroq.mockResolvedValue(makeAIResponse('Groq response'));
    mock.callCohere.mockResolvedValue(makeAIResponse('Cohere response'));

    const result = await svc.generateInitialResponses('test prompt');

    for (const item of result) {
      expect(item).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        provider: expect.any(String),
        initialResponse: expect.any(String),
        color: expect.any(String),
      });
    }
  });

  it('returns results for other agents when one provider fails (graceful partial failure)', async () => {
    const svc = new CollaborativeAIService();
    const mock = getMockAIService();
    mock.callOpenRouter.mockResolvedValue(makeAIResponse('OpenRouter response'));
    mock.callGroq.mockRejectedValue(new Error('Groq network error'));
    mock.callCohere.mockResolvedValue(makeAIResponse('Cohere response'));

    // Unique prompt avoids cache hit from other tests in this suite
    const result = await svc.generateInitialResponses('failing groq prompt unique-xyz');

    expect(result).toHaveLength(3);

    const groqResult = result.find(r => r.id === 'llama3');
    expect(groqResult).toBeDefined();
    expect(groqResult!.initialResponse).toMatch(/Erro:/i);

    expect(result.find(r => r.id === 'grok')!.initialResponse).toBe('OpenRouter response');
    expect(result.find(r => r.id === 'cohere')!.initialResponse).toBe('Cohere response');
  });
});

// ---------------------------------------------------------------------------
// refineResponses
// ---------------------------------------------------------------------------
describe('CollaborativeAIService.refineResponses', () => {
  let svc: CollaborativeAIService;
  let mock: ReturnType<typeof getMockAIService>;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new CollaborativeAIService();
    mock = getMockAIService();
    const refinedContent = 'Resposta Refinada: Refined answer\nRaciocínio: Improved';
    mock.callOpenRouter.mockResolvedValue(makeAIResponse(refinedContent));
    mock.callGroq.mockResolvedValue(makeAIResponse(refinedContent));
    mock.callCohere.mockResolvedValue(makeAIResponse(refinedContent));
  });

  it('returns the same number of responses as input', async () => {
    const initial = buildInitialResponses();
    const result = await svc.refineResponses('test prompt', initial);
    expect(result).toHaveLength(initial.length);
  });

  it('each response has a non-empty refinedResponse field', async () => {
    const result = await svc.refineResponses('test prompt', buildInitialResponses());
    for (const item of result) {
      expect(typeof item.refinedResponse).toBe('string');
      expect(item.refinedResponse.length).toBeGreaterThan(0);
    }
  });

  it('roundHistory grows beyond the initial entry after refinement', async () => {
    const result = await svc.refineResponses('test prompt', buildInitialResponses());
    for (const item of result) {
      // Each initial response has 1 history entry (round 0); refinement appends more.
      expect(item.roundHistory!.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('returns empty array when called with empty initialResponses', async () => {
    const result = await svc.refineResponses('test prompt', []);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// generateFinalSynthesis
// ---------------------------------------------------------------------------
describe('CollaborativeAIService.generateFinalSynthesis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls callGoogle (Gemini) with a synthesis prompt', async () => {
    const svc = new CollaborativeAIService();
    const mock = getMockAIService();
    mock.callGoogle.mockResolvedValue(makeAIResponse('Final synthesis content'));

    const responses = buildInitialResponses().map(r => ({ ...r, refinedResponse: `${r.name} refined answer` }));
    await svc.generateFinalSynthesis('test prompt', responses);

    expect(mock.callGoogle).toHaveBeenCalledTimes(1);
    const [promptArg] = mock.callGoogle.mock.calls[0];
    expect(typeof promptArg).toBe('string');
    expect(promptArg.length).toBeGreaterThan(0);
  });

  it('returns an object with a content field containing the AI response', async () => {
    const svc = new CollaborativeAIService();
    const mock = getMockAIService();
    mock.callGoogle.mockResolvedValue(makeAIResponse('Final synthesis content'));

    const responses = buildInitialResponses().map(r => ({ ...r, refinedResponse: `${r.name} refined answer` }));
    const result = await svc.generateFinalSynthesis('test prompt', responses);

    expect(result).toMatchObject({ content: 'Final synthesis content' });
  });

  it('throws when callGoogle fails', async () => {
    const svc = new CollaborativeAIService();
    const mock = getMockAIService();
    mock.callGoogle.mockRejectedValue(new Error('Gemini service down'));

    const responses = buildInitialResponses().map(r => ({ ...r, refinedResponse: `${r.name} refined answer` }));
    await expect(svc.generateFinalSynthesis('test prompt', responses)).rejects.toThrow('Gemini service down');
  });
});
