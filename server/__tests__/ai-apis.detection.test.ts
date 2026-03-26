import { detectLanguage, AIService } from '../services/ai-apis';

class TestableAIService extends AIService {
  public testExtractSources(content: string) {
    return (this as any).extractSources(content);
  }
  public testExtractDomain(url: string) {
    return (this as any).extractDomainFromUrl(url);
  }
}

const svc = new TestableAIService();

describe('detectLanguage', () => {
  describe('Portuguese detection', () => {
    it('detects Portuguese via keyword "como"', () => {
      expect(detectLanguage('Como funciona isso?')).toBe('pt');
    });

    it('detects Portuguese via accented chars and keyword', () => {
      expect(detectLanguage('Olá, como você está?')).toBe('pt');
    });

    it('detects Portuguese via keyword "não"', () => {
      expect(detectLanguage('Isso não é correto')).toBe('pt');
    });
  });

  describe('Spanish detection', () => {
    // ñ triggers Spanish but is absent from the Portuguese accented set,
    // so these inputs skip the Portuguese branch entirely.
    it('detects Spanish via ñ (no Portuguese chars or keywords in text)', () => {
      expect(detectLanguage('El niño y el baño son distintos')).toBe('es');
    });

    it('detects Spanish via ü (not in Portuguese accented set)', () => {
      expect(detectLanguage('El pingüino nada bien')).toBe('es');
    });
  });

  describe('French detection', () => {
    // "comment" and "alors" are in the French keyword list but absent from
    // the Portuguese and Spanish keyword lists.
    it('detects French via keyword "comment"', () => {
      expect(detectLanguage('Bonjour, comment allez-vous?')).toBe('fr');
    });

    it('detects French via keyword "alors"', () => {
      expect(detectLanguage('Alors, allons y aller maintenant')).toBe('fr');
    });
  });

  describe('English / default', () => {
    it('defaults to English for plain English text', () => {
      expect(detectLanguage('What is artificial intelligence?')).toBe('en');
    });

    it('defaults to English for "Hello world"', () => {
      expect(detectLanguage('Hello world')).toBe('en');
    });

    it('defaults to English for empty string', () => {
      expect(detectLanguage('')).toBe('en');
    });
  });
});

describe('extractDomainFromUrl', () => {
  it('strips www. and returns hostname', () => {
    expect(svc.testExtractDomain('https://www.example.com/page')).toBe('example.com');
  });

  it('preserves sub-domain that is not www', () => {
    expect(svc.testExtractDomain('https://api.github.com')).toBe('api.github.com');
  });

  it('returns "Link externo" for non-URL string', () => {
    expect(svc.testExtractDomain('not-a-url')).toBe('Link externo');
  });

  it('returns "Link externo" for empty string', () => {
    expect(svc.testExtractDomain('')).toBe('Link externo');
  });
});

describe('extractSources', () => {
  it('returns empty array when content has no URLs or citations', () => {
    expect(svc.testExtractSources('No links here at all.')).toHaveLength(0);
  });

  it('returns a website source for a bare URL', () => {
    const sources = svc.testExtractSources('Check this out: https://www.example.com/page');
    const ws = sources.find(s => s.url.startsWith('https://www.example.com'));
    expect(ws).toBeDefined();
    expect(ws.type).toBe('website');
  });

  it('returns a source with the markdown link title for markdown syntax', () => {
    // The URL regex captures "https://example.com)" (trailing ")" not excluded),
    // so the markdown-derived entry (url without ")") is a distinct record.
    const sources = svc.testExtractSources('See [Example Site](https://example.com) for more info.');
    const mdEntry = sources.find(s => s.url === 'https://example.com');
    expect(mdEntry).toBeDefined();
    expect(mdEntry.title).toBe('Example Site');
    expect(mdEntry.type).toBe('website');
  });

  it('returns a citation source for "Source:" prefix', () => {
    const sources = svc.testExtractSources('Source: Some Reference Document');
    const citation = sources.find(s => s.type === 'citation');
    expect(citation).toBeDefined();
    expect(citation.url).toBe('#citation');
    expect(citation.title).toBe('Some Reference Document');
    expect(citation.description).toBe('Some Reference Document');
  });

  it('deduplicates identical bare URLs', () => {
    const content = 'First mention https://dup.example.com and again https://dup.example.com done.';
    const sources = svc.testExtractSources(content);
    const matching = sources.filter(s => s.url === 'https://dup.example.com');
    expect(matching).toHaveLength(1);
  });

  it('handles content with multiple distinct URLs', () => {
    const content = 'Visit https://alpha.com and also https://beta.com for details.';
    const sources = svc.testExtractSources(content);
    const urls = sources.map(s => s.url);
    expect(urls.some(u => u.startsWith('https://alpha.com'))).toBe(true);
    expect(urls.some(u => u.startsWith('https://beta.com'))).toBe(true);
  });
});
