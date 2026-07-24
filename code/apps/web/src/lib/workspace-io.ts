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
    typeof o.xMin === 'number' &&
    typeof o.xMax === 'number' &&
    typeof o.yMin === 'number' &&
    typeof o.yMax === 'number'
  )
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

  if (!Array.isArray(o.equations)) {
    throw new Error('Missing or invalid "equations" array.')
  }

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
