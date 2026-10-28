import { normalizeLatex } from './latex';
import {
  parseExpression,
  validateExpression,
  parseWithScope,
  expandImplicitMultiplication,
  normalizeImplicit,
} from '@quickplot/core';

export interface ValidEquationResult {
  isValid: true;
  type: 'cartesian' | 'implicit' | 'polar';
  originalInput: string;
  cleanedExpr: string;
  displayTitle: string;
  evalCartesian?: (x: number) => number;
  evalImplicit?: (x: number, y: number) => number;
  evalPolar?: (theta: number) => number;
  solutions?: string[];
}

export interface InvalidEquationResult {
  isValid: false;
  originalInput: string;
  error: string;
}

export type ValidationResult = ValidEquationResult | InvalidEquationResult;

// Multi-character words that are recognized math functions / constants
const ALLOWED_MATH_IDENTIFIERS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
  'sec', 'csc', 'cot', 'asec', 'acsc', 'acot',
  'exp', 'log', 'ln', 'log10', 'log2',
  'sqrt', 'cbrt', 'abs', 'sign',
  'pi', 'tau', 'phi', 'e', 'i', 'infinity', 'inf',
  'round', 'floor', 'ceil', 'min', 'max', 'mod',
  'x', 'y', 't', 'theta', 'r', 'f', 'g', 'z',
]);

