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

// ── normalise: strip "y =" / "r =" / "f(x) =" prefixes ──────────────────
function normalize(raw: string): string {
  return raw.replace(/^[a-zA-Z]\s*(?:\([a-zA-Z]\))?\s*=\s*/, '').trim();
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
      return typeof r === 'number' ? r : NaN;
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
      return typeof r === 'number' ? r : NaN;
    } catch { return NaN; }
  };
}

// ── public: detect free parameters ───────────────────────────────────────

// Multi-char mathjs constants / functions that start with a letter and
// would otherwise look like user variables after we strip function calls.
const KNOWN_CONSTANTS = new Set([
  'pi', 'phi', 'tau', 'Infinity', 'NaN', 'true', 'false',
  'e',  'i',   'x',  't', 'theta', 'r',
]);

/**
 * Returns the set of single-letter free parameters found in `raw` —
 * i.e. letters that are not x/t/e/i/pi and are not mathjs function names.
 *
 * Example: "a * sin(b * x) + c" → ['a', 'b', 'c']
 */
export function detectParameters(raw: string): string[] {
  const expr = normalize(raw);
  if (!expr) return [];
  try {
    // Use mathjs parse tree to find SymbolNodes that aren't function names
    const ast = parse(expr);
    const params = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ast.traverse((node: any) => {
      if (node.type === 'SymbolNode') {
        const name: string = node.name;
        // single-letter, not a known constant / independent variable
        if (/^[a-zA-Z]$/.test(name) && !KNOWN_CONSTANTS.has(name)) {
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
    s = s.replace(/\b(x|t|theta|e|i|r)\b/g, '0');
    return [...new Set(s.match(/\b[a-zA-Z]\b/g) ?? [])];
  }
}
