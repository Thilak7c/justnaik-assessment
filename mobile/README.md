# Task Manager (React Native + Expo)

Offline-friendly task list built with Expo, TypeScript, and AsyncStorage. Tasks are fetched from
JSONPlaceholder (https://jsonplaceholder.typicode.com/todos). No backend or login is required.

## Setup
    cd mobile
    npm install
    npx expo start
Scan the QR code with Expo Go (same Wi-Fi), or press `a` for an Android emulator. Use `--tunnel` if the phone cannot connect.

## Features
- Paginated list (FlatList), pull-to-refresh, infinite scroll
- Add, complete/uncomplete, delete; search and All / Active / Completed filters
- Works offline: tasks are saved on the device, offline-created tasks show an "Offline (not sent)" badge
- Refresh merges server data without duplicates and keeps local tasks, completions and deletions
- Loading, empty and offline states; errors with Retry; empty titles rejected; no double submit; input kept on failure

## Tests
    npm test
Covers the merge logic, offline task creation, restoring saved data, refreshing without losing local changes,
API failure recovery, and the add form.

## How it works
- `src/utils/mergeTasks.ts`: merges server tasks with local tasks and local changes
- `src/hooks/useTasks.ts`: loading, saving, refresh, add, toggle, delete
- `src/storage/taskStorage.ts`: AsyncStorage persistence (versioned)
- Local changes are stored separately as `meta` (completion overrides and deleted ids) and re-applied on every refresh.

## Limitations
- JSONPlaceholder does not store writes, and every new todo gets the same id. Local tasks use their own ids.
- Offline tasks are not sent to the server later (full sync is out of scope). A next step is to retry
  tasks marked `pendingSync` when the connection returns.
- Search and filters work on tasks already loaded on the device.