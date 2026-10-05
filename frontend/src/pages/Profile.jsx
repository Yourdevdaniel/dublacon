import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { apiFetch } from '../api.js'
import ProjectCard from '../components/ProjectCard.jsx'
import Rating from '../components/Rating.jsx'
import { Empty, FollowButton, IconUser, Verified } from '../components/ui.jsx'

export default function Profile() {
  const { id } = useParams()
  const { user: eu } = useAuth()
  const [perfil, setPerfil] = useState(null)
  const [projetos, setProjetos] = useState([])
  const [erro, setErro] = useState('')

  useEffect(() => {
    setPerfil(null)
    apiFetch(`/api/users/${id}/`).then(setPerfil).catch((err) => setErro(err.message))
    apiFetch(`/api/projects/?owner=${id}&page_size=50`).then(({ results }) => setProjetos(results))
  }, [id])

  if (erro) return <p role="alert">{erro}</p>
  if (!perfil) {
    return (
      <div aria-hidden="true">
        <div className="skeleton" style={{ width: 72, height: 72, borderRadius: '50%', marginBottom: 12 }} />
        <div className="skeleton skeleton-line" style={{ width: '40%' }} />
        <div className="skeleton skeleton-line" style={{ width: '65%' }} />
      </div>
    )
  }

  const souEu = eu && eu.id === perfil.id
  const desde = new Date(perfil.date_joined).getFullYear()

  return (
    <section>
      <div className="profile-header">
        {perfil.foto ? (
          <img className="avatar" src={perfil.foto} alt="" />
        ) : (
          <span className="avatar">{perfil.nome[0]}</span>
        )}
        <div>
          <h1>{perfil.nome} <Verified tipo={perfil.verified} /></h1>
          <p className="subtitle">
            No DublaCon desde {desde} ·{' '}
            <Link to={`/usuarios/${perfil.id}/seguidores`}>{perfil.seguidores_count} seguidores</Link> ·{' '}
            <Link to={`/usuarios/${perfil.id}/seguindo`}>{perfil.seguindo_count} seguindo</Link>
          </p>
        </div>
        <div className="profile-actions">
          {souEu && <Link to="/configuracoes">Editar perfil</Link>}
          {eu && !souEu && (
            <>
              <FollowButton user={perfil} onChange={setPerfil} />
              <Link to={`/mensagens/${perfil.id}`}>Mensagem</Link>
              <Link to={`/denunciar/${perfil.id}`} className="btn-link--danger">Denunciar</Link>
            </>
          )}
        </div>
      </div>

      <Rating targetType="user" targetId={perfil.id} canRate={Boolean(eu) && !souEu} />

      {perfil.bio && <p className="profile-bio">{perfil.bio}</p>}

      {perfil.roles.length > 0 && (
        <div className="role-chips">
          {perfil.roles.map((role) => (
            <span key={role.id} className="badge badge--role">{role.nome}</span>
          ))}
        </div>
      )}

      <h2>Portfólio</h2>
      {perfil.portfolio.length === 0 ? (
        <Empty icon={<IconUser />} title="Portfólio vazio">
          {souEu ? 'Adicione seus trabalhos em Configurações.' : `${perfil.nome} ainda não adicionou trabalhos.`}
        </Empty>
      ) : (
        <ul>
          {perfil.portfolio.map((item) => {
            const ehAudio = item.arquivo && /\.(mp3|wav|ogg)(\?|$)/i.test(item.arquivo)
            return (
              <li key={item.id} className="list-row portfolio-row">
                <span className="portfolio-row__info">
                  <strong>{item.titulo}</strong>
                  {item.descricao && <span className="notif-target"> · {item.descricao}</span>}
                  {ehAudio && <audio controls preload="none" src={item.arquivo} className="audio-player" />}
                </span>
                <span>
                  {item.link && <a href={item.link} target="_blank" rel="noreferrer">Link ↗</a>}
                  {item.arquivo && !ehAudio && <a href={item.arquivo} target="_blank" rel="noreferrer">Arquivo ↗</a>}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {projetos.length > 0 && (
        <>
          <h2>Projetos criados</h2>
          <div className="project-grid">
            {projetos.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
