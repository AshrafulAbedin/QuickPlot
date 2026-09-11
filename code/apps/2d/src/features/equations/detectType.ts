import type { EquationType } from './types';

export interface DetectionResult {
  type: EquationType;
  /** Expression to store in EquationEntry.expression. */
  expression: string;
  /** Only set for parametric; goes to EquationEntry.expressionY. */
  expressionY?: string;
  /** Only set for points; goes to EquationEntry.points. */
  points?: Array<{ x: number; y: number }>;
}

/**
 * Splits a comma-separated argument list, respecting nested parens so that
 * `f(a, b), g(c)` yields two entries. Used to detect the parametric and
 * point-list shapes below.
 */
function splitTopLevelCommas(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) {
      parts.push(s.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(s.slice(start));
  return parts.map(p => p.trim());
}

/** All top-level commas outside every parens/bracket group. */
function hasTopLevelComma(s: string): boolean {
  let depth = 0;
  for (const c of s) {
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) return true;
  }
  return false;
}

/** `(a, b)` outer-parens pair with a top-level comma inside. */
function stripOuterParens(s: string): string | null {
  const t = s.trim();
  if (!(t.startsWith('(') && t.endsWith(')'))) return null;
  let depth = 0;
  for (let i = 0; i < t.length - 1; i++) {
    if (t[i] === '(') depth++;
    else if (t[i] === ')') { depth--; if (depth === 0) return null; }
  }
  return t.slice(1, -1);
}

/** True when `s` reads as `<name> = <rest>`. Returns null otherwise. */
function matchLhsAssignment(s: string): { lhs: string; rhs: string } | null {
  // First `=` that is not `==`, `>=`, `<=`, `!=`.
  const t = s.trim();
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '=') {
      const prev = t[i - 1];
      const next = t[i + 1];
      if (prev === '<' || prev === '>' || prev === '!' || prev === '=') continue;
      if (next === '=') continue;
      return { lhs: t.slice(0, i).trim(), rhs: t.slice(i + 1).trim() };
    }
  }
  return null;
}

const POLAR_VAR = /(?:θ|\btheta\b)/;

/**
 * The polar renderer feeds `t` as the angle; if the user wrote `theta` or
 * `θ` we rewrite it so their expression evaluates correctly.
 */
function normalisePolarAngle(s: string): string {
  return s.replace(/θ/g, 't').replace(/\btheta\b/g, 't');
}

/**
 * Best-effort classifier for a single equation-input line. Rules, in order:
 *
 * 1. `(x_expr, y_expr)` with a `t` reference in either half → parametric.
 * 2. Comma-separated numeric pairs `(1,2), (3,4)` → points.
 * 3. Explicit `r = ...` or presence of θ / theta → polar.
 * 4. Assignment `<name> = ...` where the name is `y` or `f(x)` → cartesian.
 * 5. Any other line containing `=` → implicit (e.g. `x^2 + y^2 = 1`).
 * 6. Otherwise → cartesian (bare expression in x).
 *
 * The helper is pure so it stays trivially unit-testable and can move to
 * `packages/core` later if the 3D app grows a similar input.
 */
export function detectEquationType(raw: string): DetectionResult {
  const src = (raw ?? '').trim();
  if (!src) return { type: 'cartesian', expression: src };

  // ── (1) parametric: (x_expr, y_expr) with `t` somewhere ────────────────
  const paren = stripOuterParens(src);
  if (paren !== null && hasTopLevelComma(paren)) {
    const parts = splitTopLevelCommas(paren);
    if (parts.length === 2) {
      const [px, py] = parts;
      const referencesT = /\bt\b/.test(px) || /\bt\b/.test(py);
      const bothNumeric = isFiniteNumber(px) && isFiniteNumber(py);
      if (referencesT && !bothNumeric) {
        return { type: 'parametric', expression: px, expressionY: py };
      }
    }
  }

  // ── (2) points list: (n, n), (n, n), … ────────────────────────────────
  const points = tryParsePoints(src);
  if (points && points.length) {
    // Store the raw input as the expression so re-editing round-trips.
    return { type: 'points', expression: src, points };
  }

  // ── (3) polar: explicit r = … or θ / theta anywhere ───────────────────
  const assign = matchLhsAssignment(src);
  if (assign && /^r$/i.test(assign.lhs)) {
    return { type: 'polar', expression: normalisePolarAngle(assign.rhs) };
  }
  if (POLAR_VAR.test(src)) {
    return {
      type: 'polar',
      expression: normalisePolarAngle(assign ? assign.rhs : src),
    };
  }

  // ── (4) cartesian: y = … or f(x) = … ──────────────────────────────────
  if (assign && /^(?:y|f\s*\(\s*x\s*\))$/i.test(assign.lhs)) {
    return { type: 'cartesian', expression: assign.rhs };
  }

  // ── (5) any other `=` → implicit ──────────────────────────────────────
  if (assign) {
    return { type: 'implicit', expression: src };
  }

  // ── (6) default: bare expression in x → cartesian ─────────────────────
  return { type: 'cartesian', expression: src };
}

function isFiniteNumber(s: string): boolean {
  if (!s) return false;
  const n = Number(s);
  return Number.isFinite(n);
}

/**
 * Recognises a comma-separated list of numeric pairs. Accepts each pair
 * wrapped in parens (`(1, 2), (3, 4)`) or unwrapped when the whole input is
 * a single pair (`1, 2` → one point). Anything non-numeric aborts.
 */
export function tryParsePoints(raw: string): Array<{ x: number; y: number }> | null {
  const src = raw.trim();
  if (!src) return null;

  // Split by top-level commas — but pairs themselves also use commas, so
  // instead find every `( … )` group and, if none, fall back to a single
  // unwrapped pair.
  const groups: string[] = [];
  const re = /\(([^()]*)\)/g;
  let match: RegExpExecArray | null;
  let coveredEnd = 0;
  let coveredStart = -1;
  while ((match = re.exec(src)) !== null) {
    if (coveredStart === -1) coveredStart = match.index;
    coveredEnd = match.index + match[0].length;
    groups.push(match[1]);
  }

  // If parens groups don't cover the whole string (ignoring commas /
  // whitespace between them), bail — it's probably not a point list.
  if (groups.length > 0) {
    const between = src.slice(coveredStart === -1 ? 0 : 0, coveredEnd + 1);
    void between;
    const outside = src
      .replace(re, '')
      .replace(/[,\s]/g, '');
    if (outside.length > 0) return null;
  } else {
    // No parens at all — treat the whole line as one pair only if it has
    // exactly one top-level comma between two numerics.
    if (!hasTopLevelComma(src)) return null;
    groups.push(src);
  }

  const pts: Array<{ x: number; y: number }> = [];
  for (const g of groups) {
    const parts = splitTopLevelCommas(g);
    if (parts.length !== 2) return null;
    const [xs, ys] = parts;
    if (!isFiniteNumber(xs) || !isFiniteNumber(ys)) return null;
    pts.push({ x: Number(xs), y: Number(ys) });
  }
  return pts;
}
