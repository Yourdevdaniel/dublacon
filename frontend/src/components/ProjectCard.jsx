import { Link } from 'react-router-dom'
import { Verified } from './ui.jsx'
import './ProjectCard.css'

const STATUS_LABEL = {
  rascunho: 'Rascunho',
  aberto: 'Aberto',
  em_producao: 'Em produção',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

function CoverFallback() {
  return (
    <div className="project-card__cover project-card__cover--fallback">
      <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 8.5 20 5v13L3 15.5V8.5Z" strokeLinejoin="round" />
        <path d="m3 8.5 4.5 3M9 7.6l4.5 3M15 6.6l4.5 3" />
      </svg>
    </div>
  )
}

export default function ProjectCard({ project }) {
  return (
    <Link to={`/projetos/${project.id}`} className="project-card">
      {project.capa ? (
        <img className="project-card__cover" src={project.capa} alt="" />
      ) : (
        <CoverFallback />
      )}

      {project.categoria && <span className="project-card__tag badge">{project.categoria}</span>}
      <span className={`project-card__status badge ${project.status === 'aberto' ? 'project-card__status--aberto' : ''}`}>
        {STATUS_LABEL[project.status] || project.status}
      </span>

      <div className="project-card__body">
        <div className="project-card__owner">
          {project.owner.foto ? (
            <img className="avatar" src={project.owner.foto} alt="" />
          ) : (
            <span className="avatar">{project.owner.nome[0]}</span>
          )}
          <span>{project.owner.nome} <Verified tipo={project.owner.verified} /></span>
        </div>
        <h3 className="project-card__title">{project.nome}</h3>
        <p className="project-card__desc">{project.descricao}</p>
      </div>
    </Link>
  )
}
