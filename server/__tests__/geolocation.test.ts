import { describe, it, expect, vi, afterEach } from 'vitest';
import { GeolocationService } from '../services/geolocation';

function mockReq(headers: Record<string, string> = {}, ip = '1.2.3.4') {
  return { headers, ip } as any;
}

describe('GeolocationService', () => {
  describe('isValidCountryCode (private)', () => {
    it('returns true for valid uppercase 2-letter code US', () => {
      expect((GeolocationService as any).isValidCountryCode('US')).toBe(true);
    });

    it('returns true for valid uppercase 2-letter code BR', () => {
      expect((GeolocationService as any).isValidCountryCode('BR')).toBe(true);
    });

    it('returns false for lowercase code', () => {
      expect((GeolocationService as any).isValidCountryCode('us')).toBe(false);
    });

    it('returns false for 3-character code', () => {
      expect((GeolocationService as any).isValidCountryCode('USA')).toBe(false);
    });

    it('returns false for unknown code ZZ', () => {
      expect((GeolocationService as any).isValidCountryCode('ZZ')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect((GeolocationService as any).isValidCountryCode('')).toBe(false);
    });
  });

  describe('isValidPublicIp (private)', () => {
    it('returns true for public IPv4 8.8.8.8', () => {
      expect((GeolocationService as any).isValidPublicIp('8.8.8.8')).toBe(true);
    });

    it('returns false for private range 192.168.1.1', () => {
      expect((GeolocationService as any).isValidPublicIp('192.168.1.1')).toBe(false);
    });

    it('returns false for private range 10.0.0.1', () => {
      expect((GeolocationService as any).isValidPublicIp('10.0.0.1')).toBe(false);
    });

    it('returns false for private range 172.16.0.1', () => {
      expect((GeolocationService as any).isValidPublicIp('172.16.0.1')).toBe(false);
    });

    it('returns false for private range 172.31.255.255', () => {
      expect((GeolocationService as any).isValidPublicIp('172.31.255.255')).toBe(false);
    });

    it('returns false for loopback 127.0.0.1', () => {
      expect((GeolocationService as any).isValidPublicIp('127.0.0.1')).toBe(false);
    });

    it('returns false for zero address 0.0.0.1', () => {
      expect((GeolocationService as any).isValidPublicIp('0.0.0.1')).toBe(false);
    });

    it('returns true for IPv6-wrapped public IPv4 ::ffff:8.8.8.8', () => {
      expect((GeolocationService as any).isValidPublicIp('::ffff:8.8.8.8')).toBe(true);
    });

    it('returns false for IPv6-wrapped private ::ffff:192.168.1.1', () => {
      expect((GeolocationService as any).isValidPublicIp('::ffff:192.168.1.1')).toBe(false);
    });

    it('returns false for invalid IP format', () => {
      expect((GeolocationService as any).isValidPublicIp('not.an.ip')).toBe(false);
    });
  });

  describe('getCountryName (private)', () => {
    it('returns United States for US', () => {
      expect((GeolocationService as any).getCountryName('US')).toBe('United States');
    });

    it('returns Brasil for BR', () => {
      expect((GeolocationService as any).getCountryName('BR')).toBe('Brasil');
    });

    it('returns Unknown for unknown code XX', () => {
      expect((GeolocationService as any).getCountryName('XX')).toBe('Unknown');
    });
  });

  describe('getTimezone (private)', () => {
    it('returns America/Sao_Paulo for BR', () => {
      expect((GeolocationService as any).getTimezone('BR')).toBe('America/Sao_Paulo');
    });

    it('returns a US timezone for US', () => {
      const tz = (GeolocationService as any).getTimezone('US');
      expect(typeof tz).toBe('string');
      expect(tz.length).toBeGreaterThan(0);
      expect(tz).toContain('America');
    });

    it('returns UTC for unknown code XX', () => {
      expect((GeolocationService as any).getTimezone('XX')).toBe('UTC');
    });
  });

  describe('detectLocation', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('detects US from cf-ipcountry: US header', async () => {
      const req = mockReq({ 'cf-ipcountry': 'US' });
      const result = await GeolocationService.detectLocation(req);
      expect(result.countryCode).toBe('US');
      expect(result.country).toBe('United States');
      expect(result.language).toBe('en-US');
    });

    it('falls through when cf-ipcountry is T1 (Cloudflare private)', async () => {
      const req = mockReq({ 'cf-ipcountry': 'T1' }, '127.0.0.1');
      const result = await GeolocationService.detectLocation(req);
      expect(result.countryCode).toBe('US');
    });

    it('detects Brazil from accept-language: pt-BR header', async () => {
      const req = mockReq({ 'accept-language': 'pt-BR,pt;q=0.9' });
      const result = await GeolocationService.detectLocation(req);
      expect(result.countryCode).toBe('BR');
      expect(result.language).toBe('pt-BR');
    });

    it('detects US from accept-language: en-US header', async () => {
      const req = mockReq({ 'accept-language': 'en-US,en;q=0.9' }, '127.0.0.1');
      const result = await GeolocationService.detectLocation(req);
      expect(result.countryCode).toBe('US');
      expect(result.language).toBe('en-US');
    });

    it('detects Brazil from public IP via ipapi.co', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ text: async () => 'BR' }));

      const req = mockReq({}, '8.8.8.8');
      const result = await GeolocationService.detectLocation(req);
      expect(result.countryCode).toBe('BR');
      expect(result.language).toBe('pt-BR');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('ipapi.co/8.8.8.8'),
        expect.any(Object)
      );
    });

    it('skips IP geolocation for private IP', async () => {
      vi.stubGlobal('fetch', vi.fn());

      const req = mockReq({}, '192.168.1.1');
      const result = await GeolocationService.detectLocation(req);
      expect(fetch).not.toHaveBeenCalled();
      expect(result.countryCode).toBe('US');
    });

    it('falls back to defaults when ipapi.co returns invalid response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ text: async () => 'INVALID' }));

      const req = mockReq({}, '8.8.8.8');
      const result = await GeolocationService.detectLocation(req);
      expect(result.countryCode).toBe('US');
    });

    it('returns US defaults when ipapi.co throws an error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      const req = mockReq({}, '8.8.8.8');
      const result = await GeolocationService.detectLocation(req);
      expect(result.countryCode).toBe('US');
      expect(result.country).toBe('United States');
      expect(result.language).toBe('en-US');
    });

    it('returns US/English defaults when all headers are missing and IP geolocation fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Timeout')));

      const req = mockReq({}, '8.8.8.8');
      const result = await GeolocationService.detectLocation(req);
      expect(result.countryCode).toBe('US');
      expect(result.language).toBe('en-US');
    });
  });
});
