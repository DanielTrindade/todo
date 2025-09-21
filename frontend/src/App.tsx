import { Navigate, Route, Routes } from 'react-router-dom'
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { TodosPage } from './pages/TodosPage'
import { AuthenticatedRoute } from './components/AuthenticatedRoute'

const App = () => {
  const isAuthenticated = useIsAuthenticated()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <AuthenticatedRoute>
            <TodosPage />
          </AuthenticatedRoute>
        }
      />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
    </Routes>
  )
}

export default App
