import { normalizeImplicit, validateExpression } from '@quickplot/core';
import type { EquationEntry as SavedEquation } from '@quickplot/types';
import type { EquationEntry } from '../equations/types';
import { uid } from '../equations/useEquations';
import type { CanvasTheme as SavedTheme } from '@quickplot/types';
import type { CanvasTheme } from '@quickplot/renderer';

export function saveTheme(theme: CanvasTheme): SavedTheme {
  return { name: theme.name, bg: theme.bg, gridColor: theme.majorLine, axisColor: theme.axis,
    textColor: theme.label, minorLine: theme.minorLine, majorLine: theme.majorLine };
}

export function restoreTheme(theme: SavedTheme): CanvasTheme {
  return { name: theme.name, bg: theme.bg, minorLine: theme.minorLine ?? theme.gridColor,
    majorLine: theme.majorLine ?? theme.gridColor, axis: theme.axisColor, label: theme.textColor };
}

// Saved IDs may collide with the current browser's local ID counter.
// Rebuild transient parse errors rather than persisting them in the database.
export function restoreEquations(saved: SavedEquation[]): EquationEntry[] {
  return saved.map(eq => ({
    ...eq,
    id: uid(),
    error: eq.type === 'points' ? null : validateExpression(
      eq.type === 'implicit' ? normalizeImplicit(eq.expression) : eq.expression,
    ),
    errorY: eq.type === 'parametric' ? validateExpression(eq.expressionY ?? '') : undefined,
  }));
}
