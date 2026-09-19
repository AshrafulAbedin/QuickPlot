import { supabase } from './supabase'
import type {
  Workspace,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  EquationEntry,
  ViewportState,
  SliderConfig,
  CanvasTheme,
} from '@quickplot/types'

const TABLE = 'workspaces'

interface WorkspaceRow {
  id: string
  owner_id: string
  title: string
  equations: EquationEntry[]
  viewport: ViewportState
  sliders: SliderConfig[]
  theme: CanvasTheme | null
  shared: boolean
  share_id: string | null
  created_at: string
  updated_at: string
}

function rowToWorkspace(r: WorkspaceRow): Workspace {
  return {
    id: r.id,
    ownerId: r.owner_id,
    title: r.title,
    equations: r.equations ?? [],
    viewport: r.viewport,
    sliders: r.sliders ?? [],
    theme: r.theme ?? undefined,
    shared: r.shared,
    shareId: r.share_id ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function generateShareId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function createWorkspace(
  input: CreateWorkspaceInput,
): Promise<Workspace> {
  const row = {
    owner_id: input.ownerId,
    title: input.title,
    equations: input.equations,
    viewport: input.viewport,
    sliders: input.sliders,
    theme: input.theme ?? null,
    shared: input.shared,
    share_id: input.shared ? generateShareId() : null,
  }
  const { data, error } = await supabase.from(TABLE).insert(row).select().single()
  if (error) throw new Error(error.message)
  return rowToWorkspace(data as WorkspaceRow)
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? rowToWorkspace(data as WorkspaceRow) : null
}

export async function getUserWorkspaces(uid: string): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('owner_id', uid)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as WorkspaceRow[]).map(rowToWorkspace)
}

export async function updateWorkspace(
  id: string,
  updates: UpdateWorkspaceInput,
): Promise<void> {
  const row: Record<string, unknown> = {}
  if (updates.title !== undefined) row.title = updates.title
  if (updates.equations !== undefined) row.equations = updates.equations
  if (updates.viewport !== undefined) row.viewport = updates.viewport
  if (updates.sliders !== undefined) row.sliders = updates.sliders
  if (updates.theme !== undefined) row.theme = updates.theme
  if (updates.shared !== undefined) row.shared = updates.shared
  if (updates.shareId !== undefined) row.share_id = updates.shareId

  const { error } = await supabase.from(TABLE).update(row).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteWorkspace(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getSharedWorkspace(
  shareId: string,
): Promise<Workspace | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('share_id', shareId)
    .eq('shared', true)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? rowToWorkspace(data as WorkspaceRow) : null
}

export async function toggleWorkspaceSharing(
  id: string,
  shared: boolean,
): Promise<string | null> {
  const shareId = shared ? generateShareId() : null
  const { error } = await supabase
    .from(TABLE)
    .update({ shared, share_id: shareId })
    .eq('id', id)
  if (error) throw new Error(error.message)
  return shareId
}
