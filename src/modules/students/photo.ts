/**
 * Bounded photo handling (T-042, D-043 C1). A large upload is resized and JPEG-compressed in the
 * browser so the database and every backup stay small. Runs only in a real browser.
 */
const MAX_EDGE = 160
const QUALITY = 0.7

export async function compressPhoto(file: File): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2D canvas is unavailable')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('image encoding failed'))),
      'image/jpeg',
      QUALITY,
    )
  })
  return new Uint8Array(await blob.arrayBuffer())
}

export function photoDataUrl(bytes: Uint8Array | null | undefined): string | null {
  if (!bytes || bytes.length === 0) return null
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:image/jpeg;base64,${btoa(binary)}`
}
