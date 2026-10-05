import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { apiFetch } from '../api.js'
import { Verified } from '../components/ui.jsx'

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

const STATUS_PEDIDO = {
  pendente: 'Seu pedido está em análise.',
  recusada: 'Seu último pedido foi recusado. Você pode tentar de novo com mais informações.',
}

function VerificationPanel({ user }) {
  const [pedidos, setPedidos] = useState(null)
  const [tipo, setTipo] = useState('influencer')
  const [drt, setDrt] = useState('')
  const [drtUf, setDrtUf] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [documento, setDocumento] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!user.verified) apiFetch('/api/verificacao/').then(setPedidos)
  }, [user.verified])

  if (user.verified) {
    return (
      <div className="panel">
        <h2>Verificação</h2>
        <p>
          Sua conta é verificada <Verified tipo={user.verified} /> —{' '}
          {user.verified === 'ator' ? 'ator profissional com DRT validado.' : 'influencer reconhecido pela equipe.'}
        </p>
      </div>
    )
  }

  const ultimo = pedidos && pedidos[0]
  const pendente = ultimo && ultimo.status === 'pendente'

  async function pedir(e) {
    e.preventDefault()
    setErro('')
    try {
      const form = new FormData()
      form.append('tipo', tipo)
      form.append('drt_numero', drt)
      form.append('drt_uf', drtUf)
      form.append('justificativa', justificativa)
      if (documento) form.append('documento', documento)
      const novo = await apiFetch('/api/verificacao/', { method: 'POST', body: form })
      setPedidos([novo, ...(pedidos || [])])
    } catch (err) {
      setErro(err.message)
    }
  }

  return (
    <div className="panel">
      <h2>Verificação</h2>
      <p className="subtitle">
        Ator profissional (com DRT) ou influencer? Peça seu selo — a equipe confere manualmente.
      </p>
      {ultimo && STATUS_PEDIDO[ultimo.status] && <p style={{ marginTop: 8 }}>{STATUS_PEDIDO[ultimo.status]}</p>}
      {!pendente && (
        <form onSubmit={pedir} style={{ marginTop: 12 }}>
          <label>
            Tipo de selo
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="influencer">Influencer</option>
              <option value="ator">Ator profissional (DRT)</option>
            </select>
          </label>
          {tipo === 'ator' && (
            <>
              <label>
                Número do DRT
                <input
                  value={drt}
                  onChange={(e) => setDrt(e.target.value)}
                  placeholder="Até 7 dígitos — completamos com zeros"
                  required
                />
              </label>
              <label>
                UF onde o registro foi emitido
                <select value={drtUf} onChange={(e) => setDrtUf(e.target.value)} required>
                  <option value="">Escolha o estado...</option>
                  {UFS.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </label>
              <label>
                Foto do documento DRT
                <input type="file" accept="image/*" onChange={(e) => setDocumento(e.target.files[0])} required />
              </label>
            </>
          )}
          <label>
            {tipo === 'ator' ? 'Algo mais que ajude na análise (opcional)' : 'Por que você deve ser verificado? (links de redes, portfólio...)'}
            <textarea value={justificativa} onChange={(e) => setJustificativa(e.target.value)} rows={2} />
          </label>
          {erro && <p role="alert">{erro}</p>}
          <button type="submit">Pedir verificação</button>
        </form>
      )}
    </div>
  )
}

