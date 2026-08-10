export type DataPoint = { x: number; y: number };

export function parseJsonData(raw: unknown): DataPoint[] {
  if (Array.isArray(raw)) {
    return raw.flatMap((item: unknown) => {
      if (Array.isArray(item) && item.length >= 2) {
        const x = Number(item[0]), y = Number(item[1]);
        return isFinite(x) && isFinite(y) ? [{ x, y }] : [];
      }
      if (typeof item === 'object' && item !== null) {
        const o = item as Record<string, unknown>;
        const x = Number(o.x ?? o[0]), y = Number(o.y ?? o[1]);
        return isFinite(x) && isFinite(y) ? [{ x, y }] : [];
      }
      return [];
    });
  }
  if (typeof raw === 'object' && raw !== null) {
    const o = raw as Record<string, unknown>;
    const xs = o.x ?? o.X ?? o.xs;
    const ys = o.y ?? o.Y ?? o.ys ?? o.values;
    if (Array.isArray(xs) && Array.isArray(ys)) {
      return xs.flatMap((xv: unknown, i: number) => {
        const x = Number(xv), y = Number((ys as unknown[])[i]);
        return isFinite(x) && isFinite(y) ? [{ x, y }] : [];
      });
    }
    if (Array.isArray(o.data)) return parseJsonData(o.data);
  }
  return [];
}

export function parseCsvData(text: string): DataPoint[] {
  const result: DataPoint[] = [];
  for (const line of text.trim().split(/\r?\n/)) {
    const parts = line.split(/[,;\t]+/).map(s => s.trim().replace(/^["']|["']$/g, ''));
    if (parts.length < 2) continue;
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    // Non-numeric rows (e.g. headers) produce NaN — skip them
    if (isFinite(x) && isFinite(y)) result.push({ x, y });
  }
  return result;
}

/** Normalise "f(x,y) = g(x,y)" → "(f(x,y)) - (g(x,y))" for zero-level evaluation. */
export function normalizeImplicit(raw: string): string {
  const eqIdx = raw.indexOf('=');
  if (eqIdx === -1) return raw.trim();
  const lhs = raw.slice(0, eqIdx).trim();
  const rhs = raw.slice(eqIdx + 1).trim();
  if (!rhs || rhs === '0') return lhs;
  return `(${lhs}) - (${rhs})`;
}
