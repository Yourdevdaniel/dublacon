import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { apiFetch } from '../api.js'

export default function Welcome() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [roles, setRoles] = useState([])
  const [escolhidos, setEscolhidos] = useState([])
  const [bio, setBio] = useState(user.bio || '')
  const [foto, setFoto] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    apiFetch('/api/roles/').then(setRoles)
  }, [])

  function alternar(roleId) {
    setEscolhidos((atual) =>
      atual.includes(roleId) ? atual.filter((id) => id !== roleId) : [...atual, roleId]
    )
  }

  async function comecar(e) {
    e.preventDefault()
    setErro('')
    try {
      const form = new FormData()
      escolhidos.forEach((id) => form.append('role_ids', id))
      form.append('bio', bio)
      if (foto) form.append('foto', foto)
      const atualizado = await apiFetch('/api/auth/me/', { method: 'PATCH', body: form })
      setUser(atualizado)
      navigate('/')
    } catch (err) {
      setErro(err.message)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <h1>Boas-vindas, {user.nome.split(' ')[0]}! 🎬</h1>
        <p className="welcome-intro">
          Conta pra comunidade o que você faz — assim os projetos certos te encontram.
        </p>

        <form onSubmit={comecar}>
          <span className="welcome-label">O que você faz (ou quer aprender)?</span>
          <div className="role-chips">
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                className={`role-chip ${escolhidos.includes(role.id) ? 'is-active' : ''}`}
                onClick={() => alternar(role.id)}
              >
                {role.nome}
              </button>
            ))}
          </div>

          <label>
            Uma bio curtinha (opcional)
            <textarea
              placeholder="Ex: Dublo por hobby há 2 anos, apaixonado por animes de fantasia."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
            />
          </label>

          {!user.foto && (
            <label>
              Foto de perfil (opcional)
              <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files[0])} />
            </label>
          )}

          {erro && <p role="alert">{erro}</p>}
          <button type="submit">Começar a explorar</button>
        </form>
        <p className="switch">
          <Link to="/">Pular por enquanto</Link>
        </p>
      </div>
    </div>
  )
}
