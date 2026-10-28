import { compile, parse, type EvalFunction } from 'mathjs';

// ── compile cache ────────────────────────────────────────────────────────
const cache = new Map<string, EvalFunction>();
function getCached(expr: string): EvalFunction {
  if (cache.has(expr)) return cache.get(expr)!;
  if (cache.size >= 256) cache.delete(cache.keys().next().value!);
  const compiled = compile(expr) as EvalFunction;
  cache.set(expr, compiled);
  return compiled;
}

// ── implicit multiplication preprocessor ─────────────────────────────────

const KNOWN_FUNCTIONS = [
  'asinh', 'acosh', 'atanh', 'acsch', 'asech', 'acoth',
  'sinh', 'cosh', 'tanh', 'csch', 'sech', 'coth',
  'asin', 'acos', 'atan2', 'atan', 'acsc', 'asec', 'acot',
  'sin', 'cos', 'tan', 'csc', 'sec', 'cot',
  'log10', 'log2', 'log', 'ln', 'exp',
  'sqrt', 'cbrt',
  'abs', 'sign', 'round', 'floor', 'ceil', 'min', 'max', 'mod', 'gcd', 'lcm',
];

const KNOWN_MULTI_CONSTANTS = [
  'Infinity', 'NaN', 'false', 'true',
  'theta', 'tau', 'phi', 'pi',
];

type TokenType =
  | 'NUMBER'
  | 'FUNC'
  | 'CONST'
  | 'VAR'
  | 'OP'
  | 'PAREN_OPEN'
  | 'PAREN_CLOSE'
  | 'COMMA'
  | 'SPACE';

interface Token {
  type: TokenType;
  value: string;
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = expr.length;

  while (i < len) {
    const ch = expr[i];

    // Whitespace
    if (/\s/.test(ch)) {
      let space = '';
      while (i < len && /\s/.test(expr[i])) {
        space += expr[i++];
      }
      tokens.push({ type: 'SPACE', value: space });
      continue;
    }

    // Number (including scientific notation like 1e-5 or 2.5e3)
    if (/\d/.test(ch) || (ch === '.' && i + 1 < len && /\d/.test(expr[i + 1]))) {
      let num = '';
      while (i < len && /[\d.]/.test(expr[i])) {
        num += expr[i++];
      }
      // check exponent (e.g., 1e5, 2.5e-3)
      if (i < len && (expr[i] === 'e' || expr[i] === 'E')) {
        const nextChar = expr[i + 1];
        if (nextChar === '+' || nextChar === '-' || /\d/.test(nextChar)) {
          num += expr[i++]; // 'e'
          if (expr[i] === '+' || expr[i] === '-') {
            num += expr[i++];
          }
          while (i < len && /\d/.test(expr[i])) {
            num += expr[i++];
          }
        }
      }
      tokens.push({ type: 'NUMBER', value: num });
      continue;
    }

    // Parentheses and brackets
    if (ch === '(' || ch === '[' || ch === '{') {
      tokens.push({ type: 'PAREN_OPEN', value: ch });
      i++;
      continue;
    }
    if (ch === ')' || ch === ']' || ch === '}') {
      tokens.push({ type: 'PAREN_CLOSE', value: ch });
      i++;
      continue;
    }

    // Comma
    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ch });
      i++;
      continue;
    }

    // Comparison or two-char operators: ==, !=, <=, >=
    if (
      (ch === '=' && expr[i + 1] === '=') ||
      (ch === '!' && expr[i + 1] === '=') ||
      (ch === '<' && expr[i + 1] === '=') ||
      (ch === '>' && expr[i + 1] === '=')
    ) {
      tokens.push({ type: 'OP', value: expr.slice(i, i + 2) });
      i += 2;
      continue;
    }

    // Single-char operators
    if (/[\+\-\*\/\^\%<>=!]/.test(ch)) {
      tokens.push({ type: 'OP', value: ch });
      i++;
      continue;
    }

    // Greek theta symbol
    if (ch === 'θ') {
      tokens.push({ type: 'CONST', value: 'theta' });
      i++;
      continue;
    }

    // Alphabetic sequences (words)
    if (/[a-zA-Z_]/.test(ch)) {
      let word = '';
      while (i < len && /[a-zA-Z0-9_]/.test(expr[i])) {
        word += expr[i++];
      }

      let remaining = word;
      while (remaining.length > 0) {
        // Try matching a known function
        const matchedFunc = KNOWN_FUNCTIONS.find(fn => {
          if (remaining.toLowerCase().startsWith(fn)) {
            // function matches
            return true;
          }
          return false;
        });

        if (matchedFunc) {
          tokens.push({ type: 'FUNC', value: matchedFunc });
          remaining = remaining.slice(matchedFunc.length);
          continue;
        }

        // Try matching a known multi-letter constant
        const matchedConst = KNOWN_MULTI_CONSTANTS.find(cn => {
          return remaining.toLowerCase().startsWith(cn.toLowerCase());
        });

        if (matchedConst) {
          tokens.push({ type: 'CONST', value: matchedConst });
          remaining = remaining.slice(matchedConst.length);
          continue;
        }

        // Single-letter variable/parameter
        const singleChar = remaining[0];
        tokens.push({ type: 'VAR', value: singleChar });
        remaining = remaining.slice(1);
      }
      continue;
    }

    // Fallback for any other character
    tokens.push({ type: 'OP', value: ch });
    i++;
  }

  return tokens;
}

