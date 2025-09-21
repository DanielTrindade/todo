import { FormEvent, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTodo, deleteTodo, fetchTodos, updateTodo, type Priority, type Todo } from '../api/todos'
import { logout } from '../api/auth'
import useSignOut from 'react-auth-kit/hooks/useSignOut'
import { useCurrentUser } from '../hooks/use-current-user'
import clsx from 'clsx'

const priorityOptions: Array<{ label: string; value: Priority }> = [
  { label: 'Alta', value: 'high' },
  { label: 'Média', value: 'medium' },
  { label: 'Baixa', value: 'low' },
]

type UpdateMutationVariables = {
  id: string
  data: { done?: boolean; priority?: Priority }
}

type TodosContext = { previous?: Todo[] }

export const TodosPage = () => {
  const queryClient = useQueryClient()
  const [newTodo, setNewTodo] = useState<{ description: string; priority: Priority }>(
    () => ({ description: '', priority: 'medium' }),
  )
  const [feedback, setFeedback] = useState<string | null>(null)
  const user = useCurrentUser()
  const signOut = useSignOut()
  const navigate = useNavigate()

  const todosQuery = useQuery<Todo[], Error>({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  })

  const createMutation = useMutation<Todo, Error, { description: string; priority: Priority }>({
    mutationFn: ({ description, priority }) => createTodo({ description, priority }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
      setNewTodo({ description: '', priority: 'medium' })
      setFeedback('Tarefa criada com sucesso.')
    },
    onError: (err) => {
      setFeedback(err.message || 'Não foi possível criar a tarefa.')
    },
  })

  const updateMutation = useMutation<Todo, Error, UpdateMutationVariables, TodosContext>({
    mutationFn: ({ id, data }) => updateTodo(id, data),
    onMutate: async ({ id, data }) => {
      setFeedback(null)
      await queryClient.cancelQueries({ queryKey: ['todos'] })
      const previous = queryClient.getQueryData<Todo[]>(['todos'])
      if (previous) {
        const optimistic = previous.map((todo) =>
          todo.id === id ? { ...todo, ...data, updatedAt: new Date().toISOString() } : todo,
        )
        queryClient.setQueryData(['todos'], optimistic)
      }
      return { previous }
    },
    onError: (err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['todos'], context.previous)
      }
      setFeedback(err.message || 'Não foi possível atualizar a tarefa.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })

  const deleteMutation = useMutation<void, Error, string, TodosContext>({
    mutationFn: (id) => deleteTodo(id),
    onMutate: async (id) => {
      setFeedback(null)
      await queryClient.cancelQueries({ queryKey: ['todos'] })
      const previous = queryClient.getQueryData<Todo[]>(['todos'])
      if (previous) {
        queryClient.setQueryData(
          ['todos'],
          previous.filter((todo) => todo.id !== id),
        )
      }
      return { previous }
    },
    onError: (err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['todos'], context.previous)
      }
      setFeedback(err.message || 'Não foi possível remover a tarefa.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })

  const handleCreateTodo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newTodo.description.trim()) {
      setFeedback('Descreva a tarefa antes de salvar.')
      return
    }
    createMutation.mutate({
      description: newTodo.description.trim(),
      priority: newTodo.priority,
    })
  }

  const handleToggleDone = (todo: Todo) => {
    updateMutation.mutate({ id: todo.id, data: { done: !todo.done } })
  }

  const handlePriorityChange = (todo: Todo, priority: Priority) => {
    if (todo.priority === priority) {
      return
    }
    updateMutation.mutate({ id: todo.id, data: { priority } })
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Erro ao fazer logout', error)
    }
    signOut()
    navigate('/login', { replace: true })
  }

  const orderedTodos = useMemo(() => {
    if (!todosQuery.data) {
      return []
    }
    const priorityWeight: Record<Priority, number> = {
      high: 0,
      medium: 1,
      low: 2,
    }
    return [...todosQuery.data].sort((a, b) => {
      if (a.done !== b.done) {
        return a.done ? 1 : -1
      }
      const priorityDiff = priorityWeight[a.priority] - priorityWeight[b.priority]
      if (priorityDiff !== 0) {
        return priorityDiff
      }
      return a.description.localeCompare(b.description)
    })
  }, [todosQuery.data])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm text-slate-400">{user ? `Olá, ${user.username}` : 'Olá!'}</p>
            <h1 className="text-2xl font-semibold text-slate-50">Seus todos</h1>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
          <h2 className="text-lg font-medium text-slate-100">Adicionar nova tarefa</h2>
          <form className="mt-4 flex flex-col gap-3 md:flex-row" onSubmit={handleCreateTodo}>
            <input
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
              type="text"
              value={newTodo.description}
              onChange={(event) =>
                setNewTodo((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="O que você precisa fazer?"
              maxLength={255}
            />
            <select
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
              value={newTodo.priority}
              onChange={(event) =>
                setNewTodo((prev) => ({ ...prev, priority: event.target.value as Priority }))
              }
            >
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {createMutation.isPending ? 'Salvando...' : 'Adicionar'}
            </button>
          </form>
          {feedback && (
            <p className="mt-3 text-sm text-slate-300">{feedback}</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-100">Lista de tarefas</h2>
            {todosQuery.isFetching && <span className="text-xs text-slate-400">Atualizando…</span>}
          </div>

          {todosQuery.isLoading ? (
            <p className="text-sm text-slate-400">Carregando tarefas...</p>
          ) : todosQuery.isError ? (
            <p className="text-sm text-red-300">
              {todosQuery.error?.message ?? 'Não foi possível carregar os todos.'}
            </p>
          ) : orderedTodos.length === 0 ? (
            <p className="text-sm text-slate-400">
              Nenhuma tarefa por aqui. Que tal criar uma agora mesmo?
            </p>
          ) : (
            <ul className="space-y-3">
              {orderedTodos.map((todo) => (
                <li
                  key={todo.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-600 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleDone(todo)}
                      className={clsx(
                        'mt-1 h-5 w-5 flex-shrink-0 rounded-full border-2 transition',
                        todo.done
                          ? 'border-emerald-400 bg-emerald-500/20'
                          : 'border-slate-600 hover:border-slate-400',
                      )}
                      aria-label={todo.done ? 'Marcar como pendente' : 'Marcar como concluída'}
                    >
                      {todo.done && <span className="block h-full w-full rounded-full bg-emerald-400" />}
                    </button>
                    <div>
                      <p
                        className={clsx(
                          'text-base font-medium',
                          todo.done ? 'text-slate-500 line-through' : 'text-slate-100',
                        )}
                      >
                        {todo.description}
                      </p>
                      <p className="text-xs text-slate-500">
                        Atualizado em {new Date(todo.updatedAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 outline-none transition focus:border-sky-500"
                      value={todo.priority}
                      onChange={(event) => handlePriorityChange(todo, event.target.value as Priority)}
                    >
                      {priorityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleDelete(todo.id)}
                      className="rounded-lg border border-red-500/40 px-3 py-1 text-sm font-medium text-red-300 transition hover:border-red-400 hover:text-red-200"
                    >
                      Remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}

export default TodosPage
