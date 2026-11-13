import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { createTodo, fetchTodos } from '../api/todos'
import type { RemoteTodo } from '../types'
import { useTasks } from './useTasks'

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('../api/todos') // no real network calls in tests

const mockFetch = fetchTodos as jest.MockedFunction<typeof fetchTodos>
const mockCreate = createTodo as jest.MockedFunction<typeof createTodo>
const remote = (id: number, completed = false): RemoteTodo => ({ id, userId: 1, title: `todo ${id}`, completed })
const STORAGE_KEY = 'tasks-state-v1'

beforeEach(async () => {
  await AsyncStorage.clear()
  jest.clearAllMocks()
  mockFetch.mockResolvedValue({ items: [remote(1), remote(2)], hasMore: false })
  mockCreate.mockResolvedValue(remote(201))
})

/** Calls addTask and returns the error it threw (if any), like the form does. */
async function tryAdd(result: { current: ReturnType<typeof useTasks> }, title: string) {
  let error: Error | undefined
  await act(async () => {
    try {
      await result.current.addTask(title)
    } catch (e) {
      error = e as Error
    }
  })
  return error
}

describe('useTasks: offline task management', () => {
  it('creates tasks locally when offline, without calling the API', async () => {
    const { result } = await renderHook(() => useTasks(false))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(await tryAdd(result, '  Buy milk  ')).toBeUndefined()

    expect(result.current.tasks[0]).toMatchObject({ title: 'Buy milk', isLocal: true, pendingSync: true })
    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('rejects an empty title', async () => {
    const { result } = await renderHook(() => useTasks(false))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect((await tryAdd(result, '   '))?.message).toBe('Please enter a task title.')
    expect(result.current.tasks).toHaveLength(0)
  })
})

describe('useTasks: saved data', () => {
  it('restores saved tasks after a restart, even offline', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        tasks: [{ id: 'local-1', title: 'Saved offline', completed: false, isLocal: true, pendingSync: true }],
        meta: { deletedRemoteIds: [], completionOverrides: {} },
      }),
    )
    const { result } = await renderHook(() => useTasks(false))
    await waitFor(() => expect(result.current.tasks).toHaveLength(1))
    expect(result.current.tasks[0].title).toBe('Saved offline')
  })

  it('saves changes to the device so they survive an app restart', async () => {
    const first = await renderHook(() => useTasks(false))
    await waitFor(() => expect(first.result.current.loading).toBe(false))
    await tryAdd(first.result, 'Survive restart')
    await waitFor(async () => expect(await AsyncStorage.getItem(STORAGE_KEY)).toContain('Survive restart'))
    await first.unmount()

    const second = await renderHook(() => useTasks(false))
    await waitFor(() => expect(second.result.current.tasks.map((t) => t.title)).toEqual(['Survive restart']))
  })
})

describe('useTasks: refreshing', () => {
  it('keeps local tasks, completions and deletions when refreshing, with no duplicates', async () => {
    const { result } = await renderHook(() => useTasks(true))
    await waitFor(() => expect(result.current.tasks).toHaveLength(2))

    await tryAdd(result, 'My own task')
    await act(async () => {
      result.current.toggleTask('remote-1')
    })
    await act(async () => {
      result.current.deleteTask('remote-2')
    })

    await act(async () => {
      await result.current.refresh() // the API still returns todo 1 (not completed) and todo 2
    })

    const ids = result.current.tasks.map((t) => t.id)
    expect(ids).toHaveLength(2) // local task + remote-1, no duplicates
    expect(ids).toContain('remote-1')
    expect(ids).not.toContain('remote-2') // stays deleted
    expect(result.current.tasks.find((t) => t.id === 'remote-1')?.completed).toBe(true) // local change wins
    expect(result.current.tasks.some((t) => t.title === 'My own task')).toBe(true)
  })
})

describe('useTasks: API failures', () => {
  it('shows an error, then recovers when the user retries', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Server error (500). Please try again.'))
    const { result } = await renderHook(() => useTasks(true))
    await waitFor(() => expect(result.current.error).toBe('Server error (500). Please try again.'))
    expect(result.current.tasks).toHaveLength(0)

    await act(async () => {
      await result.current.refresh() // the "Retry" button
    })
    expect(result.current.error).toBeNull()
    expect(result.current.tasks).toHaveLength(2)
  })

  it('does not add a task when the API call fails, and reports why', async () => {
    const { result } = await renderHook(() => useTasks(true))
    await waitFor(() => expect(result.current.tasks).toHaveLength(2))
    mockCreate.mockRejectedValueOnce(new Error('Cannot reach the server. Check your connection.'))

    expect((await tryAdd(result, 'Will fail'))?.message).toMatch(/Cannot reach the server/)
    expect(result.current.tasks).toHaveLength(2)
  })

  it('ignores a second add while the first is still saving', async () => {
    const { result } = await renderHook(() => useTasks(true))
    await waitFor(() => expect(result.current.tasks).toHaveLength(2))

    let finish!: () => void
    mockCreate.mockReturnValueOnce(new Promise<RemoteTodo>((r) => (finish = () => r(remote(201)))))
    await act(async () => {
      const a = result.current.addTask('Once')
      const b = result.current.addTask('Once')
      finish()
      await Promise.all([a, b])
    })

    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(result.current.tasks.filter((t) => t.isLocal)).toHaveLength(1)
  })
})