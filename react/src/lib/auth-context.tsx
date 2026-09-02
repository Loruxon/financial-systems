import { createContext, useContext } from 'react'

interface AuthContextValue {
  isAdmin: boolean
  userName: string | null
  userEmail: string | null
  percentClient: string | null
}

export const AuthContext = createContext<AuthContextValue>({ isAdmin: false, userName: null, userEmail: null, percentClient: null })
export const useAuth = () => useContext(AuthContext)
