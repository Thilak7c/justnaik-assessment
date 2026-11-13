import { mergeRemote } from './mergeTasks'
import type { LocalMeta, RemoteTodo, Task } from '../types'

const remote = (id: number, completed = false): RemoteTodo => ({ id, userId: 1, title: `todo ${id}`, completed })
const noMeta: LocalMeta = { deletedRemoteIds: [], completionOverrides: {} }
const localTask: Task = { id: 'local-1', title: 'Mine', completed: false, isLocal: true, pendingSync: true }

describe('mergeRemote', () => {
  it('does not create duplicates when refreshing twice', () => {
    const once = mergeRemote([], [remote(1), remote(2)], noMeta)
    const twice = mergeRemote(once, [remote(1), remote(2)], noMeta)
    expect(twice).toHaveLength(2)
  })

  it('keeps locally created tasks after a refresh', () => {
    const merged = mergeRemote([localTask], [remote(1)], noMeta)
    expect(merged.map((t) => t.id)).toEqual(['local-1', 'remote-1'])
  })

  it('keeps local completion changes over the server value', () => {
    const merged = mergeRemote([], [remote(1, false)], { deletedRemoteIds: [], completionOverrides: { 1: true } })
    expect(merged[0].completed).toBe(true)
  })

  it('does not bring back a task deleted locally', () => {
    const merged = mergeRemote([], [remote(1), remote(2)], { deletedRemoteIds: [1], completionOverrides: {} })
    expect(merged.map((t) => t.remoteId)).toEqual([2])
  })

  it('keeps local tasks in newest-first order', () => {
    const a: Task = { ...localTask, id: 'local-2', title: 'Newer' }
    const b: Task = { ...localTask, id: 'local-1', title: 'Older' }
    const merged = mergeRemote([a, b], [remote(1)], noMeta)
    expect(merged.map((t) => t.id)).toEqual(['local-2', 'local-1', 'remote-1'])
  })
})