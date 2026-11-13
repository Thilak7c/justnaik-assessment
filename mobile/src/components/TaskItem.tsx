import { memo } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import type { Task } from '../types'

interface Props {
  task: Task
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

// memo: a row only re-renders when its own task changes, which keeps long lists smooth
export const TaskItem = memo(function TaskItem({ task, onToggle, onDelete }: Props) {
  const confirmDelete = () =>
    Alert.alert('Delete task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(task.id) },
    ])

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onToggle(task.id)}
        style={styles.main}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
        accessibilityLabel={task.title}
      >
        <View style={[styles.box, task.completed && styles.boxChecked]}>
          {task.completed && <Text style={styles.tick}>✓</Text>}
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, task.completed && styles.done]}>{task.title}</Text>
          {task.isLocal && (
            <Text style={styles.badge}>{task.pendingSync ? 'Offline (not sent)' : 'Added on this device'}</Text>
          )}
        </View>
      </Pressable>
      <Pressable onPress={confirmDelete} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${task.title}`}>
        <Text style={styles.delete}>Delete</Text>
      </Pressable>
    </View>
  )
})

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0' },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#94a3b8', alignItems: 'center', justifyContent: 'center' },
  boxChecked: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  tick: { color: '#fff', fontWeight: '700' },
  textWrap: { flex: 1 },
  title: { fontSize: 16, color: '#0f172a' },
  done: { textDecorationLine: 'line-through', color: '#94a3b8' },
  badge: { marginTop: 2, fontSize: 11, color: '#b45309', fontWeight: '600' },
  delete: { color: '#dc2626', fontWeight: '500', marginLeft: 12 },
})