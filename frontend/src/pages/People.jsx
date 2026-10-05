import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api.js'
import { useAuth } from '../AuthContext.jsx'
import { Empty, FollowButton, IconSearch, Verified } from '../components/ui.jsx'

export default function People() {
  const { user: eu } = useAuth()
  const [busca, setBusca] = useState('')
  const [pessoas, setPessoas] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      apiFetch(`/api/users/?search=${encodeURIComponent(busca)}`).then(setPessoas)
    }, 300)
    return () => clearTimeout(timer)
  }, [busca])

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Pessoas</h1>
          <p className="subtitle">Encontre dubladores, animadores, desenhistas e roteiristas.</p>
        </div>
      </div>

      <input
        type="search"
        className="people-search"
        placeholder="Buscar pelo nome..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        aria-label="Buscar pessoas pelo nome"
        autoFocus
      />

      {!pessoas && (
        <div aria-hidden="true">
          <div className="skeleton" style={{ height: 56, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 56, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 56 }} />
        </div>
      )}
      {pessoas && pessoas.length === 0 && (
        <Empty icon={<IconSearch />} title="Ninguém encontrado">
          Tente outro nome — ou convide seus amigos pro DublaCon!
        </Empty>
      )}
      {pessoas && pessoas.length > 0 && (
        <ul>
          {pessoas.map((p) => (
            <li key={p.id} className="list-row">
              <Link to={`/usuarios/${p.id}`} className="conversa-link">
                {p.foto ? (
                  <img className="avatar" src={p.foto} alt="" />
                ) : (
                  <span className="avatar">{p.nome[0]}</span>
                )}
                <span>
                  <strong>{p.nome}</strong>
                  <Verified tipo={p.verified} />
                  {p.bio && <span className="conversa-preview">{p.bio}</span>}
                </span>
              </Link>
              <span className="people-roles">
                {p.roles.slice(0, 3).map((r) => (
                  <span key={r.id} className="badge badge--role">{r.nome}</span>
                ))}
                {eu && eu.id !== p.id && <FollowButton user={p} />}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
