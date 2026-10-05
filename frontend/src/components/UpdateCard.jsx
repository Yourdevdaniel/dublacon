import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { apiFetch } from '../api.js'
import { ConfirmButton, Verified } from './ui.jsx'
import './Feed.css'

export default function UpdateCard({ update, showProject, onDelete, detalhe = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [comentarios, setComentarios] = useState(null)
  const [novoComentario, setNovoComentario] = useState('')
  const [curti, setCurti] = useState(update.curti)
  const [curtidasCount, setCurtidasCount] = useState(update.curtidas_count)
  const [conteudo, setConteudo] = useState(update.conteudo)
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState('')

  const souAutor = user && user.id === update.author.id

  useEffect(() => {
    // no feed o card é compacto; os comentários só carregam na página do post
    if (detalhe) apiFetch(`/api/comentarios/?update=${update.id}`).then(setComentarios)
  }, [detalhe, update.id])

  async function comentar(e) {
    e.preventDefault()
    const comentario = await apiFetch('/api/comentarios/', {
      method: 'POST',
      body: JSON.stringify({ update: update.id, conteudo: novoComentario }),
    })
    setComentarios((atual) => [...(atual || []), comentario])
    setNovoComentario('')
  }

  async function excluirComentario(comentarioId) {
    await apiFetch(`/api/comentarios/${comentarioId}/`, { method: 'DELETE' })
    setComentarios((atual) => atual.filter((c) => c.id !== comentarioId))
  }

  async function curtir() {
    if (!user) {
      navigate('/login')
      return
    }
    const atualizado = await apiFetch(`/api/updates/${update.id}/curtir/`, { method: 'POST' })
    setCurti(atualizado.curti)
    setCurtidasCount(atualizado.curtidas_count)
  }

  async function salvarEdicao(e) {
    e.preventDefault()
    const atualizado = await apiFetch(`/api/updates/${update.id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ conteudo: rascunho }),
    })
    setConteudo(atualizado.conteudo)
    setEditando(false)
  }

  async function excluir() {
    await apiFetch(`/api/updates/${update.id}/`, { method: 'DELETE' })
    onDelete?.(update.id)
  }

  const corpo = (
    <>
      <p>{conteudo}</p>
      {update.foto && <img className="update-card__foto" src={update.foto} alt="" />}
    </>
  )

  return (
    <article className="update-card">
      <header className="update-card__meta">
        <Link to={`/usuarios/${update.author.id}`} className="update-card__author">
          {update.author.foto ? (
            <img className="avatar" src={update.author.foto} alt="" />
          ) : (
            <span className="avatar">{update.author.nome[0]}</span>
          )}
          <strong>{update.author.nome}</strong>
          <Verified tipo={update.author.verified} />
        </Link>
        <span className="update-card__date">· {new Date(update.created_at).toLocaleDateString('pt-BR')}</span>
        {showProject && update.project && (
          <Link className="update-card__project" to={`/projetos/${update.project}`}>
            em {update.project_nome}
          </Link>
        )}
        {souAutor && !editando && (
          <span className="update-card__own-actions">
            <button type="button" className="btn-ghost-mini" onClick={() => { setRascunho(conteudo); setEditando(true) }}>
              Editar
            </button>
            <ConfirmButton pergunta="Excluir esse post?" onConfirm={excluir} className="btn-ghost-mini btn-ghost-mini--danger">
              Excluir
            </ConfirmButton>
          </span>
        )}
      </header>

      {editando ? (
        <form onSubmit={salvarEdicao} className="update-card__edit">
          <textarea value={rascunho} onChange={(e) => setRascunho(e.target.value)} rows={3} required />
          <span className="update-card__edit-actions">
            <button type="submit" className="btn-mini">Salvar</button>
            <button type="button" className="btn-secondary btn-mini" onClick={() => setEditando(false)}>Cancelar</button>
          </span>
        </form>
      ) : detalhe ? (
        corpo
      ) : (
        <Link to={`/posts/${update.id}`} className="update-card__link">{corpo}</Link>
      )}

      <div className="update-card__footer">
        <button
          type="button"
          className={`like-button ${curti ? 'is-active' : ''}`}
          onClick={curtir}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill={curti ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
            <path d="M12 20.5s-7.5-4.6-10-9.3C.5 7.8 2.3 4.5 5.8 4.5c2 0 3.6 1.1 4.6 2.6C11.4 5.6 13 4.5 15 4.5c3.5 0 5.3 3.3 3.8 6.7-2.5 4.7-10 9.3-10 9.3Z" strokeLinejoin="round" />
          </svg>
          {curtidasCount > 0 && curtidasCount}
        </button>
        {!detalhe && (
          <Link to={`/posts/${update.id}`} className="like-button comment-count">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a8 8 0 0 1-8 8H4l2-3.2A8 8 0 1 1 21 12Z" />
            </svg>
            {update.comentarios_count > 0 ? update.comentarios_count : 'Comentar'}
          </Link>
        )}
      </div>

      {detalhe && (
        <div className="comments">
          {comentarios && comentarios.length > 0 && (
            <ul className="comments__list">
              {comentarios.map((c) => (
                <li key={c.id} className="comments__item">
                  {c.author.foto ? (
                    <img className="avatar" src={c.author.foto} alt="" />
                  ) : (
                    <span className="avatar">{c.author.nome[0]}</span>
                  )}
                  <p><strong>{c.author.nome}</strong> {c.conteudo}</p>
                  {user && user.id === c.author.id && (
                    <button
                      type="button"
                      className="btn-ghost-mini btn-ghost-mini--danger"
                      onClick={() => excluirComentario(c.id)}
                      aria-label="Excluir comentário"
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {comentarios && comentarios.length === 0 && (
            <p className="comments__login">Nenhum comentário ainda — seja a primeira pessoa!</p>
          )}

          {user ? (
            <form className="comments__form" onSubmit={comentar}>
              <input
                placeholder="Escreva um comentário..."
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                required
              />
              <button type="submit">Comentar</button>
            </form>
          ) : (
            <p className="comments__login"><Link to="/login">Entre</Link> pra comentar.</p>
          )}
        </div>
      )}
    </article>
  )
}
