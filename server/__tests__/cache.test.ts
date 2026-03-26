import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Build a fake Redis client. currentFakeClient is mutated in beforeEach so
// the hoisted vi.mock factory always returns the currently-active instance.
function makeFakeClient() {
  const store: Record<string, string> = {};
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    setEx: vi.fn().mockImplementation(
      async (key: string, _ttl: number, value: string) => {
        store[key] = value;
      },
    ),
    get: vi.fn().mockImplementation(async (key: string) => store[key] ?? null),
  };
}

let currentFakeClient: ReturnType<typeof makeFakeClient>;

vi.mock('redis', () => ({
  createClient: () => currentFakeClient,
}));

describe('generateCacheKey', () => {
  let generateCacheKey: (
    prompt: string,
    aiWeights?: Record<string, number>,
  ) => string;

  beforeEach(async () => {
    vi.resetModules();
    currentFakeClient = makeFakeClient();
    const mod = await import('../../server/services/cache.ts');
    generateCacheKey = mod.generateCacheKey;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns a consistent string for the same prompt', () => {
    const key1 = generateCacheKey('hello world');
    const key2 = generateCacheKey('hello world');
    expect(key1).toBe(key2);
  });

  it('returns different strings for different prompts', () => {
    const key1 = generateCacheKey('prompt A');
    const key2 = generateCacheKey('prompt B');
    expect(key1).not.toBe(key2);
  });

  it('includes a weights hash when aiWeights is provided', () => {
    const withoutWeights = generateCacheKey('my prompt');
    const withWeights = generateCacheKey('my prompt', { creativity: 0.8 });
    expect(withWeights).not.toBe(withoutWeights);
    const parts = withWeights.split(':');
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it('key format starts with "analysis:"', () => {
    expect(generateCacheKey('any prompt')).toMatch(/^analysis:/);
  });
});

describe('connectRedis — no REDIS_URL', () => {
  let connectRedis: () => Promise<void>;
  let getCache: (key: string) => Promise<unknown>;

  beforeEach(async () => {
    vi.resetModules();
    delete process.env.REDIS_URL;
    currentFakeClient = makeFakeClient();
    const mod = await import('../../server/services/cache.ts');
    connectRedis = mod.connectRedis;
    getCache = mod.getCache;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves without connecting when REDIS_URL is absent', async () => {
    await expect(connectRedis()).resolves.toBeUndefined();
    expect(currentFakeClient.connect).not.toHaveBeenCalled();
  });

  it('getCache returns null after skipped connection', async () => {
    await connectRedis();
    const result = await getCache('some-key');
    expect(result).toBeNull();
  });
});

describe('setCache / getCache — Redis unavailable', () => {
  let setCache: (key: string, value: unknown, ttl?: number) => Promise<void>;
  let getCache: (key: string) => Promise<unknown>;

  beforeEach(async () => {
    vi.resetModules();
    delete process.env.REDIS_URL;
    currentFakeClient = makeFakeClient();
    const mod = await import('../../server/services/cache.ts');
    setCache = mod.setCache;
    getCache = mod.getCache;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('setCache resolves without error when Redis is unavailable', async () => {
    await expect(setCache('key1', { data: 'test' })).resolves.toBeUndefined();
    expect(currentFakeClient.setEx).not.toHaveBeenCalled();
  });

  it('getCache returns null when Redis is unavailable', async () => {
    const result = await getCache('key1');
    expect(result).toBeNull();
    expect(currentFakeClient.get).not.toHaveBeenCalled();
  });
});

describe('setCache / getCache — Redis available (mocked)', () => {
  let connectRedis: () => Promise<void>;
  let setCache: (key: string, value: unknown, ttl?: number) => Promise<void>;
  let getCache: (key: string) => Promise<unknown>;

  beforeEach(async () => {
    vi.resetModules();
    process.env.REDIS_URL = 'redis://localhost:6379';
    currentFakeClient = makeFakeClient();
    const mod = await import('../../server/services/cache.ts');
    connectRedis = mod.connectRedis;
    setCache = mod.setCache;
    getCache = mod.getCache;
    await connectRedis();
  });

  afterEach(() => {
    delete process.env.REDIS_URL;
    vi.clearAllMocks();
  });

  it('setCache calls setEx with the correct arguments', async () => {
    const key = 'test-key';
    const value = { data: 'test' };
    const ttl = 3600;

    await setCache(key, value, ttl);

    expect(currentFakeClient.setEx).toHaveBeenCalledWith(
      key,
      ttl,
      JSON.stringify(value),
    );
  });

  it('getCache deserializes stored JSON and returns the value', async () => {
    const key = 'test-key';
    const value = { data: 'test' };

    await setCache(key, value, 3600);
    const result = await getCache(key);

    expect(result).toEqual(value);
  });

  it('getCache returns null for a missing key', async () => {
    const result = await getCache('non-existent-key');
    expect(result).toBeNull();
  });
});
