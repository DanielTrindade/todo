type BufferLike = {
  from: (input: string, encoding?: string) => { toString: (encoding: string) => string }
}

const base64UrlEncode = (value: string) => {
  if (typeof btoa === 'function') {
    return btoa(value)
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
  }

  const buffer = (globalThis as typeof globalThis & { Buffer?: BufferLike }).Buffer
  if (buffer) {
    return buffer
      .from(value, 'utf8')
      .toString('base64')
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
  }

  throw new Error('Base64 encoding is not supported in this environment')
}

export const createSessionToken = (ttlSeconds = 60 * 60 * 24) => {
  const header = base64UrlEncode(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const payload = base64UrlEncode(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + ttlSeconds }),
  )

  return `${header}.${payload}.`
}