export default function Settings() {
  const { user, setUser, logout } = useAuth()
  const navigate = useNavigate()
  const [nome, setNome] = useState(user.nome)
  const [telefone, setTelefone] = useState(user.telefone)
  const [bio, setBio] = useState(user.bio)
  const [roles, setRoles] = useState([])
  const [erro, setErro] = useState('')
  const [novoItem, setNovoItem] = useState({ titulo: '', link: '' })
  const [novoArquivo, setNovoArquivo] = useState(null)

  useEffect(() => {
    apiFetch('/api/roles/').then(setRoles)
  }, [])

  async function salvarPerfil(e) {
    e.preventDefault()
    setErro('')
    try {
      const atualizado = await apiFetch('/api/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify({ nome, telefone, bio }),
      })
      setUser(atualizado)
    } catch (err) {
      setErro(err.message)
    }
  }

  async function alternarRole(roleId) {
    const atual = user.roles.map((r) => r.id)
    const novos = atual.includes(roleId) ? atual.filter((id) => id !== roleId) : [...atual, roleId]
    const atualizado = await apiFetch('/api/auth/me/', {
      method: 'PATCH',
      body: JSON.stringify({ role_ids: novos }),
    })
    setUser(atualizado)
  }

  async function trocarFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    const form = new FormData()
    form.append('foto', file)
    try {
      const atualizado = await apiFetch('/api/auth/me/', { method: 'PATCH', body: form })
      setUser(atualizado)
    } catch (err) {
      setErro(err.message)
    }
  }

  async function adicionarPortfolio(e) {
    e.preventDefault()
    setErro('')
    try {
      const form = new FormData()
      form.append('titulo', novoItem.titulo)
      if (novoItem.link) form.append('link', novoItem.link)
      if (novoArquivo) form.append('arquivo', novoArquivo)
      const item = await apiFetch('/api/portfolio/', { method: 'POST', body: form })
      setUser({ ...user, portfolio: [...user.portfolio, item] })
      setNovoItem({ titulo: '', link: '' })
      setNovoArquivo(null)
      e.target.reset()
    } catch (err) {
      setErro(err.message)
    }
  }

  function sair() {
    logout()
    navigate('/login')
  }

  return (
    <section>
      <div className="page-head">
        <h1>Configurações</h1>
      </div>

      <div className="panel">
        <div className="profile-header">
          {user.foto ? (
            <img className="avatar" src={user.foto} alt="Foto de perfil" />
          ) : (
            <span className="avatar">{user.nome[0]}</span>
          )}
          <label>
            Trocar foto (3x4)
            <input type="file" accept="image/*" onChange={trocarFoto} />
          </label>
        </div>

        <h2>Dados da conta</h2>
        <form onSubmit={salvarPerfil}>
          <label>
            Nome
            <input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </label>
          <label>
            Telefone
            <input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </label>
          <label>
            Bio
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
          </label>
          {erro && <p role="alert">{erro}</p>}
          <button type="submit">Salvar</button>
        </form>
      </div>

      <div className="panel">
        <h2>Papéis</h2>
        <p className="subtitle">O que você faz (ou quer aprender a fazer)?</p>
        <div className="role-chips">
          {roles.map((role) => {
            const ativo = user.roles.some((r) => r.id === role.id)
            return (
              <button
                key={role.id}
                type="button"
                className={`role-chip ${ativo ? 'is-active' : ''}`}
                onClick={() => alternarRole(role.id)}
              >
                {role.nome}
              </button>
            )
          })}
        </div>
      </div>

      <div className="panel">
        <h2>Portfólio</h2>
        {user.portfolio.length > 0 && (
          <ul>
            {user.portfolio.map((item) => (
              <li key={item.id} className="list-row">
                <span>{item.titulo}</span>
                <span>
                  {item.link && <a href={item.link} target="_blank" rel="noreferrer">Link ↗</a>}
                  {item.arquivo && <a href={item.arquivo} target="_blank" rel="noreferrer">Arquivo ↗</a>}
                </span>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={adicionarPortfolio}>
          <label>
            Título
            <input value={novoItem.titulo} onChange={(e) => setNovoItem({ ...novoItem, titulo: e.target.value })} required />
          </label>
          <label>
            Link (ex: SoundCloud, YouTube, ArtStation)
            <input value={novoItem.link} onChange={(e) => setNovoItem({ ...novoItem, link: e.target.value })} />
          </label>
          <label>
            Ou um arquivo (áudio ou imagem)
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.webp,.mp3,.wav,.ogg"
              onChange={(e) => setNovoArquivo(e.target.files[0])}
            />
          </label>
          <button type="submit">Adicionar ao portfólio</button>
        </form>
      </div>

      <VerificationPanel user={user} />

      {user.is_staff && (
        <div className="panel">
          <h2>Administração</h2>
          <p className="subtitle">Você é admin do site.</p>
          <p style={{ marginTop: 8 }}>
            <Link to="/avisos">Gerenciar avisos do site →</Link>
          </p>
          <p style={{ marginTop: 8 }}>
            <Link to="/moderacao">Moderação (denúncias e bugs) →</Link>
          </p>
        </div>
      )}

      <div className="settings-footer">
        <button type="button" className="btn-secondary" onClick={sair}>
          Sair da conta
        </button>
        <Link to="/bug">Encontrou um problema? Reporte pra gente</Link>
      </div>
    </section>
  )
}
