import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { login, type LoginPayload, type User } from '../api/auth'
import useSignIn from 'react-auth-kit/hooks/useSignIn'
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated'
import { createSessionToken } from '../utils/create-session-token'

export const LoginPage = () => {
  const [form, setForm] = useState<LoginPayload>({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const signIn = useSignIn<User>()
  const isAuthenticated = useIsAuthenticated()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const mutation = useMutation<User, Error, LoginPayload>({
    mutationFn: login,
    onSuccess: (user) => {
      const success = signIn({
        auth: {
          token: createSessionToken(),
          type: 'Bearer',
        },
        userState: user,
      })

      if (!success) {
        setError('Não foi possível iniciar a sessão. Tente novamente.')
        return
      }

      const redirectTo = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'
      navigate(redirectTo, { replace: true })
    },
    onError: (err) => {
      setError(err.message || 'Falha ao entrar. Verifique suas credenciais.')
    },
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    mutation.mutate(form)
  }

  const updateField = (key: keyof LoginPayload) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }))
    }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl">
        <h1 className="mb-6 text-2xl font-semibold text-slate-50">Bem-vindo de volta</h1>
        <p className="mb-8 text-sm text-slate-400">
          Acesse sua conta para gerenciar seus todos com rapidez.
        </p>
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm text-slate-300">
            Email
            <input
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-base text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
              type="email"
              value={form.email}
              onChange={updateField('email')}
              placeholder="voce@email.com"
              required
              autoComplete="email"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Senha
            <input
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-base text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
              type="password"
              value={form.password}
              onChange={updateField('password')}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </label>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex w-full items-center justify-center rounded-lg bg-sky-500 px-3 py-2 text-base font-semibold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {mutation.isPending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">
          Não tem uma conta?{' '}
          <Link to="/register" className="font-medium text-sky-400 hover:text-sky-300">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  )
}
