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
}