/**
 * Expands mathematical shorthand like `mx` -> `m * x`, `2x` -> `2 * x`,
 * `(x+1)(x-1)` -> `(x+1) * (x-1)`, and `sin(mx)` -> `sin(m * x)`.
 */
export function expandImplicitMultiplication(expr: string): string {
  if (!expr.trim()) return '';
  const tokens = tokenize(expr);
  if (tokens.length === 0) return '';

  const result: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const cur = tokens[i];
    if (cur.type === 'SPACE') {
      result.push(' ');
      continue;
    }

    // Check if we should insert `*` before cur token
    if (result.length > 0) {
      let prevIdx = i - 1;
      let hadSpace = false;
      while (prevIdx >= 0 && tokens[prevIdx].type === 'SPACE') {
        hadSpace = true;
        prevIdx--;
      }

      if (prevIdx >= 0) {
        const prev = tokens[prevIdx];
        const prevCanEndMult =
          prev.type === 'NUMBER' ||
          prev.type === 'VAR' ||
          prev.type === 'CONST' ||
          prev.type === 'PAREN_CLOSE';

        const curCanStartMult =
          cur.type === 'NUMBER' ||
          cur.type === 'VAR' ||
          cur.type === 'CONST' ||
          cur.type === 'FUNC' ||
          cur.type === 'PAREN_OPEN';

        if (prevCanEndMult && curCanStartMult) {
          if (hadSpace) {
            while (result.length > 0 && result[result.length - 1] === ' ') {
              result.pop();
            }
          }
          result.push(' * ');
        }
      }
    }

    result.push(cur.value);
  }

  return result.join('');
}

// ── extract real component (handles real numbers and complex results from Euler's identity) ──
function extractReal(r: unknown): number {
  if (typeof r === 'number') return r;
  if (typeof r === 'boolean') return r ? 1 : 0;
  if (r && typeof r === 'object' && 're' in r && typeof (r as { re: unknown }).re === 'number') {
    const c = r as { re: number; im?: number };
    // If purely real or negligible imaginary component (e.g. Euler identity e^(i*pi) + 1 ≈ 0 + 1.2e-16i)
    if (c.im === undefined || Math.abs(c.im) < 1e-10) {
      return Math.abs(c.re) < 1e-12 ? 0 : c.re;
    }
  }
  return NaN;
}

