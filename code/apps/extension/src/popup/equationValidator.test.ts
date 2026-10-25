import { describe, it, expect } from 'vitest';
import { validateAndParseEquation, cleanRawInput } from './equationValidator';

describe('Wolfram MathWorld Heart Curve equations', () => {
  it('cleans Wolfram MathWorld Equation 1 with equation number and period', () => {
    const raw = 'r(theta)=1-sintheta.  (1)';
    const cleaned = cleanRawInput(raw);
    expect(cleaned).toBe('r(theta)=1-sin(theta)');

    const res = validateAndParseEquation(raw);
    expect(res.isValid).toBe(true);
    if (res.isValid) {
      expect(res.type).toBe('polar');
      expect(res.evalPolar).toBeDefined();
      // At theta = 0, r = 1 - sin(0) = 1
      expect(res.evalPolar!(0)).toBeCloseTo(1);
      // At theta = pi/2, r = 1 - sin(pi/2) = 0 (the tip of the heart)
      expect(res.evalPolar!(Math.PI / 2)).toBeCloseTo(0);
    }
  });

  it('validates Wolfram MathWorld Equation 2 (Order-6 Algebraic Heart Curve)', () => {
    const raw = '(x^2+y^2-1)^3-x^2y^3=0. (2)';
    const res = validateAndParseEquation(raw);
    expect(res.isValid).toBe(true);
    if (res.isValid) {
      expect(res.type).toBe('implicit');
      expect(res.evalImplicit).toBeDefined();
      // Check (0, 1): (0+1-1)^3 - 0 = 0
      expect(res.evalImplicit!(0, 1)).toBeCloseTo(0);
    }
  });

  it('validates Wolfram MathWorld Equation 5 with square brackets', () => {
    const raw = 'x^2+[y-(2(x^2+|x|-6))/(3(x^2+|x|+2))]^2=36';
    const res = validateAndParseEquation(raw);
    expect(res.isValid).toBe(true);
    if (res.isValid) {
      expect(res.type).toBe('implicit');
      expect(res.evalImplicit).toBeDefined();
    }
  });
});

 describe('Article equation regressions', () => {
  it.each(['sin(2)', 'cos(0)', 'log(10)', '2(3)'])('preserves numeric arguments in %s', value => {
    expect(cleanRawInput(value)).toBe(value);
  });
  it.each([
    [String.raw`y=\frac{x^{2}+1}{\sqrt{x+1}}`, 3, 5],
    [String.raw`y=\frac{1}{\frac{x}{2}}`, 4, 0.5],
    [String.raw`\(y=\left(x+1\right)^{2}\)`, 2, 9],
    ['y=x¹²', 2, 4096],
    ['y=ln(x)', Math.E, 1],
    ['y=sqrt(x-100)', 104, 2],
  ])('evaluates %s', (raw, x, expected) => {
    const result = validateAndParseEquation(raw as string);
    expect(result.isValid).toBe(true);
    if (result.isValid) expect(result.evalCartesian!(x as number)).toBeCloseTo(expected as number);
  });
  it.each(['x=2', 'y=y^2+x', 'xy=1'])('handles implicit equation %s', raw => {
    const result = validateAndParseEquation(raw);
    expect(result.isValid).toBe(true);
    if (result.isValid) expect(result.type).toBe('implicit');
  });
  it.each([String.raw`y=\int x dx`, 'y=x_1', 'x=y=2', 'y=a*x', 'y=x<2'])('rejects unsupported notation %s', raw => {
    expect(validateAndParseEquation(raw).isValid).toBe(false);
  });
});

describe('Preserving formula semantics', () => {
  it.each(['sin (2)', 'y=sin (2)', 'y=2 (3)'])('does not delete a final factor in %s', raw => {
    expect(cleanRawInput(raw)).toBe(raw);
  });
  it.each(['y=z', 'y=theta', 'y=r', 'r=x', 'x=t'])('rejects unbound coordinates in %s', raw => {
    expect(validateAndParseEquation(raw).isValid).toBe(false);
  });
  it.each([String.raw`y=\sin^{2}(x+1)`, 'y=sin^2(x+1)'])('preserves trig arguments in %s', raw => {
    const result = validateAndParseEquation(raw);
    expect(result.isValid).toBe(true);
    if (result.isValid) expect(result.evalCartesian!(1)).toBeCloseTo(Math.sin(2) ** 2);
  });

  describe('Copy-paste exponent recovery & single-variable equations', () => {
    it('corrects 3x2+ 14 x + 8 = 0 to 3x^2+ 14 x + 8 = 0 and computes roots', () => {
      const raw = '3x2+ 14 x + 8 = 0';
      const cleaned = cleanRawInput(raw);
      expect(cleaned).toBe('3x^2+ 14 x + 8 = 0');

      const res = validateAndParseEquation(raw);
      expect(res.isValid).toBe(true);
      if (res.isValid) {
        expect(res.type).toBe('implicit');
        expect(res.solutions).toBeDefined();
        expect(res.solutions).toContain('x = -4');
        expect(res.solutions?.some(s => s.includes('-2/3'))).toBe(true);
      }
    });

    it('corrects bracketed substitution: 3(z/3)2 + 14(z/3) + 8 = 0', () => {
      const raw = '3(z/3)2 + 14(z/3) + 8 = 0';
      const cleaned = cleanRawInput(raw);
      expect(cleaned).toBe('3(z/3)^2 + 14(z/3) + 8 = 0');

      const res = validateAndParseEquation(raw);
      expect(res.isValid).toBe(true);
    });

    it('corrects z2 + 14z + 24 = 0 and computes roots', () => {
      const raw = 'z2 + 14z + 24 = 0';
      const cleaned = cleanRawInput(raw);
      expect(cleaned).toBe('z^2 + 14z + 24 = 0');

      const res = validateAndParseEquation(raw);
      expect(res.isValid).toBe(true);
      if (res.isValid) {
        expect(res.solutions).toBeDefined();
        expect(res.solutions).toContain('z = -12');
        expect(res.solutions).toContain('z = -2');
      }
    });
  });
});

