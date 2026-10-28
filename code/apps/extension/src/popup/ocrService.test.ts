import { describe, it, expect } from 'vitest';
import { cleanOcrMathText } from './ocrService';
import { validateAndParseEquation } from './equationValidator';

describe('OCR Math Text Normalization', () => {
  it('corrects exact OCR misread from heart equation: (x^2 +y?--1)3--x%y^3=0', () => {
    const raw = '(x^2 +y?--1)3--x%y^3=0';
    const cleaned = cleanOcrMathText(raw);
    expect(cleaned).toBe('(x^2 + y^2 - 1)^3 - x^2 * y^3 = 0');

    const res = validateAndParseEquation(cleaned);
    expect(res.isValid).toBe(true);
    expect(res.type).toBe('implicit');
    if (res.isValid && res.evalImplicit) {
      // (0 + 1 - 1)^3 - 0 = 0
      expect(res.evalImplicit(0, 1)).toBeCloseTo(0);
    }
  });

  it('handles spaces between variables like x^2 y^3 and brackets like )^3', () => {
    const raw = '(x^2 + y^2 - 1)^3 - x^2 y^3 = 0';
    const cleaned = cleanOcrMathText(raw);
    expect(cleaned).toBe('(x^2 + y^2 - 1)^3 - x^2 * y^3 = 0');

    const res = validateAndParseEquation(cleaned);
    expect(res.isValid).toBe(true);
    expect(res.type).toBe('implicit');
  });

  it('cleans simple equation with spaces and exponents', () => {
    const raw = 'y = x 2 + 3';
    const cleaned = cleanOcrMathText(raw);
    expect(cleaned).toBe('y = x^2 + 3');

    const res = validateAndParseEquation(cleaned);
    expect(res.isValid).toBe(true);
  });

  it('fixes capital O misrecognized as 0 in equations', () => {
    const raw = '(x^2+y^2-1)^3 - x^2*y^3 = O';
    const cleaned = cleanOcrMathText(raw);
    expect(cleaned).toContain('= 0');

    const res = validateAndParseEquation(cleaned);
    expect(res.isValid).toBe(true);
    expect(res.type).toBe('implicit');
  });

  it('normalizes trigonometric functions and theta', () => {
    const raw = 'r = 1 - sintheta';
    const cleaned = cleanOcrMathText(raw);
    expect(cleaned).toBe('r = 1 - sin(theta)');

    const res = validateAndParseEquation(cleaned);
    expect(res.isValid).toBe(true);
    expect(res.type).toBe('polar');
  });

  it('handles unicode powers and multiplication symbols', () => {
    const raw = 'f(x) = 2 × x² - 4';
    const cleaned = cleanOcrMathText(raw);
    expect(cleaned).toBe('f(x) = 2 * x^2 - 4');

    const res = validateAndParseEquation(cleaned);
    expect(res.isValid).toBe(true);
  });

  it('strips equation numbering and noisy line artifacts', () => {
    const raw = '| y = sin(x) + cos(x) (1) |';
    const cleaned = cleanOcrMathText(raw);
    expect(cleaned).toBe('y = sin(x) + cos(x)');
  });

  it('corrects exact user-reported OCR output: (x2 + y^2 - = 1)^3 - x^2 * y3 = 0', () => {
    const raw = '(x2 + y^2 - = 1)^3 - x^2 * y3 = 0';
    const cleaned = cleanOcrMathText(raw);
    expect(cleaned).toBe('(x^2 + y^2 - 1)^3 - x^2 * y^3 = 0');

    const res = validateAndParseEquation(cleaned);
    expect(res.isValid).toBe(true);
    expect(res.type).toBe('implicit');
    if (res.isValid && res.evalImplicit) {
      expect(res.evalImplicit(0, 1)).toBeCloseTo(0);
    }
  });

  it('handles operator conflation like -= and spaceless adjacent powers like x2y3', () => {
    const raw = '(x2 + y2 -= 1)3 - x2y3 = 0';
    const cleaned = cleanOcrMathText(raw);
    expect(cleaned).toBe('(x^2 + y^2 - 1)^3 - x^2 * y^3 = 0');

    const res = validateAndParseEquation(cleaned);
    expect(res.isValid).toBe(true);
    expect(res.type).toBe('implicit');
  });

  it('corrects OCR minus misread as equals inside parentheses when outer equals exists', () => {
    const raw = '(x^2 + y^2 = 1)^3 - x^2 * y^3 = 0';
    const cleaned = cleanOcrMathText(raw);
    expect(cleaned).toBe('(x^2 + y^2 - 1)^3 - x^2 * y^3 = 0');

    const res = validateAndParseEquation(cleaned);
    expect(res.isValid).toBe(true);
    expect(res.type).toBe('implicit');
  });

  it('corrects Euler identity OCR misread where superscript i*pi is read as quotes: e” + 1 = 0', () => {
    const raw = 'e” + 1 = 0';
    const cleaned = cleanOcrMathText(raw);
    expect(cleaned).toBe('e^(i * pi) + 1 = 0');

    const res = validateAndParseEquation(cleaned);
    expect(res.isValid).toBe(true);
    expect(res.type).toBe('implicit');
    if (res.isValid && res.evalImplicit) {
      expect(res.evalImplicit(0, 0)).toBeCloseTo(0);
    }
    if (res.isValid && res.solutions) {
      expect(res.solutions[0]).toContain('True identity');
    }
  });

  it('corrects e^ipi + 1 = 0 and e" + 1 = 0', () => {
    expect(cleanOcrMathText('e^ipi + 1 = 0')).toBe('e^(i * pi) + 1 = 0');
    expect(cleanOcrMathText('e" + 1 = 0')).toBe('e^(i * pi) + 1 = 0');
    expect(cleanOcrMathText("e'' + 1 = 0")).toBe('e^(i * pi) + 1 = 0');
  });
});

