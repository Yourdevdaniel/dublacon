import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import { apiFetch } from '../api.js'
import UpdateCard from '../components/UpdateCard.jsx'
import { Empty, IconFeed } from '../components/ui.jsx'

export default function Feed() {
  const { user } = useAuth()
  const [updates, setUpdates] = useState(null)
  const [erro, setErro] = useState('')
  const [novoPost, setNovoPost] = useState('')
  const [novaFoto, setNovaFoto] = useState(null)
  const [erroPost, setErroPost] = useState('')
  const [aba, setAba] = useState('todos')
  const [pagina, setPagina] = useState(1)
  const [temMais, setTemMais] = useState(false)

  useEffect(() => {
    if (pagina === 1) setUpdates(null)
    const params = new URLSearchParams({ page: pagina })
    if (aba === 'seguindo') params.set('seguindo', '1')
    apiFetch(`/api/updates/?${params}`)
      .then(({ results, next }) => {
        setUpdates((atual) => (pagina === 1 ? results : [...atual, ...results]))
        setTemMais(Boolean(next))
      })
      .catch((err) => setErro(err.message))
  }, [aba, pagina])

  function trocarAba(nova) {
    setPagina(1)
    setAba(nova)
  }

  async function publicar(e) {
    e.preventDefault()
    setErroPost('')
    const form = new FormData()
    form.append('conteudo', novoPost)
    if (novaFoto) form.append('foto', novaFoto)
    try {
      const post = await apiFetch('/api/updates/', { method: 'POST', body: form })
      setUpdates([post, ...(updates || [])])
      setNovoPost('')
      setNovaFoto(null)
      e.target.reset()
    } catch (err) {
      setErroPost(err.message)
    }
  }

  return (
    <section className="feed-col">
      <div className="page-head">
        <div>
          <h1>Feed</h1>
          <p className="subtitle">Postagens da comunidade e atualizações dos projetos.</p>
        </div>
      </div>

      {user && (
        <div className="role-chips">
          <button
            type="button"
            className={`role-chip ${aba === 'todos' ? 'is-active' : ''}`}
            onClick={() => trocarAba('todos')}
          >
            Todos
          </button>
          <button
            type="button"
            className={`role-chip ${aba === 'seguindo' ? 'is-active' : ''}`}
            onClick={() => trocarAba('seguindo')}
          >
            Seguindo
          </button>
        </div>
      )}

      {user && (
        <form className="composer" onSubmit={publicar}>
          <textarea
            placeholder="No que você está trabalhando?"
            value={novoPost}
            onChange={(e) => setNovoPost(e.target.value)}
            rows={2}
            required
          />
          {erroPost && <p role="alert">{erroPost}</p>}
          <div className="composer__actions">
            <input type="file" accept="image/*" onChange={(e) => setNovaFoto(e.target.files[0])} />
            <button type="submit">Publicar</button>
          </div>
        </form>
      )}

      {erro && <p role="alert">{erro}</p>}
      {!erro && !updates && (
        <div className="feed" aria-hidden="true">
          <div className="skeleton" style={{ height: 140, borderRadius: 'var(--radius-md)' }} />
          <div className="skeleton" style={{ height: 140, borderRadius: 'var(--radius-md)' }} />
        </div>
      )}
      {updates && updates.length === 0 && (
        <Empty icon={<IconFeed />} title="Nada por aqui ainda">
          {aba === 'seguindo'
            ? 'Siga pessoas pra ver os posts delas aqui.'
            : 'Seja a primeira pessoa a postar alguma coisa!'}
        </Empty>
      )}
      {updates && updates.length > 0 && (
        <>
          <div className="feed">
            {updates.map((u) => (
              <UpdateCard
                key={u.id}
                update={u}
                showProject
                onDelete={(idExcluido) => setUpdates(updates.filter((x) => x.id !== idExcluido))}
              />
            ))}
          </div>
          {temMais && (
            <div className="load-more">
              <button type="button" className="btn-secondary" onClick={() => setPagina((p) => p + 1)}>
                Carregar mais
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
