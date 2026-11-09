/**
 * Gewählte Datei aus einem <input type="file"> übernehmen: Inhalt sofort in den Speicher lesen, danach das Feld
 * leeren (damit dieselbe Datei erneut gewählt werden kann). Ohne die Kopie ist die Datei in WebKit nach dem Leeren
 * teilweise nicht mehr lesbar („NotFoundError“).
 */
export async function takePickedFile(input: HTMLInputElement): Promise<File | null> {
  const f = input.files?.[0]
  if (!f) return null
  try {
    return new File([await f.arrayBuffer()], f.name, { type: f.type, lastModified: f.lastModified })
  } finally {
    input.value = ''
  }
}
