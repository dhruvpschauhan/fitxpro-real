import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api/client'

// Decode JWT payload without a library (base64 decode middle segment)
function decodeJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return {}
  }
}

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      login: async (username, password) => {
        const formData = new URLSearchParams()
        formData.append('username', username)
        formData.append('password', password)

        const response = await api.post('/auth/login', formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })

        const token = response.data.access_token
        const payload = decodeJwt(token)

        set({
          accessToken: token,
          user: { username: payload.sub, role: payload.role },
          isAuthenticated: true
        })

        return payload.role   // return role so caller can redirect
      },

      logout: () => {
        set({ user: null, accessToken: null, isAuthenticated: false })
      }
    }),
    { name: 'auth-storage' }
  )
)

export default useAuthStore
