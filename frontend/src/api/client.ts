import axios, { AxiosHeaders } from 'axios'

import { getCookie } from '../utils/cookies'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase()
  const shouldAttachToken = method && ['post', 'put', 'patch', 'delete'].includes(method)

  if (shouldAttachToken) {
    const csrfToken = getCookie('csrfToken')
    if (csrfToken) {
      if (config.headers instanceof AxiosHeaders) {
        config.headers.set('x-csrf-token', csrfToken)
      } else {
        config.headers = { ...(config.headers ?? {}), 'x-csrf-token': csrfToken }
      }
    }
  }

  return config
})

export { apiClient }