// ── normalise: strip "y =" / "r =" / "f(x) =" prefixes ──────────────────
function normalize(raw: string): string {
  let stripped = raw.replace(/^[a-zA-Z]\s*(?:\([a-zA-Z]\))?\s*=\s*/, '').trim();
  // Normalize Euler's identity shorthands: e^ipi, e^(ipi), e^{ipi}, e^i*pi -> e^(i*pi)
  stripped = stripped.replace(/\be\s*\^\s*\{?\s*i\s*\*?\s*(?:pi|π)\s*\}?/gi, 'e^(i*pi)');
  stripped = stripped.replace(/\be\s*\^\s*\{?\s*(?:pi|π)\s*\*?\s*i\s*\}?/gi, 'e^(i*pi)');
  stripped = stripped.replace(/\be\s*\^\s*\(?\s*i\s*pi\s*\)?/gi, 'e^(i*pi)');
  stripped = stripped.replace(/\be\s*\^\s*\(?\s*pi\s*i\s*\)?/gi, 'e^(i*pi)');
  stripped = stripped.replace(/\beipi\b/gi, 'e^(i*pi)');
  // OCR quotes / primes misreading: e”, e", e'', e^”, e^" -> e^(i*pi)
  stripped = stripped.replace(/\be\s*\^?\s*["”'’“‘″′]{1,2}(?=\s*[+\-=]|\s*$|\s*\))/gi, 'e^(i*pi)');
  return expandImplicitMultiplication(stripped);
}

// ── public: parse a Cartesian expression ─────────────────────────────────

/**
 * Compiles `raw` into a fast (x) → number function.
 * Throws a readable Error when the expression is syntactically invalid.
 * Supports anything mathjs handles: sin(x), x^2, sqrt(x), e^x, pi …
 */
export function parseExpression(raw: string): (x: number) => number {
  const expr = normalize(raw);
  if (!expr) throw new Error('Empty expression');
  let compiled: EvalFunction;
  try { compiled = getCached(expr); }
  catch (e) { throw new Error(e instanceof Error ? e.message : 'Parse error'); }
  const scope = { x: 0 };
  return (x: number): number => {
    scope.x = x;
    try {
      const r = compiled.evaluate(scope) as unknown;
      return extractReal(r);
    } catch { return NaN; }
  };
}

/**
 * Returns null when the expression is valid, or an error message if not.
 * An empty expression returns null (not an error — just not plotted).
 */
export function validateExpression(raw: string): string | null {
  const expr = normalize(raw);
  if (!expr) return null;
  try { getCached(expr); return null; }
  catch (e) { return e instanceof Error ? e.message : 'Invalid expression'; }
}

// ── public: parameterised parse (slider scope) ────────────────────────────

/**
 * Compiles an expression that may contain free parameters beyond the
 * independent variable.  Returns a function that takes a full scope object
 * `{ x: number, a: number, b: number, … }` and returns a number.
 * The caller is responsible for including the independent variable in the scope.
 */
export function parseWithScope(
  raw: string,
): (scope: Record<string, number>) => number {
  const expr = normalize(raw);
  if (!expr) return () => NaN;
  let compiled: EvalFunction;
  try { compiled = getCached(expr); }
  catch { return () => NaN; }
  return (scope: Record<string, number>): number => {
    try {
      const r = compiled.evaluate(scope) as unknown;
      return extractReal(r);
    } catch { return NaN; }
  };
}

// ── public: detect free parameters ───────────────────────────────────────

// Multi-char mathjs constants / functions that start with a letter and
// would otherwise look like user variables after we strip function calls.
const KNOWN_MATH_CONSTANTS = new Set([
  'pi', 'phi', 'tau', 'Infinity', 'NaN', 'true', 'false',
  'e',  'i',
]);

const DEFAULT_IGNORED_VARS = new Set([
  'x', 'y', 'z', 't', 'theta', 'r',
]);

/**
 * Returns the set of single-letter free parameters found in `raw` —
 * i.e. letters that are not in ignoredVars and are not mathjs constants/functions.
 *
 * Example: "a * sin(b * x) + c" → ['a', 'b', 'c']
 */
export function detectParameters(
  raw: string,
  ignoredVars?: string[] | Set<string>,
): string[] {
  const expr = normalize(raw);
  if (!expr) return [];
  const ignored = ignoredVars
    ? (ignoredVars instanceof Set ? ignoredVars : new Set(ignoredVars))
    : DEFAULT_IGNORED_VARS;

  try {
    // Use mathjs parse tree to find SymbolNodes that aren't function names
    const ast = parse(expr);
    const params = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ast.traverse((node: any) => {
      if (node.type === 'SymbolNode') {
        const name: string = node.name;
        // single-letter, not a known constant / independent variable
        if (/^[a-zA-Z]$/.test(name) && !KNOWN_MATH_CONSTANTS.has(name) && !ignored.has(name)) {
          params.add(name);
        }
      }
    });
    return Array.from(params);
  } catch {
    // fallback: simple regex strip of function-call names then scan
    let s = expr;
    s = s.replace(/\b[a-zA-Z][a-zA-Z0-9_]*\s*\(/g, '(');   // strip fn names
    s = s.replace(/\b(pi|phi|tau|Infinity|NaN|true|false)\b/gi, '0');
    s = s.replace(/\b(e|i)\b/g, '0');
    ignored.forEach(v => {
      s = s.replace(new RegExp(`\\b${v}\\b`, 'g'), '0');
    });
    return [...new Set(s.match(/\b[a-zA-Z]\b/g) ?? [])];
  }
}
