import { useEffect, useState } from 'react'
import { apiFetch } from '../api.js'
import ProjectCard from '../components/ProjectCard.jsx'
import { Empty, IconClapper, SkeletonCards } from '../components/ui.jsx'

export default function OpenProjects() {
  const [projetos, setProjetos] = useState(null)
  const [temMais, setTemMais] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [categorias, setCategorias] = useState([])
  const [roles, setRoles] = useState([])
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroRole, setFiltroRole] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    apiFetch('/api/roles/').then(setRoles).catch(() => {})
  }, [])

  useEffect(() => {
    if (pagina === 1) setProjetos(null)
    const params = new URLSearchParams({ status: 'aberto', page: pagina })
    if (filtroCategoria) params.set('categoria', filtroCategoria)
    if (filtroRole) params.set('role', filtroRole)
    apiFetch(`/api/projects/?${params}`)
      .then(({ results, next }) => {
        setProjetos((atual) => (pagina === 1 ? results : [...atual, ...results]))
        setTemMais(Boolean(next))
        // categorias saem dos proprios projetos (campo livre), coletadas na busca sem filtro
        if (pagina === 1 && !filtroCategoria && !filtroRole) {
          setCategorias([...new Set(results.map((p) => p.categoria).filter(Boolean))])
        }
      })
      .catch((err) => setErro(err.message))
  }, [filtroCategoria, filtroRole, pagina])

  function mudarFiltro(setter, valor) {
    setPagina(1)
    setter(valor)
  }

  const temFiltro = filtroCategoria || filtroRole

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Encontre seu próximo projeto</h1>
          <p className="subtitle">Animações, fandubs e HQs procurando gente como você.</p>
        </div>
      </div>

      {(roles.length > 0 || categorias.length > 0) && (
        <div className="filter-bar">
          {roles.length > 0 && (
            <div className="role-chips">
              <span className="filter-label">Precisa de:</span>
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`role-chip ${filtroRole === String(r.id) ? 'is-active' : ''}`}
                  onClick={() => mudarFiltro(setFiltroRole, filtroRole === String(r.id) ? '' : String(r.id))}
                >
                  {r.nome}
                </button>
              ))}
            </div>
          )}
          {categorias.length > 0 && (
            <div className="role-chips">
              <span className="filter-label">Categoria:</span>
              {categorias.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`role-chip ${filtroCategoria === c ? 'is-active' : ''}`}
                  onClick={() => mudarFiltro(setFiltroCategoria, filtroCategoria === c ? '' : c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {erro && <p role="alert">{erro}</p>}
      {!erro && !projetos && <SkeletonCards />}
      {projetos && projetos.length === 0 && (
        <Empty icon={<IconClapper />} title={temFiltro ? 'Nada com esses filtros' : 'Nenhum projeto aberto agora'}>
          {temFiltro ? 'Tente tirar algum filtro.' : 'Volte em breve — ou crie o seu e abra as primeiras vagas!'}
        </Empty>
      )}
      {projetos && projetos.length > 0 && (
        <>
          <div className="project-grid">
            {projetos.map((p) => (
              <ProjectCard key={p.id} project={p} />
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
