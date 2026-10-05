import { useEffect, useState, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { apiFetch } from '../api.js'
import UpdateCard from '../components/UpdateCard.jsx'
import Rating from '../components/Rating.jsx'
import { ConfirmButton, Verified } from '../components/ui.jsx'
import './ProjectDetail.css'

const STATUS_LABEL = {
  rascunho: 'Rascunho',
  aberto: 'Aberto',
  em_producao: 'Em produção',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

function VagaRow({ vaga, isOwner, onCandidatar, onAceitar, onRecusar, onExcluir }) {
  const [candidaturas, setCandidaturas] = useState(null)
  const [mensagem, setMensagem] = useState('')
  const [audio, setAudio] = useState(null)

  useEffect(() => {
    if (!isOwner) return
    apiFetch(`/api/candidaturas/?vaga=${vaga.id}`).then(setCandidaturas)
  }, [isOwner, vaga.id])

  return (
    <li className="vaga-row">
      <div className="vaga-row__head">
        <h3>{vaga.titulo} <span className="badge badge--role">{vaga.role.nome}</span></h3>
        <span className="vaga-row__head-right">
          <span className="badge">
            {vaga.vagas_preenchidas}/{vaga.quantidade} {vaga.aberta ? '· aberta' : '· preenchida'}
          </span>
          {isOwner && (
            <ConfirmButton pergunta="Excluir essa vaga?" onConfirm={() => onExcluir(vaga.id)}>
              Excluir
            </ConfirmButton>
          )}
        </span>
      </div>
      {vaga.descricao && <p className="vaga-row__desc">{vaga.descricao}</p>}

      {!isOwner && vaga.aberta && (
        <form
          className="candidatura-form"
          onSubmit={(e) => {
            e.preventDefault()
            onCandidatar(vaga.id, mensagem, audio)
            setMensagem('')
            setAudio(null)
            e.target.reset()
          }}
        >
          <textarea
            placeholder="Mensagem pra sua candidatura"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={1}
          />
          <label className="candidatura-form__audio">
            Teste de voz (mp3/ogg, opcional)
            <input type="file" accept=".mp3,.wav,.ogg,.m4a,audio/*" onChange={(e) => setAudio(e.target.files[0])} />
          </label>
          <button type="submit">Candidatar-se</button>
        </form>
      )}

      {isOwner && candidaturas && candidaturas.length > 0 &&
        candidaturas.map((c) => (
          <div className="candidatura-row" key={c.id}>
            <div className="candidatura-row__info">
              <span><Link to={`/usuarios/${c.applicant.id}`}>{c.applicant.nome}</Link> — <span className="badge">{c.status}</span></span>
              {c.mensagem && <p className="candidatura-row__msg">{c.mensagem}</p>}
              {c.audio && <audio controls preload="none" src={c.audio} className="audio-player" />}
            </div>
            {c.status === 'pendente' && (
              <span className="candidatura-row__actions">
                <button type="button" onClick={() => onAceitar(c.id)}>Aceitar</button>
                <button type="button" onClick={() => onRecusar(c.id)}>Recusar</button>
              </span>
            )}
          </div>
        ))}
    </li>
  )
}

export default function ProjectDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [vagas, setVagas] = useState([])
  const [elenco, setElenco] = useState([])
  const [updates, setUpdates] = useState([])
  const [episodios, setEpisodios] = useState([])
  const [roles, setRoles] = useState([])
  const [novoUpdate, setNovoUpdate] = useState('')
  const [novaFoto, setNovaFoto] = useState(null)
  const [erro, setErro] = useState('')

  const [mostrarEditar, setMostrarEditar] = useState(false)
  const [edicao, setEdicao] = useState(null)
  const [novaCapa, setNovaCapa] = useState(null)

  const [mostrarVagaForm, setMostrarVagaForm] = useState(false)
  const [novaVaga, setNovaVaga] = useState({ role_id: '', titulo: '', quantidade: 1, descricao: '' })

  const [mostrarEpForm, setMostrarEpForm] = useState(false)
  const [novoEp, setNovoEp] = useState({ numero: '', titulo: '', link: '' })

  const carregar = useCallback(() => {
    apiFetch(`/api/projects/${id}/`).then(setProject).catch((err) => setErro(err.message))
    apiFetch(`/api/vagas/?project=${id}`).then(setVagas)
    apiFetch(`/api/projects/${id}/elenco/`).then(setElenco)
    apiFetch(`/api/updates/?project=${id}&page_size=50`).then(({ results }) => setUpdates(results))
    apiFetch(`/api/episodios/?project=${id}`).then(setEpisodios)
  }, [id])

  useEffect(() => {
    carregar()
  }, [carregar])

  const isOwner = project && user && project.owner.id === user.id

  useEffect(() => {
    if (isOwner) apiFetch('/api/roles/').then(setRoles)
  }, [isOwner])

  async function candidatar(vagaId, mensagem, audio) {
    try {
      const form = new FormData()
      form.append('vaga', vagaId)
      form.append('mensagem', mensagem)
      if (audio) form.append('audio', audio)
      await apiFetch('/api/candidaturas/', { method: 'POST', body: form })
      carregar()
    } catch (err) {
      setErro(err.message)
    }
  }

  async function aceitar(candidaturaId) {
    await apiFetch(`/api/candidaturas/${candidaturaId}/aceitar/`, { method: 'POST' })
    carregar()
  }

  async function recusar(candidaturaId) {
    await apiFetch(`/api/candidaturas/${candidaturaId}/recusar/`, { method: 'POST' })
    carregar()
  }

  async function postarUpdate(e) {
    e.preventDefault()
    const form = new FormData()
    form.append('project', id)
    form.append('conteudo', novoUpdate)
    if (novaFoto) form.append('foto', novaFoto)
    await apiFetch('/api/updates/', { method: 'POST', body: form })
    setNovoUpdate('')
    setNovaFoto(null)
    carregar()
  }

  function abrirEdicao() {
    setEdicao({
      nome: project.nome,
      descricao: project.descricao,
      categoria: project.categoria || '',
      status: project.status,
    })
    setNovaCapa(null)
    setMostrarEditar(true)
  }

  async function salvarEdicao(e) {
    e.preventDefault()
    setErro('')
    const form = new FormData()
    Object.entries(edicao).forEach(([k, v]) => form.append(k, v))
    if (novaCapa) form.append('capa', novaCapa)
    try {
      const atualizado = await apiFetch(`/api/projects/${id}/`, { method: 'PATCH', body: form })
      setProject(atualizado)
      setMostrarEditar(false)
    } catch (err) {
      setErro(err.message)
    }
  }

  async function excluirProjeto() {
    await apiFetch(`/api/projects/${id}/`, { method: 'DELETE' })
    navigate('/meus-projetos')
  }

  async function criarVaga(e) {
    e.preventDefault()
    setErro('')
    try {
      await apiFetch('/api/vagas/', {
        method: 'POST',
        body: JSON.stringify({ ...novaVaga, project: Number(id) }),
      })
      setNovaVaga({ role_id: '', titulo: '', quantidade: 1, descricao: '' })
      setMostrarVagaForm(false)
      carregar()
    } catch (err) {
      setErro(err.message)
    }
  }

  async function excluirVaga(vagaId) {
    await apiFetch(`/api/vagas/${vagaId}/`, { method: 'DELETE' })
    carregar()
  }

  async function criarEpisodio(e) {
    e.preventDefault()
    setErro('')
    try {
      await apiFetch('/api/episodios/', {
        method: 'POST',
        body: JSON.stringify({ ...novoEp, project: Number(id) }),
      })
      setNovoEp({ numero: '', titulo: '', link: '' })
      setMostrarEpForm(false)
      carregar()
    } catch (err) {
      setErro(err.message)
    }
  }

  async function excluirEpisodio(epId) {
    await apiFetch(`/api/episodios/${epId}/`, { method: 'DELETE' })
    carregar()
  }

  if (erro && !project) return <p role="alert">{erro}</p>
  if (!project) return <p>Carregando...</p>

  return (
    <section>
      <header className="project-hero">
        {project.capa ? (
          <img className="project-hero__img" src={project.capa} alt="" />
        ) : (
          <div className="project-hero__img project-hero__img--fallback">
            <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 8.5 20 5v13L3 15.5V8.5Z" strokeLinejoin="round" />
              <path d="m3 8.5 4.5 3M9 7.6l4.5 3M15 6.6l4.5 3" />
            </svg>
          </div>
        )}
        <div className="project-hero__content">
          <div className="project-hero__meta">
            <span className="badge">{STATUS_LABEL[project.status] || project.status}</span>
            {project.categoria && <span className="badge">{project.categoria}</span>}
          </div>
          <h1>{project.nome}</h1>
          <div className="project-hero__owner">
            <Link to={`/usuarios/${project.owner.id}`} className="project-hero__owner-link">
              {project.owner.foto ? (
                <img className="avatar" src={project.owner.foto} alt="" />
              ) : (
                <span className="avatar">{project.owner.nome[0]}</span>
              )}
              <span>por {project.owner.nome}</span>
              <Verified tipo={project.owner.verified} />
            </Link>
            {user && !isOwner && (
              <span className="project-hero__actions">
                <Link to={`/mensagens/${project.owner.id}`}>Mensagem</Link>
                <Link to={`/denunciar/${project.owner.id}`}>Denunciar</Link>
              </span>
            )}
            {isOwner && (
              <span className="project-hero__actions">
                <button type="button" className="hero-btn" onClick={mostrarEditar ? () => setMostrarEditar(false) : abrirEdicao}>
                  {mostrarEditar ? 'Fechar edição' : 'Editar projeto'}
                </button>
              </span>
            )}
          </div>
        </div>
      </header>

      {erro && <p role="alert">{erro}</p>}

      {mostrarEditar && edicao && (
        <div className="panel">
          <h2>Editar projeto</h2>
          <form onSubmit={salvarEdicao}>
            <label>
              Nome
              <input value={edicao.nome} onChange={(e) => setEdicao({ ...edicao, nome: e.target.value })} required />
            </label>
            <label>
              Categoria
              <input value={edicao.categoria} onChange={(e) => setEdicao({ ...edicao, categoria: e.target.value })} />
            </label>
            <label>
              Descrição
              <textarea value={edicao.descricao} onChange={(e) => setEdicao({ ...edicao, descricao: e.target.value })} rows={3} required />
            </label>
            <label>
              Status
              <select value={edicao.status} onChange={(e) => setEdicao({ ...edicao, status: e.target.value })}>
                {Object.entries(STATUS_LABEL).map(([valor, label]) => (
                  <option key={valor} value={valor}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              Capa
              <input type="file" accept="image/*" onChange={(e) => setNovaCapa(e.target.files[0])} />
            </label>
            <span className="form-actions">
              <button type="submit">Salvar</button>
              <ConfirmButton
                pergunta="Excluir o projeto e tudo dentro? Não dá pra desfazer."
                onConfirm={excluirProjeto}
                className="btn-secondary btn-danger-text"
              >
                Excluir projeto
              </ConfirmButton>
            </span>
          </form>
        </div>
      )}

      <Rating targetType="project" targetId={project.id} canRate={Boolean(user) && !isOwner} />

      <p className="project-desc">{project.descricao}</p>

      <h2>Elenco</h2>
      {elenco.length === 0 ? <p>Ninguém confirmado ainda.</p> : (
        <ul>
          {elenco.map((e) => (
            <li key={e.vaga_id} className="list-row">
              <Link to={`/usuarios/${e.usuario.id}`}>{e.usuario.nome}</Link>
              <span className="badge">{e.role} · {e.vaga}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="section-head">
        <h2>Vagas</h2>
        {isOwner && (
          <button type="button" onClick={() => setMostrarVagaForm((v) => !v)}>
            {mostrarVagaForm ? 'Cancelar' : '+ Nova vaga'}
          </button>
        )}
      </div>

      {isOwner && mostrarVagaForm && (
        <div className="panel">
          <form onSubmit={criarVaga}>
            <label>
              Papel
              <select value={novaVaga.role_id} onChange={(e) => setNovaVaga({ ...novaVaga, role_id: e.target.value })} required>
                <option value="">Escolha um papel...</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.nome}</option>
                ))}
              </select>
            </label>
            <label>
              Título (ex: "Voz do protagonista")
              <input value={novaVaga.titulo} onChange={(e) => setNovaVaga({ ...novaVaga, titulo: e.target.value })} required />
            </label>
            <label>
              Quantidade de vagas
              <input
                type="number"
                min="1"
                value={novaVaga.quantidade}
                onChange={(e) => setNovaVaga({ ...novaVaga, quantidade: e.target.value })}
                required
              />
            </label>
            <label>
              Descrição (opcional)
              <textarea value={novaVaga.descricao} onChange={(e) => setNovaVaga({ ...novaVaga, descricao: e.target.value })} rows={2} />
            </label>
            <button type="submit">Abrir vaga</button>
          </form>
        </div>
      )}

      {vagas.length === 0 && <p>Nenhuma vaga aberta{isOwner ? ' — abra a primeira!' : ' ainda.'}</p>}
      <ul>
        {vagas.map((vaga) => (
          <VagaRow
            key={vaga.id}
            vaga={vaga}
            isOwner={isOwner}
            onCandidatar={candidatar}
            onAceitar={aceitar}
            onRecusar={recusar}
            onExcluir={excluirVaga}
          />
        ))}
      </ul>

      <div className="section-head">
        <h2>Episódios</h2>
        {isOwner && (
          <button type="button" onClick={() => {
            setNovoEp({ numero: episodios.length + 1, titulo: '', link: '' })
            setMostrarEpForm((v) => !v)
          }}>
            {mostrarEpForm ? 'Cancelar' : '+ Novo episódio'}
          </button>
        )}
      </div>

      {isOwner && mostrarEpForm && (
        <div className="panel">
          <form onSubmit={criarEpisodio}>
            <label>
              Número
              <input
                type="number"
                min="1"
                value={novoEp.numero}
                onChange={(e) => setNovoEp({ ...novoEp, numero: e.target.value })}
                required
              />
            </label>
            <label>
              Título (opcional)
              <input value={novoEp.titulo} onChange={(e) => setNovoEp({ ...novoEp, titulo: e.target.value })} />
            </label>
            <label>
              Link (YouTube, Drive...)
              <input type="url" value={novoEp.link} onChange={(e) => setNovoEp({ ...novoEp, link: e.target.value })} required />
            </label>
            <button type="submit">Publicar episódio</button>
          </form>
        </div>
      )}

      {episodios.length === 0 ? <p>Nenhum episódio publicado ainda.</p> : (
        <ul>
          {episodios.map((ep) => (
            <li key={ep.id} className="list-row">
              <span>Ep {ep.numero}{ep.titulo ? ` — ${ep.titulo}` : ''}</span>
              <span className="list-row__actions">
                <a href={ep.link} target="_blank" rel="noreferrer">Assistir</a>
                {isOwner && (
                  <ConfirmButton pergunta="Excluir esse episódio?" onConfirm={() => excluirEpisodio(ep.id)}>
                    Excluir
                  </ConfirmButton>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2>Atualizações</h2>
      {isOwner && (
        <form onSubmit={postarUpdate}>
          <textarea
            placeholder="Como está indo o projeto?"
            value={novoUpdate}
            onChange={(e) => setNovoUpdate(e.target.value)}
            required
          />
          <label>
            Foto (opcional)
            <input type="file" accept="image/*" onChange={(e) => setNovaFoto(e.target.files[0])} />
          </label>
          <button type="submit">Postar</button>
        </form>
      )}
      <div className="feed">
        {updates.map((u) => (
          <UpdateCard key={u.id} update={u} onDelete={carregar} />
        ))}
      </div>
    </section>
  )
}
