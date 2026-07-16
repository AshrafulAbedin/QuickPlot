// ─── Equation Types ──────────────────────────────────────────────────────────

/** Supported equation/curve types in QuickPlot. */
export type EquationType =
  | 'cartesian'
  | 'polar'
  | 'parametric'
  | 'implicit'
  | 'points'

/** A single equation entry as stored in a workspace. */
export interface EquationEntry {
  id: string
  type: EquationType
  /** Main expression: y=f(x), r=f(θ), x(t), or f(x,y)=0 */
  expression: string
  /** Second expression for parametric: y(t) */
  expressionY?: string
  /** Parameter range start (parametric/polar). Defaults to 0. */
  tMin: number
  /** Parameter range end (parametric/polar). Defaults to 2π. */
  tMax: number
  color: string
  visible: boolean
  /** Show f′(x) as a dashed overlay (cartesian only). */
  showDerivative?: boolean
  /** Pre-loaded point data for 'points' type. */
  points?: Array<{ x: number; y: number }>
}

// ─── Viewport ────────────────────────────────────────────────────────────────

/** The visible area of the 2D canvas. */
export interface ViewportState {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

// ─── Sliders ─────────────────────────────────────────────────────────────────

/** Configuration for a single parameter slider. */
export interface SliderConfig {
  name: string
  value: number
  min: number
  max: number
  step: number
}

// ─── Canvas Theme ────────────────────────────────────────────────────────────

export interface CanvasTheme {
  name: string
  bg: string
  gridColor: string
  axisColor: string
  textColor: string
}

// ─── User ────────────────────────────────────────────────────────────────────

/** Minimal user profile as stored in Firestore. */
export interface UserProfile {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  createdAt: string
}

// ─── Workspace ───────────────────────────────────────────────────────────────

/** A saved workspace document in Firestore. */
export interface Workspace {
  id: string
  ownerId: string
  title: string
  equations: EquationEntry[]
  viewport: ViewportState
  sliders: SliderConfig[]
  theme?: CanvasTheme
  /** Whether this workspace is accessible via share link. */
  shared: boolean
  /** Short unique ID used in share URLs. Only set when shared=true. */
  shareId?: string
  createdAt: string
  updatedAt: string
}

/** Fields allowed when creating a new workspace (id/timestamps auto-generated). */
export type CreateWorkspaceInput = Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>

/** Fields allowed when updating an existing workspace. */
export type UpdateWorkspaceInput = Partial<Omit<Workspace, 'id' | 'ownerId' | 'createdAt'>>
