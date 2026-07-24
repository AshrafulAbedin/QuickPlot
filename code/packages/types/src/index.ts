export type EquationType =
  | 'cartesian'
  | 'polar'
  | 'parametric'
  | 'implicit'
  | 'points'

export interface EquationEntry {
  id: string
  type: EquationType
  expression: string
  expressionY?: string
  tMin: number
  tMax: number
  color: string
  visible: boolean
  showDerivative?: boolean
  points?: Array<{ x: number; y: number }>
}

export interface ViewportState {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

export interface SliderConfig {
  name: string
  value: number
  min: number
  max: number
  step: number
}

export interface CanvasTheme {
  name: string
  bg: string
  gridColor: string
  axisColor: string
  textColor: string
}

export interface UserProfile {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  createdAt: string
}

export interface Workspace {
  id: string
  ownerId: string
  title: string
  equations: EquationEntry[]
  viewport: ViewportState
  sliders: SliderConfig[]
  theme?: CanvasTheme
  shared: boolean
  shareId?: string
  createdAt: string
  updatedAt: string
}

export type CreateWorkspaceInput = Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>

export type UpdateWorkspaceInput = Partial<Omit<Workspace, 'id' | 'ownerId' | 'createdAt'>>
