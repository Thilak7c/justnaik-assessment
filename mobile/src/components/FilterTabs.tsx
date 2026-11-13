import { Pressable, StyleSheet, Text, View } from 'react-native'

export type Filter = 'all' | 'active' | 'completed'
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
]

export function FilterTabs({ value, onChange }: { value: Filter; onChange: (f: Filter) => void }) {
  return (
    <View style={styles.row}>
      {FILTERS.map((f) => {
        const selected = f.key === value
        return (
          <Pressable
            key={f.key}
            onPress={() => onChange(f.key)}
            style={[styles.tab, selected && styles.tabSelected]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{f.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  tab: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#e2e8f0' },
  tabSelected: { backgroundColor: '#2563eb' },
  label: { color: '#334155', fontWeight: '500' },
  labelSelected: { color: '#fff' },
})