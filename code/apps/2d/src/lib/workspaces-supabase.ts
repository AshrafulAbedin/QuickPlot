import { getSupabase } from '@quickplot/auth'
import type {
  Workspace,
  WorkspaceCollaborator,
  WorkspaceRole,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  EquationEntry,
  ViewportState,
  SliderConfig,
  CanvasTheme,
} from '@quickplot/types'
import { WORKSPACE_SCHEMA_VERSION } from '@quickplot/types'

const TABLE = 'workspaces'
const COLLAB_TABLE = 'workspace_collaborators'

// Row shapes mirror supabase/migrations exactly; everything below this block
// speaks camelCase `@quickplot/types`.
interface WorkspaceRow {
  id: string
  owner_id: string
  title: string
  description: string | null
  schema_version: number
  equations: EquationEntry[]
  viewport: ViewportState
  sliders: SliderConfig[]
  theme: CanvasTheme | null
  is_public: boolean
  share_token: string
  created_at: string
  updated_at: string
  last_opened_at: string | null
}

interface CollaboratorRow {
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  created_at: string
  profiles: { display_name: string | null; avatar_url: string | null } | null
}

function rowToWorkspace(r: WorkspaceRow): Workspace {
  return {
    id: r.id,
    ownerId: r.owner_id,
    title: r.title,
    description: r.description,
    schemaVersion: r.schema_version,
    equations: r.equations ?? [],
    viewport: r.viewport,
    sliders: r.sliders ?? [],
    theme: r.theme ?? undefined,
    isPublic: r.is_public,
    shareToken: r.share_token,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    lastOpenedAt: r.last_opened_at,
  }
}

function rowToCollaborator(r: CollaboratorRow): WorkspaceCollaborator {
  return {
    workspaceId: r.workspace_id,
    userId: r.user_id,
    role: r.role,
    createdAt: r.created_at,
    profile: r.profiles ? { displayName: r.profiles.display_name, avatarUrl: r.profiles.avatar_url } : undefined,
  }
}

function fail(error: { message: string }): never {
  throw new Error(error.message)
}

// ── Workspaces ─────────────────────────────────────────────────────────────

export async function createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
  // owner_id and share_token come from column defaults; RLS rejects any spoofed owner.
  const row = {
    title: input.title,
    description: input.description ?? null,
    schema_version: WORKSPACE_SCHEMA_VERSION,
    equations: input.equations,
    viewport: input.viewport,
    sliders: input.sliders,
    theme: input.theme ?? null,
    is_public: input.isPublic ?? false,
  }
  const { data, error } = await getSupabase().from(TABLE).insert(row).select().single()
  if (error) fail(error)
  return rowToWorkspace(data as WorkspaceRow)
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  const { data, error } = await getSupabase().from(TABLE).select('*').eq('id', id).maybeSingle()
  if (error) fail(error)
  return data ? rowToWorkspace(data as WorkspaceRow) : null
}

/** Every workspace the signed-in user can open — owned and shared-with-me. RLS does the filtering. */
export async function listWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) fail(error)
  return (data as WorkspaceRow[]).map(rowToWorkspace)
}

export async function updateWorkspace(id: string, updates: UpdateWorkspaceInput): Promise<void> {
  const row: Record<string, unknown> = {}
  if (updates.title !== undefined) row.title = updates.title
  if (updates.description !== undefined) row.description = updates.description
  if (updates.equations !== undefined) row.equations = updates.equations
  if (updates.viewport !== undefined) row.viewport = updates.viewport
  if (updates.sliders !== undefined) row.sliders = updates.sliders
  if (updates.theme !== undefined) row.theme = updates.theme
  if (updates.isPublic !== undefined) row.is_public = updates.isPublic
  if (Object.keys(row).length === 0) return

  const { error } = await getSupabase().from(TABLE).update(row).eq('id', id)
  if (error) fail(error)
}

export async function deleteWorkspace(id: string): Promise<void> {
  const { error } = await getSupabase().from(TABLE).delete().eq('id', id)
  if (error) fail(error)
}

/** Records that someone opened the workspace. Works for viewers too (SECURITY DEFINER RPC). */
export async function markWorkspaceOpened(id: string): Promise<void> {
  const { error } = await getSupabase().rpc('mark_workspace_opened', { ws: id })
  if (error) fail(error)
}

// ── Public links ───────────────────────────────────────────────────────────

/** Anonymous read via share token; returns null unless the workspace is public. */
export async function getSharedWorkspace(shareToken: string): Promise<Workspace | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('*')
    .eq('share_token', shareToken)
    .eq('is_public', true)
    .maybeSingle()
  if (error) fail(error)
  return data ? rowToWorkspace(data as WorkspaceRow) : null
}

/** Toggles link sharing. The token is stable, so re-enabling revives old links. */
export async function setWorkspacePublic(id: string, isPublic: boolean): Promise<string> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .update({ is_public: isPublic })
    .eq('id', id)
    .select('share_token')
    .single()
  if (error) fail(error)
  return (data as { share_token: string }).share_token
}

// ── Collaborators ──────────────────────────────────────────────────────────

export async function listCollaborators(workspaceId: string): Promise<WorkspaceCollaborator[]> {
  const { data, error } = await getSupabase()
    .from(COLLAB_TABLE)
    .select('workspace_id, user_id, role, created_at, profiles(display_name, avatar_url)')
    .eq('workspace_id', workspaceId)
    .order('created_at')
  if (error) fail(error)
  return (data as unknown as CollaboratorRow[]).map(rowToCollaborator)
}

/** Owner-only. Resolves the email server-side so user ids never leak to the client. */
export async function addCollaboratorByEmail(workspaceId: string, email: string, role: WorkspaceRole): Promise<void> {
  const { error } = await getSupabase().rpc('add_collaborator_by_email', {
    ws: workspaceId,
    target_email: email,
    target_role: role,
  })
  if (error) fail(error)
}

export async function setCollaboratorRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<void> {
  const { error } = await getSupabase()
    .from(COLLAB_TABLE)
    .update({ role })
    .match({ workspace_id: workspaceId, user_id: userId })
  if (error) fail(error)
}

export async function removeCollaborator(workspaceId: string, userId: string): Promise<void> {
  const { error } = await getSupabase()
    .from(COLLAB_TABLE)
    .delete()
    .match({ workspace_id: workspaceId, user_id: userId })
  if (error) fail(error)
}
