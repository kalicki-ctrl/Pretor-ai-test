import { describe, it, expect } from 'vitest';
import {
  insertPromptSchema,
  insertAiResponseSchema,
  apiKeysSchema,
  promptUnderstandingSchema,
  promptAnalysisSchema,
} from './schema';

describe('insertPromptSchema', () => {
  // drizzle-zod derives constraints from the DB column (text NOT NULL), so no min-length is enforced here.
  it('accepts short content (no min-length enforced by DB schema)', () => {
    const result = insertPromptSchema.safeParse({ content: 'short' });
    expect(result.success).toBe(true);
  });

  it('accepts content with 10 or more characters', () => {
    const result = insertPromptSchema.safeParse({ content: 'this is long enough' });
    expect(result.success).toBe(true);
  });

  it('rejects missing content', () => {
    const result = insertPromptSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects null content', () => {
    const result = insertPromptSchema.safeParse({ content: null });
    expect(result.success).toBe(false);
  });
});

describe('promptUnderstandingSchema', () => {
  it('rejects empty prompt', () => {
    const result = promptUnderstandingSchema.safeParse({ prompt: '' });
    expect(result.success).toBe(false);
  });

  it('rejects prompt shorter than 10 characters', () => {
    const result = promptUnderstandingSchema.safeParse({ prompt: 'short' });
    expect(result.success).toBe(false);
  });

  it('accepts prompt with 10 or more characters', () => {
    const result = promptUnderstandingSchema.safeParse({ prompt: 'long enough prompt here' });
    expect(result.success).toBe(true);
  });
});

describe('promptAnalysisSchema', () => {
  it('accepts prompt only', () => {
    const result = promptAnalysisSchema.safeParse({ prompt: 'long enough prompt here' });
    expect(result.success).toBe(true);
  });

  it('accepts prompt with recommendedAI', () => {
    const result = promptAnalysisSchema.safeParse({
      prompt: 'long enough prompt here',
      recommendedAI: 'gemini',
    });
    expect(result.success).toBe(true);
  });

  it('accepts prompt with aiWeights', () => {
    const result = promptAnalysisSchema.safeParse({
      prompt: 'long enough prompt here',
      aiWeights: { gemini: 0.8, groq: 0.2 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts prompt with all optional fields', () => {
    const result = promptAnalysisSchema.safeParse({
      prompt: 'long enough prompt here',
      recommendedAI: 'gemini',
      aiWeights: { gemini: 0.8, groq: 0.2 },
    });
    expect(result.success).toBe(true);
  });

  it('rejects short prompts', () => {
    const result = promptAnalysisSchema.safeParse({ prompt: 'short' });
    expect(result.success).toBe(false);
  });
});

describe('insertAiResponseSchema', () => {
  it('accepts valid required fields', () => {
    const result = insertAiResponseSchema.safeParse({
      promptId: 1,
      provider: 'gemini',
      response: 'Some response text',
      status: 'success',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = insertAiResponseSchema.safeParse({
      provider: 'gemini',
      response: 'Some response text',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional fields: responseTime, tokens, error', () => {
    const result = insertAiResponseSchema.safeParse({
      promptId: 1,
      provider: 'groq',
      response: 'Some response text',
      status: 'error',
      responseTime: 350,
      tokens: 100,
      error: 'Rate limit exceeded',
    });
    expect(result.success).toBe(true);
  });

  it('accepts null for optional fields', () => {
    const result = insertAiResponseSchema.safeParse({
      promptId: 2,
      provider: 'cohere',
      response: 'Another response',
      status: 'success',
      responseTime: null,
      tokens: null,
      error: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('apiKeysSchema', () => {
  it('accepts empty object', () => {
    const result = apiKeysSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts object with all optional keys', () => {
    const result = apiKeysSchema.safeParse({
      openrouter: 'key-abc',
      groq: 'key-def',
      cohere: 'key-ghi',
    });
    expect(result.success).toBe(true);
  });

  it('accepts object with only some keys', () => {
    const result = apiKeysSchema.safeParse({ groq: 'key-123' });
    expect(result.success).toBe(true);
  });
});
