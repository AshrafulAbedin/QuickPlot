import { describe, it, expect } from 'vitest';
import { evaluate3D, validate3DExpression } from './evaluator3d';

describe('evaluate3D', () => {
  it('returns a function for a valid expression', () => {
    const fn = evaluate3D('sin(x) + cos(y)');
    expect(fn).toBeTypeOf('function');
  });
  it('correctly evaluates x^2 + y^2 at (3, 4)', () => {
    const fn = evaluate3D('x^2 + y^2');
    expect(fn!(3, 4)).toBeCloseTo(25);
  });
  it('strips z = prefix', () => {
    const fn = evaluate3D('z = x + y');
    expect(fn!(1, 2)).toBeCloseTo(3);
  });
  it('returns 0 for non-finite results', () => {
    const fn = evaluate3D('1 / (x * y)');
    expect(fn!(0, 0)).toBe(0);
  });
  it('returns null for invalid expression', () => {
    expect(evaluate3D('sin(')).toBeNull();
  });
  it('returns null for empty string', () => {
    expect(evaluate3D('')).toBeNull();
  });
});

describe('validate3DExpression', () => {
  it('returns null for valid expression', () => {
    expect(validate3DExpression('x^2 + y^2')).toBeNull();
  });
  it('returns null for empty string', () => {
    expect(validate3DExpression('')).toBeNull();
  });
  it('returns error string for invalid syntax', () => {
    const result = validate3DExpression('sin(');
    expect(typeof result).toBe('string');
  });
});
