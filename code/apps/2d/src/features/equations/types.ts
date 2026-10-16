export type EquationType = 'cartesian' | 'polar' | 'parametric' | 'implicit' | 'points';

export interface EquationEntry {
  id: string;
  type: EquationType;
  expression: string;       // cartesian/polar: expr in x or t; parametric: x(t)
  expressionY?: string;     // parametric only: y(t)
  tMin: number;             // parametric / polar range
  tMax: number;
  color: string;
  visible: boolean;
  error: string | null;
  errorY?: string | null;   // second-expression error for parametric
  points?: Array<{ x: number; y: number }>; // pre-loaded for 'points' type
  showDerivative?: boolean;                 // cartesian only: show f' as dashed overlay
  /**
   * Raw text the user typed into the unified input. When present the row
   * renders `rawInput` verbatim instead of reconstructing from `type` +
   * `expression`; this preserves e.g. `(cos(t), sin(t))` on re-render.
   */
  rawInput?: string;
  /**
   * `true` (default) means the row auto-detects its type as the user types.
   * `false` means the user pinned a type via the manual selector.
   */
  autoDetect?: boolean;
}