/** Normalize unicode math symbols, Wolfram MathWorld quirks, and LaTeX artifacts to standard math expressions */
export function cleanRawInput(raw: string): string {
  let cleaned = normalizeLatex(raw);

  // 1. Strip trailing equation numbering e.g. "(1)", "(2)", "[1]" commonly found on MathWorld / Wikipedia
  cleaned = cleaned.replace(/(?:\s{2,}|[.;]\s+)[\(\[]\s*\d+\s*[\)\]]\s*$/, '');

  // 2. Strip trailing dots, periods, or semicolons (e.g. "r(theta)=1-sintheta.")
  cleaned = cleaned.replace(/[.;,]+$/, '').trim();

  // 3. Normalize brackets: MathWorld frequently uses [ ] for outer algebraic grouping
  cleaned = cleaned.replace(/\[/g, '(').replace(/\]/g, ')');

  // 4. Unicode symbols to ASCII
  cleaned = cleaned
    .replace(/[−–—]/g, '-')
    .replace(/[×✕]/g, '*')
    .replace(/÷/g, '/')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, run => '^(' + Array.from(run, c => '0123456789-+'['⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺'.indexOf(c)]).join('') + ')')
    .replace(/[·⋅\u2062]/g, '*').replace(/[\u200b\u2061]/g, '')
    .replace(/π/g, 'pi')
    .replace(/θ/g, 'theta')
    .replace(/\\theta/g, 'theta')
    .replace(/√\s*(\w+|\([^)]+\))/g, 'sqrt($1)')
    .replace(/\|([^|]+)\|/g, 'abs($1)')
    .replace(/[-–—]\s*=\s*/g, '- ')
    .replace(/\+\s*=\s*/g, '+ ');

  // If there are multiple '=' signs, any '=' inside parentheses was an OCR minus misread
  while ((cleaned.match(/=/g) || []).length > 1 && /\([^()]*=[^()]*\)/.test(cleaned)) {
    cleaned = cleaned.replace(/\(([^()]*)=([^()]*)\)/g, '($1 - $2)');
  }

  // Bracket trailing exponent without caret e.g. ')3' -> ')^3'
  cleaned = cleaned.replace(/[\)\]]\s*([2-9]|\d+)\b/g, ')^$1');

  // Euler's identity: small superscript 'iπ' in textbooks has vertical stems that Tesseract reads as '”', '"', "''", '’', '″'
  // e.g. e” + 1 = 0, e" + 1 = 0, e'' + 1 = 0, e^” + 1 = 0, e^" + 1 = 0 -> e^(i*pi) + 1 = 0
  cleaned = cleaned.replace(/\be\s*\^?\s*["”'’“‘″′]{1,2}(?=\s*[+\-=]|\s*$|\s*\))/gi, 'e^(i*pi)');
  cleaned = cleaned.replace(/\be\s*\^\s*\{?\s*i\s*\*?\s*(?:pi|π)\s*\}?/gi, 'e^(i*pi)');
  cleaned = cleaned.replace(/\be\s*\^\s*\{?\s*(?:pi|π)\s*\*?\s*i\s*\}?/gi, 'e^(i*pi)');
  cleaned = cleaned.replace(/\be\s*\^\s*\(?\s*i\s*pi\s*\)?/gi, 'e^(i*pi)');
  cleaned = cleaned.replace(/\be\s*\^\s*\(?\s*pi\s*i\s*\)?/gi, 'e^(i*pi)');
  cleaned = cleaned.replace(/\beipi\b/gi, 'e^(i*pi)');

  // Single-letter coordinate variable powers without caret e.g. '3x2' -> '3x^2', 'x2' -> 'x^2', 'y3' -> 'y^3', 'z2' -> 'z^2'
  // Preceded by anything other than an alphabetic letter (allows coefficient digits, operators, space, parens, start of string)
  cleaned = cleaned.replace(/(?<![a-zA-Z])([xytrzs])([2-9])(?=[a-zA-Z])/gi, '$1^$2 * ');
  cleaned = cleaned.replace(/(?<![a-zA-Z])([xytrzs])\s*([2-9])\b(?!\s*[\(\w])/gi, '$1^$2');
  cleaned = cleaned.replace(/(?<![a-zA-Z])([a-zA-Z])\s*([2-9])\b(?!\s*[\(\w])/g, '$1^$2');

  // 5. Expand Wolfram MathWorld trig shorthand notation without parens:
  // e.g. "sintheta" -> "sin(theta)", "costheta" -> "cos(theta)", "sint" -> "sin(t)"
  cleaned = cleaned
    .replace(/\b(sin|cos|tan|sec|csc|cot)theta\b/gi, '$1(theta)')
    .replace(/\b(sin|cos|tan|sec|csc|cot)t\b/gi, '$1(t)')
    .replace(/\b(sin|cos|tan|sec|csc|cot)x\b/gi, '$1(x)')
    .replace(/\b(sin|cos|tan|sec|csc|cot)y\b/gi, '$1(y)');

  // 6. Expand trigonometric exponent notation: e.g. "sin^3(t)" or "sin^2(x)" -> "(sin(t))^3"
  cleaned = cleaned.replace(/\b(sin|cos|tan|sec|csc|cot)\^(?:\((\d+)\)|(\d+))\s*(\([^()]*\)|[a-zA-Z]+|[0-9.]+)/g,
    (_match, fn, groupedPower, power, arg) => '(' + fn + '(' + (arg.startsWith('(') ? arg.slice(1, -1) : arg) + '))^' + (groupedPower || power));
  cleaned = cleaned.replace(/\b(sin|cos|tan|sec|csc|cot)\s+(theta|x|y|t|pi|\d+(?:\.\d+)?)(?![a-zA-Z0-9])/g, '$1($2)');

  return cleaned.replace(/\bln\s*\(/g, 'log(').trim();
}

/** Check if the input contains non-math words */
function containsJunkWords(expr: string): string | null {
  const words = expr.match(/[a-zA-Z]+/g) || [];
  for (const word of words) {
    const lower = word.toLowerCase();
    if (!ALLOWED_MATH_IDENTIFIERS.has(lower) && !/^[xy]+$/.test(lower)) {
      return `Unrecognized word or variable "${word}". Mathematical expressions can only contain math functions and variables (x, y, theta, r).`;
    }
  }
  return null;
}

/**
 * Validates whether the given raw string is an equation/function.
 * Handles:
 * - "y = x^2 - 4", "f(x) = sin(x)" (Cartesian)
 * - "r(theta) = 1 - sintheta", "r = 1 - sin(theta)" (Polar Cardioid Heart Curve)
 * - "(x^2+y^2-1)^3 - x^2y^3 = 0" (Implicit Algebraic Heart Curve)
 * - "x^2 + y^2 = 9" (Implicit Circle)
 */
export function validateAndParseEquation(raw: string): ValidationResult {
  const input = cleanRawInput(raw);
  if (!input) {
    return {
      isValid: false,
      originalInput: raw,
      error: 'Please enter or select a mathematical equation to plot.',
    };
  }

  if (/[\\{}_<>≤≥]/.test(input) || (input.match(/=/g) || []).length > 1) {
    return { isValid: false, originalInput: raw, error: 'This notation is not supported yet. Enter a single scalar equation in x and y, or r and theta; replace parameters with numeric values.' };
  }

  // Check for non-math words
  const junkWordError = containsJunkWords(input);
  if (junkWordError) {
    return {
      isValid: false,
      originalInput: raw,
      error: junkWordError,
    };
  }

  // 1. Check for polar assignment: "r(theta) = ...", "r = ..." or containing theta
  const polarMatch = input.match(/^(?:r\s*\(\s*(?:theta|t)\s*\)|r)\s*=\s*(.+)$/i);
  if (polarMatch) {
    const rhs = polarMatch[1].trim();
    return validatePolar(rhs, raw, `r(θ) = ${rhs}`);
  }

  // 2. Check if it's an explicit Cartesian assignment: "y = ...", "f(x) = ..."
  const assignmentMatch = input.match(/^(?:y\s*=|f\s*\(\s*x\s*\)\s*=|g\s*\(\s*x\s*\)\s*=)\s*(.+)$/i);
  if (assignmentMatch) {
    const rhs = assignmentMatch[1].trim();
    if (/\by\b/.test(expandImplicitMultiplication(rhs))) return validateImplicit(input, raw);
    return validateCartesian(rhs, raw, `y = ${rhs}`);
  }

  // 3. Check for implicit equation with both x and y: e.g. "(x^2+y^2-1)^3 - x^2*y^3 = 0"
  if (input.includes('=')) {
    return validateImplicit(input, raw);
  }

  // 4. Polar curve without "r = " prefix if it explicitly depends on theta
  if (input.toLowerCase().includes('theta')) {
    return validatePolar(input, raw, `r(θ) = ${input}`);
  }

  // 5. Fallback to standard Cartesian expression in terms of x
  return validateCartesian(input, raw, `y = ${input}`);
}

function scopeError(expr: string, variables: string[]): string | null {
  const reserved = new Set(['x', 'y', 'z', 't', 'theta', 'r', 'f', 'g']);
  const tokens = expandImplicitMultiplication(expr).match(/[a-zA-Z]+/g) || [];
  const invalid = tokens.find(token => reserved.has(token) && !variables.includes(token));
  return invalid ? 'Variable "' + invalid + '" needs a numeric value or a supported coordinate equation.' : null;
}

function formatNum(n: number): string {
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  for (let d = 2; d <= 12; d++) {
    const num = Math.round(n * d);
    if (Math.abs(n - num / d) < 1e-6) {
      return `${num}/${d} (≈ ${n.toFixed(3)})`;
    }
  }
  return n.toFixed(3);
}

export function solveSingleVariableEquation(
  evalFn: (val: number) => number,
  varName: string
): string[] | undefined {
  try {
    const f0 = evalFn(0);
    const f1 = evalFn(1);
    const fMinus1 = evalFn(-1);
    const f2 = evalFn(2);

    if (!Number.isFinite(f0) || !Number.isFinite(f1) || !Number.isFinite(fMinus1) || !Number.isFinite(f2)) {
      return undefined;
    }

    const a = (f1 + fMinus1 - 2 * f0) / 2;
    const b = (f1 - fMinus1) / 2;
    const c = f0;

    // Verify if quadratic approximation holds at x = 2
    const expectedF2 = a * 4 + b * 2 + c;
    if (Math.abs(f2 - expectedF2) > 1e-4) {
      return undefined;
    }

    // Degree 2 (Quadratic)
    if (Math.abs(a) > 1e-9) {
      const disc = b * b - 4 * a * c;
      if (disc < -1e-9) {
        return [`No real roots (${varName} has complex solutions)`];
      }
      if (Math.abs(disc) < 1e-9) {
        const root = -b / (2 * a);
        return [`${varName} = ${formatNum(root)} (double root)`];
      }
      const sqrtDisc = Math.sqrt(disc);
      const r1 = (-b + sqrtDisc) / (2 * a);
      const r2 = (-b - sqrtDisc) / (2 * a);
      const minR = Math.min(r1, r2);
      const maxR = Math.max(r1, r2);
      return [`${varName} = ${formatNum(minR)}`, `${varName} = ${formatNum(maxR)}`];
    }

    // Degree 1 (Linear)
    if (Math.abs(b) > 1e-9) {
      const root = -c / b;
      return [`${varName} = ${formatNum(root)}`];
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function validateCartesian(expr: string, raw: string, displayTitle: string): ValidationResult {
  const variableError = scopeError(expr, ['x']);
  if (variableError) return { isValid: false, originalInput: raw, error: variableError };
  const expanded = expandImplicitMultiplication(expr);
  const syntaxErr = validateExpression(expanded);
  if (syntaxErr) {
    return {
      isValid: false,
      originalInput: raw,
      error: `Syntax error: ${syntaxErr}`,
    };
  }

  try {
    const compiled = parseWithScope(expanded);

    return {
      isValid: true,
      type: 'cartesian',
      originalInput: raw,
      cleanedExpr: expanded,
      displayTitle,
      evalCartesian: (x: number) => {
        const val = compiled({ x, z: x, t: x });
        return isFinite(val) ? val : NaN;
      },
    };
  } catch (err) {
    return {
      isValid: false,
      originalInput: raw,
      error: err instanceof Error ? err.message : 'Invalid mathematical expression',
    };
  }
}

function validatePolar(expr: string, raw: string, displayTitle: string): ValidationResult {
  const variableError = scopeError(expr, ['theta', 't']);
  if (variableError) return { isValid: false, originalInput: raw, error: variableError };
  const expanded = expandImplicitMultiplication(expr);
  const syntaxErr = validateExpression(expanded);
  if (syntaxErr) {
    return {
      isValid: false,
      originalInput: raw,
      error: `Syntax error in polar equation: ${syntaxErr}`,
    };
  }

  try {
    const compiled = parseWithScope(expanded);

    return {
      isValid: true,
      type: 'polar',
      originalInput: raw,
      cleanedExpr: expanded,
      displayTitle,
      evalPolar: (theta: number) => {
        const val = compiled({ theta, t: theta, x: theta });
        return isFinite(val) ? val : NaN;
      },
    };
  } catch (err) {
    return {
      isValid: false,
      originalInput: raw,
      error: err instanceof Error ? err.message : 'Invalid polar expression',
    };
  }
}

function validateImplicit(input: string, raw: string): ValidationResult {
  const singleVarMatch = input.match(/\b([xyzt])\b/g);
  const uniqueVars = Array.from(new Set(singleVarMatch || []));
  const allowedVars = (uniqueVars.length === 1 && uniqueVars[0] === 'z') ? ['z'] : ['x', 'y'];
  const variableError = scopeError(input, allowedVars);
  if (variableError) return { isValid: false, originalInput: raw, error: variableError };
  try {
    const normalized = normalizeImplicit(input);
    const expanded = expandImplicitMultiplication(normalized);
    const syntaxErr = validateExpression(expanded);
    if (syntaxErr) {
      return {
        isValid: false,
        originalInput: raw,
        error: `Invalid implicit equation: ${syntaxErr}`,
      };
    }

    const compiled = parseWithScope(expanded);

    // If single variable equation (e.g. 3x^2 + 14x + 8 = 0 or z^2 + 14z + 24 = 0), calculate roots/solutions
    const singleVarMatch = input.match(/\b([xyzt])\b/g);
    const uniqueVars = Array.from(new Set(singleVarMatch || []));
    let solutions: string[] | undefined;
    if (uniqueVars.length === 1) {
      const v = uniqueVars[0];
      solutions = solveSingleVariableEquation((val) => {
        return compiled({ x: val, y: val, z: val, t: val });
      }, v);
    } else if (uniqueVars.length === 0) {
      // Constant equation without variables (e.g. e^(i*pi) + 1 = 0, 1 = 1)
      const diff = compiled({ x: 0, y: 0, z: 0, t: 0 });
      if (Math.abs(diff) < 1e-6) {
        solutions = ['✓ True identity (Euler\'s Identity: e^(i*pi) + 1 = 0)'];
      } else {
        solutions = ['✗ Contradiction (False equation)'];
      }
    }

    return {
      isValid: true,
      type: 'implicit',
      originalInput: raw,
      cleanedExpr: expanded,
      displayTitle: input,
      evalImplicit: (x: number, y: number) => {
        const val = compiled({ x, y, z: x, t: x });
        return isFinite(val) ? val : NaN;
      },
      solutions,
    };
  } catch (err) {
    return {
      isValid: false,
      originalInput: raw,
      error: err instanceof Error ? err.message : 'Invalid equation format',
    };
  }
}
