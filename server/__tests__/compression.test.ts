import { describe, it, expect } from 'vitest';
import express from 'express';
import supertest from 'supertest';
import { cacheMiddleware } from '../middleware/compression';

function buildApp() {
  const app = express();
  app.use(cacheMiddleware);
  app.use((_req, res) => res.status(200).send('ok'));
  return app;
}

const app = buildApp();

describe('cacheMiddleware', () => {
  describe('static asset paths (should set cache headers)', () => {
    it('sets Cache-Control for .js files', async () => {
      const res = await supertest(app).get('/assets/main.js');
      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('public, max-age=31536000');
    });

    it('sets Cache-Control for .css files', async () => {
      const res = await supertest(app).get('/assets/styles.css');
      expect(res.headers['cache-control']).toBe('public, max-age=31536000');
    });

    it('sets Cache-Control for .png files', async () => {
      const res = await supertest(app).get('/image.png');
      expect(res.headers['cache-control']).toBe('public, max-age=31536000');
    });

    it('sets Cache-Control for .svg files', async () => {
      const res = await supertest(app).get('/logo.svg');
      expect(res.headers['cache-control']).toBe('public, max-age=31536000');
    });

    it('sets Cache-Control for .jpg files', async () => {
      const res = await supertest(app).get('/photo.jpg');
      expect(res.headers['cache-control']).toBe('public, max-age=31536000');
    });

    it('sets Cache-Control for .ico files', async () => {
      const res = await supertest(app).get('/favicon.ico');
      expect(res.headers['cache-control']).toBe('public, max-age=31536000');
    });

    it('sets an Expires header for static assets', async () => {
      const res = await supertest(app).get('/assets/main.js');
      expect(res.headers['expires']).toBeDefined();
      const expiresDate = new Date(res.headers['expires'] as string);
      expect(expiresDate.getTime()).toBeGreaterThan(Date.now());
    });

    it('sets Expires header approximately 1 year in the future', async () => {
      const before = Date.now();
      const res = await supertest(app).get('/logo.svg');
      const expiresDate = new Date(res.headers['expires'] as string).getTime();
      const oneYearMs = 31536000000;
      // Allow ±5 seconds of test execution drift
      expect(expiresDate).toBeGreaterThanOrEqual(before + oneYearMs - 5000);
      expect(expiresDate).toBeLessThanOrEqual(before + oneYearMs + 5000);
    });
  });

  describe('non-static paths (should NOT set cache headers)', () => {
    it('does not set Cache-Control for /api/status', async () => {
      const res = await supertest(app).get('/api/status');
      expect(res.headers['cache-control']).not.toBe('public, max-age=31536000');
    });

    it('does not set Cache-Control for /index.html', async () => {
      const res = await supertest(app).get('/index.html');
      expect(res.headers['cache-control']).not.toBe('public, max-age=31536000');
    });

    it('does not set Cache-Control for root path', async () => {
      const res = await supertest(app).get('/');
      expect(res.headers['cache-control']).not.toBe('public, max-age=31536000');
    });

    it('does not set Expires for /api/status', async () => {
      const res = await supertest(app).get('/api/status');
      expect(res.headers['expires']).toBeUndefined();
    });
  });
});
