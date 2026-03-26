import { MemStorage } from '../storage';

describe('MemStorage', () => {
  let storage: MemStorage;

  beforeEach(() => {
    storage = new MemStorage();
  });

  describe('createPrompt', () => {
    it('returns a prompt with id 1 and correct content', async () => {
      const prompt = await storage.createPrompt({ content: 'test prompt content' });

      expect(prompt.id).toBe(1);
      expect(prompt.content).toBe('test prompt content');
    });

    it('returns a prompt with a valid createdAt Date', async () => {
      const before = new Date();
      const prompt = await storage.createPrompt({ content: 'test prompt content' });
      const after = new Date();

      expect(prompt.createdAt).toBeInstanceOf(Date);
      expect(prompt.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(prompt.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('assigns sequential IDs across multiple calls', async () => {
      const p1 = await storage.createPrompt({ content: 'first' });
      const p2 = await storage.createPrompt({ content: 'second' });
      const p3 = await storage.createPrompt({ content: 'third' });

      expect(p1.id).toBe(1);
      expect(p2.id).toBe(2);
      expect(p3.id).toBe(3);
    });
  });

  describe('getPrompt', () => {
    it('returns the correct prompt after creation', async () => {
      const created = await storage.createPrompt({ content: 'hello world' });
      const fetched = await storage.getPrompt(1);

      expect(fetched).toBeDefined();
      expect(fetched?.id).toBe(created.id);
      expect(fetched?.content).toBe(created.content);
    });

    it('returns undefined for a non-existent ID', async () => {
      const result = await storage.getPrompt(999);

      expect(result).toBeUndefined();
    });
  });

  describe('createAiResponse', () => {
    it('returns a full response object with defaults when optional fields are omitted', async () => {
      await storage.createPrompt({ content: 'test prompt' });

      const response = await storage.createAiResponse({
        promptId: 1,
        provider: 'groq',
        response: 'text',
        status: 'success',
      });

      expect(response.id).toBe(1);
      expect(response.promptId).toBe(1);
      expect(response.provider).toBe('groq');
      expect(response.response).toBe('text');
      expect(response.status).toBe('success');
      expect(response.error).toBeNull();
      expect(response.tokens).toBe(0);
      expect(response.responseTime).toBe(0);
      expect(response.createdAt).toBeInstanceOf(Date);
    });

    it('uses provided tokens and responseTime values', async () => {
      await storage.createPrompt({ content: 'test prompt' });

      const response = await storage.createAiResponse({
        promptId: 1,
        provider: 'groq',
        response: 'text',
        status: 'success',
        tokens: 42,
        responseTime: 1500,
      });

      expect(response.tokens).toBe(42);
      expect(response.responseTime).toBe(1500);
    });
  });

  describe('getAiResponsesByPromptId', () => {
    it('returns all responses for a given prompt', async () => {
      await storage.createPrompt({ content: 'test prompt' });

      await storage.createAiResponse({ promptId: 1, provider: 'groq', response: 'r1', status: 'success' });
      await storage.createAiResponse({ promptId: 1, provider: 'openrouter', response: 'r2', status: 'success' });

      const responses = await storage.getAiResponsesByPromptId(1);

      expect(responses).toHaveLength(2);
    });

    it('returns an empty array for a prompt with no responses', async () => {
      const responses = await storage.getAiResponsesByPromptId(999);

      expect(responses).toEqual([]);
    });

    it('does not cross-contaminate responses between different prompts', async () => {
      await storage.createPrompt({ content: 'prompt one' });
      await storage.createPrompt({ content: 'prompt two' });

      await storage.createAiResponse({ promptId: 1, provider: 'groq', response: 'for prompt 1', status: 'success' });
      await storage.createAiResponse({ promptId: 2, provider: 'groq', response: 'for prompt 2', status: 'success' });

      const responsesForOne = await storage.getAiResponsesByPromptId(1);
      const responsesForTwo = await storage.getAiResponsesByPromptId(2);

      expect(responsesForOne).toHaveLength(1);
      expect(responsesForOne[0].response).toBe('for prompt 1');

      expect(responsesForTwo).toHaveLength(1);
      expect(responsesForTwo[0].response).toBe('for prompt 2');
    });

    it('returns responses in creation order', async () => {
      await storage.createPrompt({ content: 'test prompt' });

      await storage.createAiResponse({ promptId: 1, provider: 'groq', response: 'first', status: 'success' });
      await storage.createAiResponse({ promptId: 1, provider: 'openrouter', response: 'second', status: 'success' });
      await storage.createAiResponse({ promptId: 1, provider: 'cohere', response: 'third', status: 'success' });

      const responses = await storage.getAiResponsesByPromptId(1);

      expect(responses[0].response).toBe('first');
      expect(responses[1].response).toBe('second');
      expect(responses[2].response).toBe('third');
    });
  });
});
