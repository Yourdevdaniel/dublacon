import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api.js'
import { Empty, IconBell } from '../components/ui.jsx'

const VERB_LABEL = {
  candidatura_aceita: 'Sua candidatura foi aceita 🎉',
  candidatura_recusada: 'Sua candidatura foi recusada',
  nova_mensagem: 'Você recebeu uma nova mensagem',
  novo_comentario: 'Novo comentário',
  nova_avaliacao: 'Você recebeu uma avaliação',
  denuncia_atualizada: 'Sua denúncia foi atualizada',
  novo_seguidor: 'Novo seguidor',
  verificacao_atualizada: 'Sua verificação foi atualizada',
}

export default function Notifications() {
  const [notificacoes, setNotificacoes] = useState(null)

  useEffect(() => {
    apiFetch('/api/notificacoes/').then(setNotificacoes)
  }, [])

  async function marcarLida(id) {
    const atualizada = await apiFetch(`/api/notificacoes/${id}/marcar_lida/`, { method: 'POST' })
    setNotificacoes(notificacoes.map((n) => (n.id === id ? atualizada : n)))
  }

  return (
    <section>
      <div className="page-head">
        <h1>Notificações</h1>
      </div>

      {!notificacoes && (
        <div aria-hidden="true">
          <div className="skeleton" style={{ height: 52, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 52, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 52 }} />
        </div>
      )}
      {notificacoes && notificacoes.length === 0 && (
        <Empty icon={<IconBell />} title="Nada por aqui ainda">
          Quando algo acontecer nos seus projetos e candidaturas, você fica sabendo aqui.
        </Empty>
      )}
      {notificacoes && notificacoes.length > 0 && (
        <ul>
          {notificacoes.map((n) => {
            const conteudo = (
              <>
                {!n.read && <span className="notif-dot" aria-label="Não lida" />}
                <strong>{VERB_LABEL[n.verb] || n.verb}</strong>
                {n.target_repr && <span className="notif-target"> · {n.target_repr}</span>}
              </>
            )
            return (
              <li key={n.id} className={`list-row ${n.read ? 'notif--read' : ''}`}>
                {n.link ? (
                  <Link
                    to={n.link}
                    className="notif-link"
                    onClick={() => { if (!n.read) marcarLida(n.id) }}
                  >
                    {conteudo}
                  </Link>
                ) : (
                  <span>{conteudo}</span>
                )}
                {!n.read && (
                  <button type="button" className="btn-secondary btn-mini" onClick={() => marcarLida(n.id)}>
                    Marcar lida
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
