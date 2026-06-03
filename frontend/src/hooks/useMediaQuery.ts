"use client"

import { useCallback, useSyncExternalStore } from "react"

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const media = window.matchMedia(query)
      if (media.addEventListener) {
        media.addEventListener("change", callback)
        return () => media.removeEventListener("change", callback)
      }
      // Fallback for Safari/iOS <=13
      media.addListener(callback)
      return () => media.removeListener(callback)
    },
    [query]
  )

  const getSnapshot = () => window.matchMedia(query).matches

  const getServerSnapshot = () => false

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
