import type {
  Workspace,
  EquationEntry,
  ViewportState,
  SliderConfig,
  CanvasTheme,
} from '@quickplot/types'

export interface ExportedWorkspace {
  quickplotVersion: 1
  title: string
  equations: EquationEntry[]
  viewport: ViewportState
  sliders: SliderConfig[]
  theme?: CanvasTheme
}

export interface ImportedWorkspace {
  title: string
  equations: EquationEntry[]
  viewport: ViewportState
  sliders: SliderConfig[]
  theme?: CanvasTheme
}

export function serializeWorkspace(ws: Workspace): ExportedWorkspace {
  return {
    quickplotVersion: 1,
    title: ws.title,
    equations: ws.equations,
    viewport: ws.viewport,
    sliders: ws.sliders,
    theme: ws.theme,
  }
}

export function serializeWorkspaceToString(ws: Workspace): string {
  return JSON.stringify(serializeWorkspace(ws), null, 2)
}

function isViewport(v: unknown): v is ViewportState {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    finite(o.xMin) && finite(o.xMax) && finite(o.yMin) && finite(o.yMax) &&
    o.xMin < o.xMax && o.yMin < o.yMax
  )
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isEquation(value: unknown): value is EquationEntry {
  if (!record(value)) return false
  return typeof value.id === 'string' &&
    ['cartesian', 'polar', 'parametric', 'implicit', 'points'].includes(String(value.type)) &&
    typeof value.expression === 'string' &&
    (value.expressionY === undefined || typeof value.expressionY === 'string') &&
    finite(value.tMin) && finite(value.tMax) && typeof value.color === 'string' &&
    typeof value.visible === 'boolean' &&
    (value.showDerivative === undefined || typeof value.showDerivative === 'boolean') &&
    (value.points === undefined || (Array.isArray(value.points) && value.points.every(p => record(p) && finite(p.x) && finite(p.y))))
}

function isSlider(value: unknown): value is SliderConfig {
  return record(value) && typeof value.name === 'string' && finite(value.min) && finite(value.max) &&
    finite(value.value) && finite(value.step) && value.min < value.max && value.step > 0 &&
    value.value >= value.min && value.value <= value.max
}

function isTheme(value: unknown): value is CanvasTheme {
  return record(value) && ['name', 'bg', 'gridColor', 'axisColor', 'textColor'].every(key => typeof value[key] === 'string') &&
    ['minorLine', 'majorLine'].every(key => value[key] === undefined || typeof value[key] === 'string')
}

const DEFAULT_VIEWPORT: ViewportState = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 }

export function parseWorkspaceJson(text: string): ImportedWorkspace {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('Not valid JSON.')
  }

  if (typeof raw !== 'object' || raw === null) {
    throw new Error('File does not contain a workspace object.')
  }

  const o = raw as Record<string, unknown>
  const title = typeof o.title === 'string' && o.title.trim() ? o.title : 'Imported workspace'

  if (!Array.isArray(o.equations) || !o.equations.every(isEquation)) {
    throw new Error('Missing or invalid "equations" array.')
  }

  if (o.viewport !== undefined && !isViewport(o.viewport)) throw new Error('Invalid viewport bounds.')
  if (o.sliders !== undefined && (!Array.isArray(o.sliders) || !o.sliders.every(isSlider))) throw new Error('Invalid sliders.')
  if (o.theme != null && !isTheme(o.theme)) throw new Error('Invalid theme.')

  return {
    title,
    equations: o.equations as EquationEntry[],
    viewport: isViewport(o.viewport) ? o.viewport : DEFAULT_VIEWPORT,
    sliders: Array.isArray(o.sliders) ? (o.sliders as SliderConfig[]) : [],
    theme: (o.theme as CanvasTheme | undefined) ?? undefined,
  }
}

export function downloadWorkspace(ws: Workspace): void {
  const json = serializeWorkspaceToString(ws)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safe = ws.title.replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '') || 'workspace'
  a.download = `${safe}.json`
  a.click()
  URL.revokeObjectURL(url)
}
