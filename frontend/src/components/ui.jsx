// Vocabulário único de ícones (stroke 1.8, cantos arredondados) + estados compartilhados.
import { useState } from 'react'
import { apiFetch } from '../api.js'

function Svg({ size = 20, children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function IconCompass(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </Svg>
  )
}

export function IconFeed(props) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="16" height="7" rx="2" />
      <rect x="4" y="15" width="16" height="5" rx="2" />
    </Svg>
  )
}

export function IconClapper(props) {
  return (
    <Svg {...props}>
      <path d="M3 8.5 20 5v13L3 15.5V8.5Z" />
      <path d="m3 8.5 4.5 3M9 7.6l4.5 3M15 6.6l4.5 3" />
    </Svg>
  )
}

export function IconChat(props) {
  return (
    <Svg {...props}>
      <path d="M21 12a8 8 0 0 1-8 8H4l2-3.2A8 8 0 1 1 21 12Z" />
    </Svg>
  )
}

export function IconBell(props) {
  return (
    <Svg {...props}>
      <path d="M18 10a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6Z" />
      <path d="M10 20a2.2 2.2 0 0 0 4 0" />
    </Svg>
  )
}

export function IconSearch(props) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.8-3.8" />
    </Svg>
  )
}

export function IconUser(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </Svg>
  )
}

export function FollowButton({ user, onChange }) {
  const [sigo, setSigo] = useState(user.sigo)

  async function toggle() {
    const atualizado = await apiFetch(`/api/users/${user.id}/seguir/`, { method: 'POST' })
    setSigo(atualizado.sigo)
    onChange?.(atualizado)
  }

  return (
    <button type="button" className={sigo ? 'btn-secondary' : ''} onClick={toggle}>
      {sigo ? 'Seguindo' : 'Seguir'}
    </button>
  )
}

export function Verified({ tipo }) {
  if (!tipo) return null
  const label = tipo === 'ator' ? 'Ator profissional verificado (DRT)' : 'Influencer verificado'
  return (
    <span className={`verified verified--${tipo}`} title={label} aria-label={label}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
        <path d="M12 1.8 14.7 4l3.4-.3 1 3.3 3 1.7-1.3 3.3 1.3 3.3-3 1.7-1 3.3-3.4-.3L12 22.2 9.3 20l-3.4.3-1-3.3-3-1.7 1.3-3.3-1.3-3.3 3-1.7 1-3.3 3.4.3L12 1.8Z" />
        <path d="m8.4 12.3 2.4 2.4 4.8-5" stroke="var(--bg)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {tipo === 'ator' && <span className="verified__drt">DRT</span>}
    </span>
  )
}

export function ConfirmButton({ children, pergunta = 'Tem certeza?', confirmar = 'Sim, excluir', onConfirm, className = 'btn-secondary btn-mini' }) {
  const [confirmando, setConfirmando] = useState(false)

  if (!confirmando) {
    return (
      <button type="button" className={className} onClick={() => setConfirmando(true)}>
        {children}
      </button>
    )
  }
  return (
    <span className="confirm-inline">
      <span className="confirm-inline__pergunta">{pergunta}</span>
      <button type="button" className="btn-danger btn-mini" onClick={() => { setConfirmando(false); onConfirm() }}>
        {confirmar}
      </button>
      <button type="button" className="btn-secondary btn-mini" onClick={() => setConfirmando(false)}>
        Cancelar
      </button>
    </span>
  )
}

export function Empty({ icon, title, children }) {
  return (
    <div className="empty">
      {icon}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  )
}

export function SkeletonCards({ count = 6 }) {
  return (
    <div className="project-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton skeleton-card__cover" />
          <div className="skeleton skeleton-line" style={{ width: '55%' }} />
          <div className="skeleton skeleton-line" />
        </div>
      ))}
    </div>
  )
}
