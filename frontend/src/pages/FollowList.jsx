import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiFetch } from '../api.js'
import { Empty, IconUser } from '../components/ui.jsx'

export default function FollowList({ tipo }) {
  const { id } = useParams()
  const [dono, setDono] = useState(null)
  const [pessoas, setPessoas] = useState(null)

  useEffect(() => {
    setPessoas(null)
    apiFetch(`/api/users/${id}/`).then(setDono)
    apiFetch(`/api/users/${id}/${tipo}/`).then(setPessoas)
  }, [id, tipo])

  const titulo = tipo === 'seguidores' ? 'Seguidores' : 'Seguindo'

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>{titulo}</h1>
          {dono && (
            <p className="subtitle">
              de <Link to={`/usuarios/${dono.id}`}>{dono.nome}</Link>
            </p>
          )}
        </div>
      </div>

      {!pessoas && (
        <div aria-hidden="true">
          <div className="skeleton" style={{ height: 56, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 56 }} />
        </div>
      )}
      {pessoas && pessoas.length === 0 && (
        <Empty icon={<IconUser />} title="Ninguém por aqui ainda" />
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
                <strong>{p.nome}</strong>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
