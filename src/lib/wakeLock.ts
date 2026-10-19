import { useEffect } from 'react'

/**
 * Bildschirm während des Workouts anlassen: Screen Wake Lock API (iOS ≥ 16.4).
 * Fallback: ein stummes, endlos laufendes Video hält ältere iOS-Versionen wach.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    let lock: WakeLockSentinel | null = null
    let video: HTMLVideoElement | null = null
    let cancelled = false

    const request = async () => {
      try {
        if ('wakeLock' in navigator) {
          lock = await navigator.wakeLock.request('screen')
          return
        }
      } catch {
        /* weiter mit Fallback */
      }
      if (!video) {
        video = document.createElement('video')
        video.setAttribute('playsinline', '')
        video.setAttribute('muted', '')
        video.muted = true
        video.loop = true
        video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none'
        // winziges leeres MP4 (Base64) – reicht, damit iOS den Bildschirm nicht abschaltet
        video.src = 'data:video/mp4;base64,AAAAHGZ0eXBpc29tAAACAGlzb21pc28ybXA0MQAAAAhmcmVlAAAAG21kYXQAAAGzABAHAAABthBgUYI9t+8AAAMNbW9vdgAAAGxtdmhkAAAAAMXMvvrFzL76AAAD6AAAACoAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAACGHRyYWsAAABcdGtoZAAAAAfFzL76xcy++gAAAAEAAAAAAAAAKgAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAIAAAACAAAAAAAG9tZGlhAAAAIG1kaGQAAAAAxcy++sXMvvoAAAAYAAAAAVXEAAAAAAAtaGRscgAAAAAAAAAAdmlkZQAAAAAAAAAAAAAAAFZpZGVvSGFuZGxlcgAAAAFsbWluZgAAABR2bWhkAAAAAQAAAAAAAAAAAAAAJGRpbmYAAAAcZHJlZgAAAAAAAAABAAAADHVybCAAAAABAAABLHN0YmwAAACwc3RzZAAAAAAAAAABAAAAoG1wNHYAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAIAAgAEgAAABIAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY//8AAABKZXNkcwAAAAADPAABAAQ0IBEAAAAAAMNQAADDUAU1AAABsAEAAAG1iRMAAAEAAAABIADEjYgAzQAQSEQUYwAAAbJMYXZjNTMuMzUuMAYBAgAAABhzdHRzAAAAAAAAAAEAAAABAAAAGAAAABxzdHNjAAAAAAAAAAEAAAABAAAAAQAAAAEAAAAUc3RzegAAAAAAAAASAAAAAQAAABRzdGNvAAAAAAAAAAEAAAAsAAAAYHVkdGEAAABYbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAbWRpcmFwcGwAAAAAAAAAAAAAAAAraWxzdAAAACOpdG9vAAAAG2RhdGEAAAABAAAAAExhdmY1My4yMS4x'
        document.body.appendChild(video)
      }
      video.play().catch(() => {})
    }

    const onVisible = () => {
      if (!cancelled && document.visibilityState === 'visible') void request()
    }
    void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
      if (video) {
        video.pause()
        video.remove()
      }
    }
  }, [active])
}
