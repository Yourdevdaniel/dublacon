import { createContext, useContext, useEffect, useState } from 'react'
import { apiFetch } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      setLoading(false)
      return
    }
    apiFetch('/api/auth/me/')
      .then(setUser)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const form = new URLSearchParams({ username: email, password })
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    })
    if (!response.ok) throw new Error('Email ou senha invalidos.')
    const { token } = await response.json()
    localStorage.setItem('token', token)
    const me = await apiFetch('/api/auth/me/')
    setUser(me)
    return me
  }

  async function register(data) {
    const form = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (value) form.append(key, value)
    })
    await apiFetch('/api/auth/register/', { method: 'POST', body: form })
    await login(data.email, data.password)
  }

  function logout() {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
