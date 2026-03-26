import { describe, it, expect } from 'vitest';
import { getTranslation, translations } from '@/lib/translations';

describe('getTranslation', () => {
  it('returns an object for pt-BR', () => {
    const result = getTranslation('pt-BR');
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('returns an object for en-US', () => {
    const result = getTranslation('en-US');
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('returns English fallback for unknown locale', () => {
    expect(getTranslation('xx-XX')).toEqual(getTranslation('en-US'));
  });

  it('pt-BR and en-US have the same set of keys', () => {
    const ptKeys = Object.keys(translations['pt-BR']).sort();
    const enKeys = Object.keys(translations['en-US']).sort();
    expect(ptKeys).toEqual(enKeys);
  });

  it('no pt-BR translation value is an empty string', () => {
    const ptValues = Object.values(translations['pt-BR']);
    ptValues.forEach((value) => {
      expect(value).not.toBe('');
    });
  });

  it('no en-US translation value is an empty string', () => {
    const enValues = Object.values(translations['en-US']);
    enValues.forEach((value) => {
      expect(value).not.toBe('');
    });
  });
});
