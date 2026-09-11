import { describe, it, expect } from 'vitest';
import { detectEquationType, tryParsePoints } from '../src/features/equations/detectType';

describe('detectEquationType', () => {
  it('defaults empty to cartesian', () => {
    expect(detectEquationType('')).toEqual({ type: 'cartesian', expression: '' });
  });

  it('detects cartesian from bare x-expression', () => {
    expect(detectEquationType('sin(x)')).toEqual({ type: 'cartesian', expression: 'sin(x)' });
    expect(detectEquationType('x^2 + 3')).toEqual({ type: 'cartesian', expression: 'x^2 + 3' });
  });

  it('detects cartesian from y = …', () => {
    expect(detectEquationType('y = sin(x)')).toEqual({ type: 'cartesian', expression: 'sin(x)' });
    expect(detectEquationType('f(x) = x + 1')).toEqual({ type: 'cartesian', expression: 'x + 1' });
  });

  it('detects polar from r = …', () => {
    expect(detectEquationType('r = 1 + cos(t)')).toEqual({ type: 'polar', expression: '1 + cos(t)' });
    expect(detectEquationType('R = 2')).toEqual({ type: 'polar', expression: '2' });
  });

  it('detects polar from θ / theta reference even without prefix', () => {
    const a = detectEquationType('1 + cos(theta)');
    expect(a.type).toBe('polar');
    expect(a.expression).toBe('1 + cos(t)');
    const b = detectEquationType('sin(θ) * 2');
    expect(b.type).toBe('polar');
    expect(b.expression).toBe('sin(t) * 2');
  });

  it('detects parametric from (x(t), y(t))', () => {
    expect(detectEquationType('(cos(t), sin(t))')).toEqual({
      type: 'parametric',
      expression: 'cos(t)',
      expressionY: 'sin(t)',
    });
  });

  it('does not treat (1, 2) as parametric', () => {
    // No `t` — this should classify as a single point.
    expect(detectEquationType('(1, 2)').type).toBe('points');
  });

  it('detects implicit for symmetric equations', () => {
    expect(detectEquationType('x^2 + y^2 = 1').type).toBe('implicit');
    expect(detectEquationType('x + y = 3').type).toBe('implicit');
  });

  it('does not confuse == or >= with assignment', () => {
    // `x == 3` is a bare expression — no lhs=rhs match, so falls back to cartesian.
    expect(detectEquationType('x == 3').type).toBe('cartesian');
    expect(detectEquationType('y >= x').type).toBe('cartesian');
  });

  it('detects point lists', () => {
    expect(detectEquationType('(1, 2), (3, 4), (5, 6)').type).toBe('points');
    const result = detectEquationType('(1, 2), (3, 4)');
    expect(result.points).toEqual([{ x: 1, y: 2 }, { x: 3, y: 4 }]);
  });

  it('detects a single unwrapped pair as a point', () => {
    expect(tryParsePoints('1, 2')).toEqual([{ x: 1, y: 2 }]);
  });

  it('rejects non-numeric parens as points', () => {
    expect(tryParsePoints('(cos(t), sin(t))')).toBeNull();
  });
});
