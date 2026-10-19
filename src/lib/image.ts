/**
 * Bild verkleinern und als JPEG komprimieren (für Fortschrittsfotos).
 * Moderne Safari-Versionen drehen Fotos beim Zeichnen bereits richtig (EXIF-Ausrichtung).
 */
export async function compressImage(file: Blob, maxSize: number, quality: number): Promise<{ blob: Blob; width: number; height: number }> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight))
    const width = Math.round(img.naturalWidth * scale)
    const height = Math.round(img.naturalHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas nicht verfügbar')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, width, height)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Komprimieren fehlgeschlagen'))), 'image/jpeg', quality))
    return { blob, width, height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Foto (max. 1600 px, ~80 %) und Vorschaubild (360 px) als ArrayBuffer zum Speichern. */
export async function preparePhoto(file: Blob) {
  const full = await compressImage(file, 1600, 0.8)
  const thumb = await compressImage(full.blob, 360, 0.7)
  return { data: await full.blob.arrayBuffer(), thumbData: await thumb.blob.arrayBuffer(), mime: 'image/jpeg', width: full.width, height: full.height }
}
