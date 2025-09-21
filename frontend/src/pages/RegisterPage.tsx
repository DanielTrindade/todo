import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { register, type RegisterPayload, type User } from '../api/auth'
import useSignIn from 'react-auth-kit/hooks/useSignIn'
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated'
import { createSessionToken } from '../utils/create-session-token'

export const RegisterPage = () => {
  const [form, setForm] = useState<RegisterPayload>({
    username: '',
    email: '',
    password: '',
  })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const signIn = useSignIn<User>()
  const isAuthenticated = useIsAuthenticated()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const mutation = useMutation<User, Error, RegisterPayload>({
    mutationFn: register,
    onSuccess: (user) => {
      const success = signIn({
        auth: {
          token: createSessionToken(),
          type: 'Bearer',
        },
        userState: user,
      })

      if (!success) {
        setError('Não foi possível concluir o cadastro. Tente novamente.')
        return
      }

      navigate('/', { replace: true })
    },
    onError: (err) => {
      setError(err.message || 'Falha ao cadastrar. Tente novamente.')
    },
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (form.password !== confirmPassword) {
      setError('As senhas não conferem.')
      return
    }

    mutation.mutate(form)
  }

  const updateField = (key: keyof RegisterPayload) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }))
    }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl">
        <h1 className="mb-6 text-2xl font-semibold text-slate-50">Crie sua conta</h1>
        <p className="mb-8 text-sm text-slate-400">
          Cadastre-se em poucos segundos e organize tudo o que precisa fazer.
        </p>
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm text-slate-300">
            Nome de usuário
            <input
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-base text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
              type="text"
              value={form.username}
              onChange={updateField('username')}
              placeholder="Seu nome"
              required
              minLength={3}
            />
          </label>
          <label className="block text-sm text-slate-300">
            Email
            <input
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-base text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
              type="email"
              value={form.email}
              onChange={updateField('email')}
              placeholder="voce@email.com"
              required
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
              minLength={6}
              required
            />
          </label>
          <label className="block text-sm text-slate-300">
            Confirme a senha
            <input
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-base text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </label>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex w-full items-center justify-center rounded-lg bg-emerald-500 px-3 py-2 text-base font-semibold text-white transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {mutation.isPending ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">
          Já possui cadastro?{' '}
          <Link to="/login" className="font-medium text-sky-400 hover:text-sky-300">
            Faça login
          </Link>
        </p>
      </div>
    </div>
  )
}
