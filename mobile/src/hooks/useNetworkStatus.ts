import NetInfo from '@react-native-community/netinfo'
import { useEffect, useState } from 'react'

/** true when the device can reach the internet. Updates live when the connection changes. */
export function useNetworkStatus() {
  const [online, setOnline] = useState(true)
  useEffect(() => {
    // addEventListener returns an "unsubscribe" function, which React runs on cleanup
    return NetInfo.addEventListener((s) => {
      setOnline(s.isConnected !== false && s.isInternetReachable !== false)
    })
  }, [])
  return online
}