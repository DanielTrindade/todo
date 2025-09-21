import { ReactNode } from 'react'
import AuthProvider from 'react-auth-kit'
import createStore from 'react-auth-kit/store/createAuthStore';

const store = createStore('cookie',{
  authName:'_auth',
  cookieDomain: window.location.hostname,
  cookieSecure: window.location.protocol === 'https:',
  cookieSameSite: 'lax',
  debug: true
})

export const AppAuthProvider = ({ children }: { children: ReactNode }) => {
  return <AuthProvider store={store}>{children}</AuthProvider>
}