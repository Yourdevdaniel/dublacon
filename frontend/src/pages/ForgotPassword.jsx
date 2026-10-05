import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api.js'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [aviso, setAviso] = useState('')

  async function enviar(e) {
    e.preventDefault()
    const resp = await apiFetch('/api/auth/senha/esqueci/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
    setAviso(resp.detail)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Esqueci minha senha</h1>
        {aviso ? (
          <p className="welcome-intro">{aviso} 📮</p>
        ) : (
          <form onSubmit={enviar}>
            <label>
              Email da conta
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <button type="submit">Enviar link de redefinição</button>
          </form>
        )}
        <p className="switch">
          Lembrou? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
