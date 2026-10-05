import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../api.js'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')

  async function redefinir(e) {
    e.preventDefault()
    setErro('')
    try {
      await apiFetch('/api/auth/senha/redefinir/', {
        method: 'POST',
        body: JSON.stringify({
          uid: params.get('uid'),
          token: params.get('token'),
          password,
        }),
      })
      navigate('/login')
    } catch (err) {
      setErro(err.message)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Nova senha</h1>
        <form onSubmit={redefinir}>
          <label>
            Nova senha
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {erro && <p role="alert">{erro}</p>}
          <button type="submit">Redefinir senha</button>
        </form>
        <p className="switch">
          <Link to="/esqueci-senha">Pedir um novo link</Link>
        </p>
      </div>
    </div>
  )
}
