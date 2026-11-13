import { useCallback, useEffect, useRef, useState } from 'react'
import { createTodo, fetchTodos } from '../api/todos'
import { EMPTY_STATE, loadState, saveState } from '../storage/taskStorage'
import type { PersistedState, Task } from '../types'
import { mergeRemote, newLocalId } from '../utils/mergeTasks'

export function useTasks(online: boolean) {
  const [state, setState] = useState<PersistedState>(EMPTY_STATE)
  const [hydrated, setHydrated] = useState(false) // saved data has been read from the device
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busy = useRef(false)   // one network load at a time
  const addingRef = useRef(false)
  const started = useRef(false)

  // 1. Restore saved tasks when the app starts
  useEffect(() => {
    loadState().then((saved) => {
      setState(saved)
      setHydrated(true)
    })
  }, [])

  // 2. Save every change to the device (only after restoring, or we'd overwrite saved data with empty state)
  useEffect(() => {
    if (hydrated) saveState(state).catch(() => {})
  }, [state, hydrated])

  const fetchPage = useCallback(async (target: number) => {
    const { items, hasMore: more } = await fetchTodos(target)
    // functional update: always merges into the LATEST state, so local changes are never lost
    setState((s) => ({ ...s, tasks: mergeRemote(s.tasks, items, s.meta) }))
    setPage(target)
    setHasMore(more)
  }, [])

  const refresh = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    setRefreshing(true)
    setError(null)
    try {
      await fetchPage(1)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      busy.current = false
      setRefreshing(false)
    }
  }, [fetchPage])

  // 3. First load: fetch as soon as we are hydrated AND online (also fires later if we started offline)
  useEffect(() => {
    if (!hydrated || !online || started.current) return
    started.current = true
    refresh()
  }, [hydrated, online, refresh])

  const loadMore = useCallback(async () => {
    if (busy.current || !hasMore || !online) return
    busy.current = true
    setLoadingMore(true)
    try {
      await fetchPage(page + 1)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      busy.current = false
      setLoadingMore(false)
    }
  }, [fetchPage, hasMore, online, page])

  /** Throws if the title is empty or the API fails, so the form can keep what the user typed. */
  const addTask = useCallback(
    async (rawTitle: string) => {
      const title = rawTitle.trim()
      if (!title) throw new Error('Please enter a task title.')
      if (addingRef.current) return // no double submission
      addingRef.current = true
      setAdding(true)
      try {
        if (online) await createTodo(title) // API simulated; a failure throws and nothing is added
        const task: Task = { id: newLocalId(), title, completed: false, isLocal: true, pendingSync: !online }
        setState((s) => ({ ...s, tasks: [task, ...s.tasks] }))
      } finally {
        addingRef.current = false
        setAdding(false)
      }
    },
    [online],
  )

  const toggleTask = useCallback((id: string) => {
    setState((s) => {
      const t = s.tasks.find((x) => x.id === id)
      if (!t) return s
      const completed = !t.completed
      return {
        ...s,
        tasks: s.tasks.map((x) => (x.id === id ? { ...x, completed } : x)),
        // remember the change for remote tasks, so a refresh can't undo it
        meta:
          t.remoteId != null
            ? { ...s.meta, completionOverrides: { ...s.meta.completionOverrides, [t.remoteId]: completed } }
            : s.meta,
      }
    })
  }, [])

  const deleteTask = useCallback((id: string) => {
    setState((s) => {
      const t = s.tasks.find((x) => x.id === id)
      if (!t) return s
      const overrides = { ...s.meta.completionOverrides }
      if (t.remoteId != null) delete overrides[t.remoteId]
      return {
        ...s,
        tasks: s.tasks.filter((x) => x.id !== id),
        // remember the deletion for remote tasks, so a refresh doesn't bring it back
        meta:
          t.remoteId != null
            ? { deletedRemoteIds: [...s.meta.deletedRemoteIds, t.remoteId], completionOverrides: overrides }
            : s.meta,
      }
    })
  }, [])

  return {
    tasks: state.tasks,
    loading: !hydrated || (refreshing && state.tasks.length === 0), // first-load spinner
    refreshing,
    loadingMore,
    adding,
    hasMore,
    error,
    clearError: () => setError(null),
    refresh,
    loadMore,
    addTask,
    toggleTask,
    deleteTask,
  }
}