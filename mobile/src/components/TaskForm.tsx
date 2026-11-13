import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

interface Props {
  adding: boolean
  onAdd: (title: string) => Promise<void>
}

export function TaskForm({ adding, onAdd }: Props) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (adding) return // no double submission
    if (!text.trim()) {
      setError('Please enter a task title.')
      return
    }
    setError(null)
    try {
      await onAdd(text)
      setText('') // clear only after success
    } catch (e) {
      // keep what the user typed and explain what went wrong
      setError((e as Error).message)
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          placeholder="Add a new task…"
          value={text}
          onChangeText={(t) => {
            setText(t)
            if (error) setError(null)
          }}
          editable={!adding}
          onSubmitEditing={submit}
          returnKeyType="done"
          maxLength={200}
          accessibilityLabel="New task title"
        />
        <Pressable
          onPress={submit}
          disabled={adding}
          style={[styles.button, adding && styles.buttonDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Add task"
        >
          {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Add</Text>}
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  inputError: { borderColor: '#dc2626' },
  button: { backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 18, justifyContent: 'center', minWidth: 64, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#93c5fd' },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#dc2626', fontSize: 12, marginTop: 4 },
})