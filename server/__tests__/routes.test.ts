import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express from 'express';
import supertest from 'supertest';

// Mock external services before importing routes
vi.mock('../services/ai-apis', () => ({
  aiService: {
    callGroq: vi.fn().mockResolvedValue({ content: 'mock', responseTime: 0 }),
    callOpenRouter: vi.fn().mockResolvedValue({ content: 'mock', responseTime: 0 }),
    callCohere: vi.fn().mockResolvedValue({ content: 'mock', responseTime: 0 }),
    callLlama3: vi.fn().mockResolvedValue({ content: 'mock', responseTime: 0 }),
    callGoogle: vi.fn().mockResolvedValue({ content: 'mock', responseTime: 0 }),
    callGoogleWithImage: vi.fn().mockResolvedValue({ content: 'mock', responseTime: 0 }),
    synthesizeWithGemini: vi.fn().mockResolvedValue({ content: 'mock', responseTime: 0 }),
  },
  detectLanguage: vi.fn().mockReturnValue('en'),
}));

vi.mock('../services/cache', () => ({
  getCache: vi.fn().mockResolvedValue(null),
  setCache: vi.fn().mockResolvedValue(undefined),
  generateCacheKey: vi.fn().mockReturnValue('mock-cache-key'),
  connectRedis: vi.fn().mockResolvedValue(undefined),
  closeRedis: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/geolocation', () => ({
  GeolocationService: {
    detectLocation: vi.fn().mockResolvedValue({
      country: 'United States',
      countryCode: 'US',
      language: 'en-US',
      timezone: 'America/New_York',
    }),
  },
}));

vi.mock('../services/collaborative-ai', () => {
  const CollaborativeAIService = function (this: any) {
    this.generateInitialResponses = vi.fn().mockResolvedValue([]);
    this.refineResponses = vi.fn().mockResolvedValue([]);
    this.generateFinalSynthesis = vi.fn().mockResolvedValue({ content: 'synthesis' });
  };
  return { CollaborativeAIService };
});

import { registerRoutes } from '../routes';

let app: express.Express;
let server: any;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  server = await registerRoutes(app);
});

afterAll(() => {
  server.close();
});

// ─── /api/status ──────────────────────────────────────────────────────────────

describe('GET /api/status', () => {
  it('returns 200 with all expected API keys', async () => {
    const res = await supertest(app).get('/api/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('openrouter');
    expect(res.body).toHaveProperty('groq');
    expect(res.body).toHaveProperty('google');
    expect(res.body).toHaveProperty('llama3');
    expect(res.body).toHaveProperty('cohere');
  });
});

// ─── /api/detect-location ─────────────────────────────────────────────────────

describe('GET /api/detect-location', () => {
  it('returns 200 with success:true and a location object', async () => {
    const res = await supertest(app).get('/api/detect-location');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.location).toBeDefined();
    expect(res.body.location).toHaveProperty('country');
    expect(res.body.location).toHaveProperty('countryCode');
    expect(res.body.location).toHaveProperty('language');
    expect(res.body.location).toHaveProperty('timezone');
  });
});

// ─── /api/understand ──────────────────────────────────────────────────────────

describe('POST /api/understand', () => {
  it('rejects when prompt is too short (Zod parse error → non-2xx)', async () => {
    const res = await supertest(app)
      .post('/api/understand')
      .send({ prompt: 'short' });
    // promptUnderstandingSchema.parse throws a ZodError that routes
    // to the catch-all handler (500), so we just assert rejection.
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('returns 400 when GROQ_API_KEY is not set', async () => {
    const saved = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    try {
      const res = await supertest(app)
        .post('/api/understand')
        .send({ prompt: 'This is a valid prompt with enough characters' });
      expect(res.status).toBe(400);
    } finally {
      if (saved !== undefined) process.env.GROQ_API_KEY = saved;
    }
  });
});

// ─── /api/analyze ─────────────────────────────────────────────────────────────

describe('POST /api/analyze', () => {
  it('returns 400 when prompt is too short', async () => {
    const res = await supertest(app)
      .post('/api/analyze')
      .send({ prompt: 'short' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when no API keys are configured', async () => {
    // Clear all relevant API keys
    const saved = {
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      COHERE_API_KEY: process.env.COHERE_API_KEY,
    };
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.COHERE_API_KEY;
    try {
      const res = await supertest(app)
        .post('/api/analyze')
        .send({ prompt: 'This is a valid prompt with enough characters' });
      expect(res.status).toBe(400);
    } finally {
      if (saved.OPENROUTER_API_KEY !== undefined) process.env.OPENROUTER_API_KEY = saved.OPENROUTER_API_KEY;
      if (saved.GROQ_API_KEY !== undefined) process.env.GROQ_API_KEY = saved.GROQ_API_KEY;
      if (saved.COHERE_API_KEY !== undefined) process.env.COHERE_API_KEY = saved.COHERE_API_KEY;
    }
  });
});

// ─── /api/chat ────────────────────────────────────────────────────────────────

describe('POST /api/chat', () => {
  it('returns 400 with empty body (Zod validation)', async () => {
    const res = await supertest(app)
      .post('/api/chat')
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 with empty message string', async () => {
    const res = await supertest(app)
      .post('/api/chat')
      .send({ message: '' });
    expect(res.status).toBe(400);
  });
});

// ─── /api/collaborative-ai/initial ────────────────────────────────────────────

describe('POST /api/collaborative-ai/initial', () => {
  it('returns 400 when prompt is too short', async () => {
    const res = await supertest(app)
      .post('/api/collaborative-ai/initial')
      .send({ prompt: 'short' });
    expect(res.status).toBe(400);
  });
});

// ─── /api/collaborative-ai/refine ─────────────────────────────────────────────

describe('POST /api/collaborative-ai/refine', () => {
  it('returns 400 with empty body', async () => {
    const res = await supertest(app)
      .post('/api/collaborative-ai/refine')
      .send({});
    expect(res.status).toBe(400);
  });
});

// ─── /api/collaborative-ai/synthesize ─────────────────────────────────────────

describe('POST /api/collaborative-ai/synthesize', () => {
  it('returns 400 with empty body', async () => {
    const res = await supertest(app)
      .post('/api/collaborative-ai/synthesize')
      .send({});
    expect(res.status).toBe(400);
  });
});

// ─── /api/analyze-image ───────────────────────────────────────────────────────

describe('POST /api/analyze-image', () => {
  it('returns 400 with empty body', async () => {
    const res = await supertest(app)
      .post('/api/analyze-image')
      .send({});
    expect(res.status).toBe(400);
  });
});
