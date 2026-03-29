import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('returns a single class unchanged', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('joins multiple classes with a space', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('resolves tailwind conflicts — last padding wins', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('ignores undefined values', () => {
    expect(cn(undefined, 'bar')).toBe('bar');
  });

  it('ignores false values', () => {
    expect(cn(false && 'foo', 'bar')).toBe('bar');
  });

  it('includes only truthy object keys', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500');
  });

  it('object class overrides positional class for the same property', () => {
    expect(cn('px-2', { 'px-4': true })).toBe('px-4');
  });
});
