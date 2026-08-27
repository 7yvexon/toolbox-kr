export const readLimitedBody = async (request: Request, maxBytes: number) => {
  const contentLength = request.headers.get('content-length')
  if (contentLength !== null) {
    const declaredLength = Number(contentLength)
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0 || declaredLength > maxBytes) return null
  }

  const reader = request.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > maxBytes) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
  } catch {
    return null
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

export const isFreshTimestamp = (value: string, maxAgeSeconds = 300, now = Date.now()) => {
  if (!/^\d+$/.test(value)) return false
  const timestamp = Number(value)
  if (!Number.isSafeInteger(timestamp)) return false
  return Math.abs(Math.floor(now / 1_000) - timestamp) <= maxAgeSeconds
}
