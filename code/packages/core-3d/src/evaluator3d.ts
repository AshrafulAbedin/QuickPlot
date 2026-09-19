import { compile } from 'mathjs';
import type { EvalFunction } from 'mathjs';

const cache3d = new Map<string, EvalFunction>();

function getCached3d(expr: string): EvalFunction {
  if (cache3d.has(expr)) return cache3d.get(expr)!;
  if (cache3d.size >= 128) cache3d.delete(cache3d.keys().next().value!);
  const compiled = compile(expr) as EvalFunction;
  cache3d.set(expr, compiled);
  return compiled;
}

function normalize3d(raw: string): string {
  return raw.replace(/^z\s*=\s*/, '').trim();
}

export function evaluate3D(
  expression: string,
): ((x: number, y: number) => number) | null {
  const expr = normalize3d(expression);
  if (!expr) return null;
  let compiled: EvalFunction;
  try { compiled = getCached3d(expr); }
  catch { return null; }
  const scope: { x: number; y: number } = { x: 0, y: 0 };
  return (x: number, y: number): number => {
    scope.x = x;
    scope.y = y;
    try {
      const r = compiled.evaluate(scope) as unknown;
      return typeof r === 'number' && isFinite(r) ? r : 0;
    } catch { return 0; }
  };
}

export function validate3DExpression(raw: string): string | null {
  const expr = normalize3d(raw);
  if (!expr) return null;
  try { getCached3d(expr); return null; }
  catch (e) { return e instanceof Error ? e.message : 'Invalid expression'; }
}
