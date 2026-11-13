export interface Task {
  id: string            // "remote-12" or "local-1731400000000-ab12cd"
  remoteId?: number     // id from JSONPlaceholder (only for remote tasks)
  title: string
  completed: boolean
  isLocal: boolean      // created on this device (show an "Offline" badge)
  pendingSync: boolean  // local task not yet accepted by the API
}

/** Shape returned by https://jsonplaceholder.typicode.com/todos */
export interface RemoteTodo {
  id: number
  userId: number
  title: string
  completed: boolean
}

/** Changes the user made locally, which a refresh must never wipe out. */
export interface LocalMeta {
  deletedRemoteIds: number[]
  completionOverrides: Record<number, boolean>
}

export interface PersistedState {
  version: 1
  tasks: Task[]
  meta: LocalMeta
}