export const getCookie = (name: string): string | undefined => {
  if (typeof document === 'undefined' || !document.cookie) {
    return undefined
  }

  const cookies = document.cookie.split('; ')

  for (const cookie of cookies) {
    const [cookieName, ...valueParts] = cookie.split('=')
    if (decodeURIComponent(cookieName) === name) {
      return decodeURIComponent(valueParts.join('='))
    }
  }

  return undefined
}

export const getCsrfToken = (): string | undefined => getCookie('csrfToken')
