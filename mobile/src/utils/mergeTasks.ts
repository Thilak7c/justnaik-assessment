import type { LocalMeta, RemoteTodo, Task } from '../types'

export function newLocalId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Combine the tasks we already have with a fresh batch from the API:
 *  - no duplicates (same remote id is updated, not added again)
 *  - locally created tasks are kept
 *  - locally deleted remote tasks stay deleted
 *  - local completion changes win over what the server says
 */
export function mergeRemote(current: Task[], remote: RemoteTodo[], meta: LocalMeta): Task[] {
  const byId = new Map<string, Task>(current.map((t) => [t.id, t]))

  for (const r of remote) {
    if (meta.deletedRemoteIds.includes(r.id)) continue
    const id = `remote-${r.id}`
    byId.set(id, {
      id,
      remoteId: r.id,
      title: r.title,
      completed: meta.completionOverrides[r.id] ?? r.completed,
      isLocal: false,
      pendingSync: false,
    })
  }

  const all = [...byId.values()]
  const local = all.filter((t) => t.isLocal) // already newest-first (we prepend on add)
  const remoteTasks = all
    .filter((t) => !t.isLocal)
    .sort((a, b) => (a.remoteId ?? 0) - (b.remoteId ?? 0))
  return [...local, ...remoteTasks]
}