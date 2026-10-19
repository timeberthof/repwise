import { useEffect, useState } from 'react'

/** Blob oder Bilddaten → temporäre URL (wird beim Entfernen wieder freigegeben). */
export function useObjectUrl(src: Blob | ArrayBuffer | undefined | null, mime = 'image/jpeg'): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!src) return setUrl(undefined)
    const blob = src instanceof Blob ? src : new Blob([src], { type: mime })
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [src, mime])
  return url
}
