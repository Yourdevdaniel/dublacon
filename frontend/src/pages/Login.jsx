import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setErro(err.message)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Entrar</h1>
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Senha
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {erro && <p role="alert">{erro}</p>}
          <button type="submit">Entrar</button>
        </form>
        <p className="switch">
          Não tem conta? <Link to="/registro">Cadastre-se</Link>
          <br />
          <Link to="/esqueci-senha">Esqueci minha senha</Link>
        </p>
      </div>
    </div>
  )
}
