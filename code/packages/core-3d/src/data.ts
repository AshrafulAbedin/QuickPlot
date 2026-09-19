export function parseJsonData(raw: unknown): Array<{ x: number; y: number }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is { x: number; y: number } =>
      item !== null &&
      typeof item === 'object' &&
      typeof item.x === 'number' &&
      typeof item.y === 'number',
    )
    .map(item => ({ x: item.x, y: item.y }));
}

export function parseCsvData(text: string): Array<{ x: number; y: number }> {
  const lines = text.trim().split(/\r?\n/);
  const results: Array<{ x: number; y: number }> = [];
  for (const line of lines) {
    const parts = line.split(/[,\t]+/);
    if (parts.length < 2) continue;
    const x = parseFloat(parts[0]);
    const y = parseFloat(parts[1]);
    if (isFinite(x) && isFinite(y)) results.push({ x, y });
  }
  return results;
}
