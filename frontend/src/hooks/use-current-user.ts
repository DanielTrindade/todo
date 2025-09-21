import useAuthUser from 'react-auth-kit/hooks/useAuthUser'
import type { User } from '../api/auth'

export const useCurrentUser = () => {
  return useAuthUser<User | null>()
}
