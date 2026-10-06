/**
 * Parsers for 3D point data (x, y, z).
 *
 * The 2D equivalents live in `dataset.ts` and return `{ x, y }`; these are the
 * three-dimensional counterparts. Kept separate rather than widening
 * `DataPoint` so the 2D grapher's behaviour is untouched.
 */

export type DataPoint3D = { x: number; y: number; z: number };

/** Number() that reports NaN for null/''/undefined instead of coercing to 0. */
function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function push(out: DataPoint3D[], x: number, y: number, z: number): void {
  if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) out.push({ x, y, z });
}

/**
 * Expands a gridded surface — `{ x: [...], y: [...], z: [[...], [...]] }` —
 * into flat points. `z[row][col]` is the height at `(x[col], y[row])`, which is
 * the layout numpy/pandas and most plotting tools emit.
 */
function fromGrid(xs: unknown[], ys: unknown[], zRows: unknown[]): DataPoint3D[] {
  const out: DataPoint3D[] = [];
  for (let r = 0; r < zRows.length && r < ys.length; r++) {
    const row = zRows[r];
    if (!Array.isArray(row)) continue;
    for (let c = 0; c < row.length && c < xs.length; c++) {
      push(out, num(xs[c]), num(ys[r]), num(row[c]));
    }
  }
  return out;
}

/**
 * Accepts, in order of preference:
 *   [[x, y, z], ...]                        triples
 *   [{ x, y, z }, ...]                      objects (also accepts X/Y/Z)
 *   { x: [...], y: [...], z: [[...]] }      gridded surface
 *   { x: [...], y: [...], z: [...] }        parallel columns
 *   { data: <any of the above> }            wrapped payload
 * Rows that aren't fully numeric are skipped rather than throwing.
 */
export function parseJsonData3D(raw: unknown): DataPoint3D[] {
  if (Array.isArray(raw)) {
    const out: DataPoint3D[] = [];
    for (const item of raw) {
      if (Array.isArray(item) && item.length >= 3) {
        push(out, num(item[0]), num(item[1]), num(item[2]));
      } else if (typeof item === 'object' && item !== null) {
        const o = item as Record<string, unknown>;
        push(out, num(o.x ?? o.X), num(o.y ?? o.Y), num(o.z ?? o.Z));
      }
    }
    return out;
  }

  if (typeof raw === 'object' && raw !== null) {
    const o = raw as Record<string, unknown>;
    const xs = o.x ?? o.X ?? o.xs;
    const ys = o.y ?? o.Y ?? o.ys;
    const zs = o.z ?? o.Z ?? o.zs ?? o.values;

    if (Array.isArray(xs) && Array.isArray(ys) && Array.isArray(zs)) {
      // A matrix of heights means gridded data; a flat list means columns.
      if (zs.length > 0 && Array.isArray(zs[0])) return fromGrid(xs, ys, zs);
      const out: DataPoint3D[] = [];
      for (let i = 0; i < xs.length; i++) push(out, num(xs[i]), num(ys[i]), num(zs[i]));
      return out;
    }

    if (Array.isArray(o.data)) return parseJsonData3D(o.data);
    if (o.data && typeof o.data === 'object') return parseJsonData3D(o.data);
  }

  return [];
}

/**
 * Three numeric columns per row, separated by comma, semicolon or tab.
 * Header rows parse as NaN and are skipped, so no flag is needed for them.
 */
export function parseCsvData3D(text: string): DataPoint3D[] {
  const out: DataPoint3D[] = [];
  for (const line of text.trim().split(/\r?\n/)) {
    const parts = line.split(/[,;\t]+/).map(s => s.trim().replace(/^["']|["']$/g, ''));
    if (parts.length < 3) continue;
    push(out, num(parts[0]), num(parts[1]), num(parts[2]));
  }
  return out;
}

/** Axis-aligned bounds of a point set, or null when empty. */
export function boundsOf(points: DataPoint3D[]): {
  min: DataPoint3D;
  max: DataPoint3D;
} | null {
  if (!points.length) return null;
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const p of points) {
    if (p.x < min.x) min.x = p.x;
    if (p.y < min.y) min.y = p.y;
    if (p.z < min.z) min.z = p.z;
    if (p.x > max.x) max.x = p.x;
    if (p.y > max.y) max.y = p.y;
    if (p.z > max.z) max.z = p.z;
  }
  return { min, max };
}
