import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { throwIfResNotOk, apiRequest, queryClient } from '@/lib/queryClient';
import { QueryClient } from '@tanstack/react-query';

function makeMockResponse(
  ok: boolean,
  status: number,
  statusText: string,
  body: string,
): Response {
  return {
    ok,
    status,
    statusText,
    text: async () => body,
    json: async () => JSON.parse(body),
  } as unknown as Response;
}

describe('throwIfResNotOk', () => {
  it('does not throw for a 200 OK response', async () => {
    const res = makeMockResponse(true, 200, 'OK', '');
    await expect(throwIfResNotOk(res)).resolves.toBeUndefined();
  });

  it('throws an Error for a 400 response', async () => {
    const res = makeMockResponse(false, 400, 'Bad Request', 'Invalid input');
    await expect(throwIfResNotOk(res)).rejects.toThrow();
  });

  it('throws an Error for a 500 response', async () => {
    const res = makeMockResponse(false, 500, 'Internal Server Error', 'Server error');
    await expect(throwIfResNotOk(res)).rejects.toThrow();
  });

  it('error message includes the status code', async () => {
    const res = makeMockResponse(false, 404, 'Not Found', 'Not Found');
    await expect(throwIfResNotOk(res)).rejects.toThrow('404');
  });

  it('error message includes the response body text', async () => {
    const res = makeMockResponse(false, 422, 'Unprocessable Entity', 'Validation failed');
    await expect(throwIfResNotOk(res)).rejects.toThrow('Validation failed');
  });

  it('falls back to statusText when body is empty', async () => {
    const res = makeMockResponse(false, 503, 'Service Unavailable', '');
    await expect(throwIfResNotOk(res)).rejects.toThrow('Service Unavailable');
  });
});

describe('queryClient singleton', () => {
  it('is an instance of QueryClient', () => {
    expect(queryClient).toBeInstanceOf(QueryClient);
  });
});

describe('apiRequest', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      makeMockResponse(true, 200, 'OK', '{}'),
    ));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GET request calls the URL with no Content-Type header and no body', async () => {
    await apiRequest('GET', '/api/test');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        method: 'GET',
        headers: {},
        body: undefined,
        credentials: 'include',
      }),
    );
  });

  it('POST with data sets Content-Type: application/json and serialises body', async () => {
    const data = { name: 'Alice', age: 30 };
    await apiRequest('POST', '/api/users', data);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/users',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      }),
    );
  });
});
