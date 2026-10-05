import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

const CAMPOS_INICIAIS = { nome: '', email: '', cpf: '', telefone: '', password: '' }

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [campos, setCampos] = useState(CAMPOS_INICIAIS)
  const [foto, setFoto] = useState(null)
  const [erro, setErro] = useState('')

  function set(campo) {
    return (e) => setCampos((c) => ({ ...c, [campo]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    try {
      await register({ ...campos, foto })
      navigate('/bem-vindo')
    } catch (err) {
      setErro(err.message)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Criar conta</h1>
        <form onSubmit={handleSubmit}>
          <label>
            Nome
            <input value={campos.nome} onChange={set('nome')} required />
          </label>
          <label>
            Email
            <input type="email" value={campos.email} onChange={set('email')} required />
          </label>
          <label>
            CPF
            <input value={campos.cpf} onChange={set('cpf')} placeholder="000.000.000-00" required />
          </label>
          <label>
            Telefone (opcional)
            <input value={campos.telefone} onChange={set('telefone')} />
          </label>
          <label>
            Foto 3x4 (opcional)
            <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files[0])} />
          </label>
          <label>
            Senha
            <input type="password" value={campos.password} onChange={set('password')} required />
          </label>
          {erro && <p role="alert">{erro}</p>}
          <button type="submit">Cadastrar</button>
        </form>
        <p className="switch">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
