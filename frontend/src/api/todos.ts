import { apiClient } from './client'

type ApiError = { error: string }

export type Priority = 'low' | 'medium' | 'high'

export type Todo = {
  id: string
  description: string
  priority: Priority
  done: boolean
  createdAt: string
  updatedAt: string
}

export type CreateTodoPayload = {
  description: string
  priority?: Priority
}

export type UpdateTodoPayload = Partial<Omit<CreateTodoPayload, 'priority'>> & {
  priority?: Priority
  done?: boolean
}

export const fetchTodos = async (): Promise<Todo[]> => {
  const { data } = await apiClient.get<Todo[] | ApiError>('/todos')
  if (Array.isArray(data)) {
    return data
  }
  throw new Error(data.error ?? 'Erro ao carregar todos')
}

export const createTodo = async (payload: CreateTodoPayload): Promise<Todo> => {
  const { data } = await apiClient.post<Todo | ApiError>('/todos', payload)
  if ('error' in data) {
    throw new Error(data.error)
  }
  return data
}

export const updateTodo = async (
  id: string,
  payload: UpdateTodoPayload,
): Promise<Todo> => {
  const { data } = await apiClient.put<Todo | ApiError>('/todos/' + id, payload)
  if ('error' in data) {
    throw new Error(data.error)
  }
  return data
}

export const deleteTodo = async (id: string): Promise<void> => {
  const { data } = await apiClient.delete<{ message?: string } | ApiError>('/todos/' + id)
  if ('error' in data) {
    throw new Error(data.error)
  }
}
