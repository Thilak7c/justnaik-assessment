import AsyncStorage from '@react-native-async-storage/async-storage'
import type { PersistedState } from '../types'

const KEY = 'tasks-state-v1'

export const EMPTY_STATE: PersistedState = {
  version: 1,
  tasks: [],
  meta: { deletedRemoteIds: [], completionOverrides: {} },
}

export async function loadState(): Promise<PersistedState> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (!raw) return EMPTY_STATE
    const parsed = JSON.parse(raw) as PersistedState
    return parsed.version === 1 ? parsed : EMPTY_STATE
  } catch {
    return EMPTY_STATE // corrupted data must not crash the app
  }
}

export async function saveState(state: PersistedState): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(state))
}