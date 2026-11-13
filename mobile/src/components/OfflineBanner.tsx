import { StyleSheet, Text, View } from 'react-native'

export function OfflineBanner({ online }: { online: boolean }) {
  if (online) return null
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.text}>You're offline. You can still add, complete and delete tasks.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: { backgroundColor: '#92400e', paddingVertical: 8, paddingHorizontal: 16 },
  text: { color: '#fff', fontSize: 13, textAlign: 'center' },
})