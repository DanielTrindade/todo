import { apiClient } from './client'

type ApiError = { error: string }

export type User = {
  id: string
  username: string
  email: string
  createdAt: string
  updatedAt: string
}

export type LoginPayload = {
  email: string
  password: string
}

export type RegisterPayload = {
  username: string
  email: string
  password: string
}

export const login = async (payload: LoginPayload): Promise<User> => {
  const { data } = await apiClient.post<User | ApiError>('/login', payload)
  if ('error' in data) {
    throw new Error(data.error)
  }
  return data
}

export const register = async (payload: RegisterPayload): Promise<User> => {
  const { data } = await apiClient.post<User | ApiError>('/register', payload)
  if ('error' in data) {
    throw new Error(data.error)
  }
  return data
}

export const logout = async (): Promise<void> => {
  await apiClient.post('/logout')
}
