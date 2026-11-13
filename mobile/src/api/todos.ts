import type { RemoteTodo } from '../types'

const BASE = 'https://jsonplaceholder.typicode.com'
export const PAGE_SIZE = 20

async function request<T>(path: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000) // never hang forever
  try {
    const res = await fetch(`${BASE}${path}`, { ...init, signal: controller.signal })
    if (!res.ok) throw new Error(`Server error (${res.status}). Please try again.`)
    return res
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw new Error('The request timed out. Please try again.')
    if (err instanceof TypeError) throw new Error('Cannot reach the server. Check your connection.')
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchTodos(page: number) {
  const res = await request(`/todos?_page=${page}&_limit=${PAGE_SIZE}`)
  const items = (await res.json()) as RemoteTodo[]
  const total = Number(res.headers.get('x-total-count') ?? 0)
  return { items, hasMore: page * PAGE_SIZE < total }
}

export async function createTodo(title: string) {
  const res = await request('/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, completed: false, userId: 1 }),
  })
  return (await res.json()) as RemoteTodo // simulated: id is always 201, we ignore it
}