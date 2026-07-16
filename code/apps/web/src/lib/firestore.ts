import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import { getApp } from 'firebase/app'
import type {
  Workspace,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from '@quickplot/types'

// ─── Firestore instance ──────────────────────────────────────────────────────

const db = getFirestore(getApp())
const workspacesRef = collection(db, 'workspaces')

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert Firestore timestamps to ISO strings in a workspace doc. */
function toWorkspace(id: string, data: Record<string, unknown>): Workspace {
  const createdAt = data.createdAt as Timestamp | undefined
  const updatedAt = data.updatedAt as Timestamp | undefined

  return {
    ...data,
    id,
    createdAt: createdAt?.toDate().toISOString() ?? new Date().toISOString(),
    updatedAt: updatedAt?.toDate().toISOString() ?? new Date().toISOString(),
  } as Workspace
}

/** Generate a short share ID (8 chars, URL-safe). */
function generateShareId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// ─── CRUD Operations ─────────────────────────────────────────────────────────

/** Create a new workspace. Returns the full workspace with generated ID. */
export async function createWorkspace(
  input: CreateWorkspaceInput,
): Promise<Workspace> {
  const docData = {
    ...input,
    shareId: input.shared ? generateShareId() : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const docRef = await addDoc(workspacesRef, docData)
  return {
    ...input,
    id: docRef.id,
    shareId: docData.shareId ?? undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/** Get a workspace by its document ID. Returns null if not found. */
export async function getWorkspace(id: string): Promise<Workspace | null> {
  const snap = await getDoc(doc(db, 'workspaces', id))
  if (!snap.exists()) return null
  return toWorkspace(snap.id, snap.data())
}

/** Get all workspaces owned by a user, ordered by most recently updated. */
export async function getUserWorkspaces(uid: string): Promise<Workspace[]> {
  const q = query(
    workspacesRef,
    where('ownerId', '==', uid),
    orderBy('updatedAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => toWorkspace(d.id, d.data()))
}

/** Update fields on an existing workspace. */
export async function updateWorkspace(
  id: string,
  updates: UpdateWorkspaceInput,
): Promise<void> {
  const docRef = doc(db, 'workspaces', id)
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

/** Delete a workspace by ID. */
export async function deleteWorkspace(id: string): Promise<void> {
  await deleteDoc(doc(db, 'workspaces', id))
}

/** Look up a shared workspace by its short shareId. Returns null if not found or not shared. */
export async function getSharedWorkspace(
  shareId: string,
): Promise<Workspace | null> {
  const q = query(
    workspacesRef,
    where('shareId', '==', shareId),
    where('shared', '==', true),
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const first = snap.docs[0]
  return toWorkspace(first.id, first.data())
}

/** Toggle sharing on a workspace. Generates a shareId if enabling. */
export async function toggleWorkspaceSharing(
  id: string,
  shared: boolean,
): Promise<string | null> {
  const shareId = shared ? generateShareId() : null
  await updateWorkspace(id, { shared, shareId: shareId ?? undefined })
  return shareId
}
