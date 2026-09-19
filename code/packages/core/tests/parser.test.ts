import { describe, it, expect } from 'vitest';
import {
  parseExpression,
  validateExpression,
  parseWithScope,
  detectParameters,
} from '../src/parser';

describe('parseExpression', () => {
  it('evaluates a simple expression', () => {
    const f = parseExpression('x^2');
    expect(f(3)).toBe(9);
    expect(f(-2)).toBe(4);
  });

  it('handles mathjs built-ins: sin, cos, sqrt, pi', () => {
    expect(parseExpression('sin(x)')(Math.PI)).toBeCloseTo(0, 10);
    expect(parseExpression('cos(x)')(0)).toBeCloseTo(1, 10);
    expect(parseExpression('sqrt(x)')(9)).toBeCloseTo(3, 10);
    expect(parseExpression('pi')(0)).toBeCloseTo(Math.PI, 10);
  });

  it('strips "y = " prefix before compiling', () => {
    const f = parseExpression('y = 2*x + 1');
    expect(f(3)).toBe(7);
  });

  it('strips "f(x) = " prefix before compiling', () => {
    const f = parseExpression('f(x) = x + 5');
    expect(f(10)).toBe(15);
  });

  it('returns NaN for discontinuities (e.g. 1/0)', () => {
    const f = parseExpression('1/x');
    expect(isFinite(f(0))).toBe(false);
  });

  it('returns NaN for sqrt of negative', () => {
    const f = parseExpression('sqrt(x)');
    expect(isNaN(f(-1))).toBe(true);
  });

  it('throws on empty expression', () => {
    expect(() => parseExpression('')).toThrow();
  });

  it('throws on syntactically invalid expression', () => {
    expect(() => parseExpression('sin(')).toThrow();
  });
});

describe('validateExpression', () => {
  it('returns null for valid expression', () => {
    expect(validateExpression('sin(x)')).toBeNull();
    expect(validateExpression('x^2 + 3*x - 7')).toBeNull();
  });

  it('returns null for empty string (not an error)', () => {
    expect(validateExpression('')).toBeNull();
  });

  it('returns an error string for invalid syntax', () => {
    const result = validateExpression('sin(');
    expect(typeof result).toBe('string');
    expect(result!.length).toBeGreaterThan(0);
  });

  it('strips y= prefix before validating', () => {
    expect(validateExpression('y = sin(x)')).toBeNull();
  });
});

describe('parseWithScope', () => {
  it('evaluates with extra parameters in scope', () => {
    const f = parseWithScope('a * x + b');
    expect(f({ x: 2, a: 3, b: 1 })).toBe(7);
  });

  it('returns NaN for empty expression', () => {
    const f = parseWithScope('');
    expect(isNaN(f({ x: 1 }))).toBe(true);
  });

  it('returns NaN for bad expression (no throw)', () => {
    const f = parseWithScope('sin(');
    expect(isNaN(f({ x: 1 }))).toBe(true);
  });

  it('works with polar-style t scope', () => {
    const f = parseWithScope('2 + cos(t)');
    expect(f({ t: 0 })).toBeCloseTo(3, 10);
    expect(f({ t: Math.PI })).toBeCloseTo(1, 10);
  });
});

describe('detectParameters', () => {
  it('detects single-letter free parameters', () => {
    const params = detectParameters('a * sin(b * x) + c');
    expect(params).toContain('a');
    expect(params).toContain('b');
    expect(params).toContain('c');
  });

  it('does not return x, t, e, i as parameters', () => {
    const params = detectParameters('a * sin(x) + e^x');
    expect(params).not.toContain('x');
    expect(params).not.toContain('e');
  });

  it('does not return mathjs function names as parameters', () => {
    const params = detectParameters('sin(x) + cos(x) + sqrt(x)');
    expect(params).toHaveLength(0);
  });

  it('returns empty array for expression with no free parameters', () => {
    expect(detectParameters('sin(x) + x^2')).toHaveLength(0);
  });

  it('returns empty array for empty string', () => {
    expect(detectParameters('')).toHaveLength(0);
  });

  it('handles pi, phi, tau as non-parameters', () => {
    const params = detectParameters('pi * x + phi');
    expect(params).not.toContain('p');
    expect(params).not.toContain('phi');
  });
});
