import { useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FilterTabs, type Filter } from '../components/FilterTabs'
import { OfflineBanner } from '../components/OfflineBanner'
import { TaskForm } from '../components/TaskForm'
import { TaskItem } from '../components/TaskItem'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { useTasks } from '../hooks/useTasks'

export function TasksScreen() {
  const online = useNetworkStatus()
  const t = useTasks(online)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')

  // search + filter run on the device, over everything we have loaded (works offline too)
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return t.tasks.filter((x) => {
      if (filter === 'active' && x.completed) return false
      if (filter === 'completed' && !x.completed) return false
      return !q || x.title.toLowerCase().includes(q)
    })
  }, [t.tasks, filter, search])

  const emptyMessage =
    t.tasks.length === 0
      ? online
        ? 'No tasks yet. Add one above.'
        : "No tasks saved yet. You're offline, so add one above or reconnect to load tasks."
      : 'No tasks match your search or filter.'

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <OfflineBanner online={online} />
      <Text style={styles.heading}>My tasks</Text>

      {t.error && (
        <View style={styles.errorBox} accessibilityRole="alert">
          <Text style={styles.errorText}>{t.error}</Text>
          <View style={styles.errorActions}>
            <Pressable onPress={t.refresh}>
              <Text style={styles.retry}>Retry</Text>
            </Pressable>
            <Pressable onPress={t.clearError}>
              <Text style={styles.dismiss}>Dismiss</Text>
            </Pressable>
          </View>
        </View>
      )}

      <TaskForm adding={t.adding} onAdd={t.addTask} />

      <TextInput
        style={styles.search}
        placeholder="Search tasks…"
        value={search}
        onChangeText={setSearch}
        clearButtonMode="while-editing"
        accessibilityLabel="Search tasks"
      />
      <FilterTabs value={filter} onChange={setFilter} />

      {t.loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.muted}>Loading tasks…</Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(x) => x.id}
          renderItem={({ item }) => <TaskItem task={item} onToggle={t.toggleTask} onDelete={t.deleteTask} />}
          refreshing={t.refreshing}
          onRefresh={t.refresh}
          onEndReached={t.loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={t.loadingMore ? <ActivityIndicator style={styles.footer} color="#2563eb" /> : undefined}
          ListEmptyComponent={<Text style={[styles.muted, styles.empty]}>{emptyMessage}</Text>}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={visible.length === 0 ? styles.emptyContainer : undefined}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  heading: { fontSize: 24, fontWeight: '700', color: '#0f172a', paddingHorizontal: 16, paddingVertical: 12 },
  search: { marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  muted: { color: '#64748b' },
  empty: { textAlign: 'center', paddingHorizontal: 24 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  footer: { paddingVertical: 16 },
  errorBox: { marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  errorText: { color: '#991b1b' },
  errorActions: { flexDirection: 'row', gap: 16, marginTop: 6 },
  retry: { color: '#2563eb', fontWeight: '600' },
  dismiss: { color: '#64748b' },
})