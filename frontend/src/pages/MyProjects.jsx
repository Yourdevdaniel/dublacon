import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { apiFetch } from '../api.js'
import ProjectCard from '../components/ProjectCard.jsx'
import { Empty, IconClapper } from '../components/ui.jsx'

export default function MyProjects() {
  const { user } = useAuth()
  const [criados, setCriados] = useState([])
  const [participando, setParticipando] = useState([])
  const [novo, setNovo] = useState({ nome: '', descricao: '', categoria: '' })
  const [novaCapa, setNovaCapa] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [erro, setErro] = useState('')

  function carregar() {
    // ponytail: page_size=50 cobre qualquer usuario real; paginar aqui se um dia estourar
    apiFetch(`/api/projects/?owner=${user.id}&page_size=50`).then(({ results }) => setCriados(results))
    apiFetch('/api/candidaturas/').then((candidaturas) =>
      setParticipando(candidaturas.filter((c) => c.status === 'aceita' && c.applicant.id === user.id))
    )
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  async function criarProjeto(e) {
    e.preventDefault()
    setErro('')
    try {
      const form = new FormData()
      Object.entries(novo).forEach(([k, v]) => form.append(k, v))
      if (novaCapa) form.append('capa', novaCapa)
      await apiFetch('/api/projects/', { method: 'POST', body: form })
      setNovo({ nome: '', descricao: '', categoria: '' })
      setNovaCapa(null)
      setMostrarForm(false)
      carregar()
    } catch (err) {
      setErro(err.message)
    }
  }

  return (
    <section>
      <div className="profile-header">
        {user.foto ? (
          <img className="avatar" src={user.foto} alt="" />
        ) : (
          <span className="avatar">{user.nome[0]}</span>
        )}
        <h1>{user.nome}</h1>
      </div>

      <div className="section-head">
        <h2>Projetos que eu criei</h2>
        <button type="button" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? 'Cancelar' : '+ Criar projeto'}
        </button>
      </div>

      {mostrarForm && (
        <div className="panel">
          <form onSubmit={criarProjeto}>
            <label>
              Nome
              <input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} required />
            </label>
            <label>
              Categoria
              <input value={novo.categoria} onChange={(e) => setNovo({ ...novo, categoria: e.target.value })} placeholder="Animação, Fandub, HQ..." />
            </label>
            <label>
              Descrição
              <textarea value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} required rows={3} />
            </label>
            <label>
              Capa (opcional)
              <input type="file" accept="image/*" onChange={(e) => setNovaCapa(e.target.files[0])} />
            </label>
            {erro && <p role="alert">{erro}</p>}
            <button type="submit">Publicar projeto</button>
          </form>
        </div>
      )}

      {criados.length === 0 ? (
        <Empty icon={<IconClapper />} title="Você ainda não criou nenhum projeto">
          Publique sua ideia e abra vagas pra formar o time.
        </Empty>
      ) : (
        <div className="project-grid">
          {criados.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      <h2>Projetos em que participo</h2>
      {participando.length === 0 ? (
        <p>Você ainda não foi aceito em nenhum projeto.</p>
      ) : (
        <ul>
          {participando.map((c) => (
            <li key={c.id} className="list-row">
              <Link to={`/projetos/${c.vaga_detail.project}`}>{c.vaga_detail.project_nome}</Link>
              <span className="badge">{c.vaga_detail.titulo}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
