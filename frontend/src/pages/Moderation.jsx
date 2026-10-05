import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { apiFetch } from '../api.js'
import { ConfirmButton, Empty, IconUser } from '../components/ui.jsx'

const REASON_LABEL = {
  assedio: 'Assédio',
  conteudo_improprio: 'Conteúdo impróprio',
  spam: 'Spam',
  outro: 'Outro',
}

const STATUS_LABEL = { pendente: 'Pendente', em_analise: 'Em análise', resolvida: 'Resolvida' }

function BanControl({ usuario, banido, onBan }) {
  const [banirIp, setBanirIp] = useState(false)

  if (banido) {
    return (
      <span className="ban-control">
        <span className="badge">banido</span>
        <button type="button" className="btn-secondary btn-mini" onClick={() => onBan(usuario.id, false)}>
          Desbanir
        </button>
      </span>
    )
  }
  return (
    <span className="ban-control">
      <label className="ban-control__ip">
        <input type="checkbox" checked={banirIp} onChange={(e) => setBanirIp(e.target.checked)} />
        bloquear IP de cadastro
      </label>
      <ConfirmButton
        pergunta={`Banir ${usuario.nome}?`}
        confirmar="Sim, banir"
        onConfirm={() => onBan(usuario.id, banirIp)}
        className="btn-danger btn-mini"
      >
        Banir conta
      </ConfirmButton>
    </span>
  )
}

const TIPO_SELO = { influencer: 'Influencer', ator: 'Ator profissional (DRT)' }

export default function Moderation() {
  const { user } = useAuth()
  const [denuncias, setDenuncias] = useState(null)
  const [bugs, setBugs] = useState(null)
  const [pedidos, setPedidos] = useState(null)
  const [banidos, setBanidos] = useState({})

  useEffect(() => {
    apiFetch('/api/denuncias/').then(setDenuncias)
    apiFetch('/api/bugs/').then(setBugs)
    apiFetch('/api/verificacao/').then(setPedidos)
  }, [])

  if (!user.is_staff) {
    return <p role="alert">Essa área é só pra administradores do site.</p>
  }

  async function banir(userId, banirIp) {
    const resp = await apiFetch(`/api/users/${userId}/banir/`, {
      method: 'POST',
      body: JSON.stringify({ banir_ip: banirIp }),
    })
    setBanidos((atual) => ({ ...atual, [userId]: !resp.is_active }))
  }

  async function mudarStatus(denuncia, status) {
    const atualizada = await apiFetch(`/api/denuncias/${denuncia.id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    setDenuncias(denuncias.map((d) => (d.id === denuncia.id ? atualizada : d)))
  }

  async function resolverBug(bug) {
    const atualizado = await apiFetch(`/api/bugs/${bug.id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'resolvido' }),
    })
    setBugs(bugs.map((b) => (b.id === bug.id ? atualizado : b)))
  }

  async function decidirVerificacao(pedido, acao) {
    const atualizado = await apiFetch(`/api/verificacao/${pedido.id}/${acao}/`, { method: 'POST' })
    setPedidos(pedidos.map((p) => (p.id === pedido.id ? atualizado : p)))
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Moderação</h1>
          <p className="subtitle">Denúncias, pedidos de verificação e bugs da comunidade.</p>
        </div>
      </div>

      <h2>Pedidos de verificação</h2>
      {pedidos && pedidos.length === 0 && <Empty icon={<IconUser />} title="Nenhum pedido" />}
      {pedidos && pedidos.map((p) => (
        <div key={p.id} className={`panel mod-card ${p.status !== 'pendente' ? 'notif--read' : ''}`}>
          <div className="mod-card__head">
            <span>
              <span className="badge badge--role">{TIPO_SELO[p.tipo] || p.tipo}</span>{' '}
              <span className="badge">{p.status}</span>
            </span>
            <span className="notif-target">{new Date(p.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
          <p className="mod-card__quem">
            <Link to={`/usuarios/${p.user.id}`}>{p.user.nome}</Link>
            {p.drt_numero && <> · DRT nº <strong>{p.drt_numero}</strong></>}
            {p.drt_uf && <> · UF <strong>{p.drt_uf}</strong></>}
            {p.cpf_consulta && <> · CPF <strong>{p.cpf_consulta}</strong></>}
            {p.documento && <> · <a href={p.documento} target="_blank" rel="noreferrer">ver documento ↗</a></>}
          </p>
          {p.tipo === 'ator' && p.status === 'pendente' && (
            <p className="notif-target">
              Confira na consulta oficial com: nome completo, UF, CPF e o nº do registro acima (já com 7 dígitos).
            </p>
          )}
          {p.justificativa && <p>{p.justificativa}</p>}
          {p.status === 'pendente' && (
            <div className="mod-card__actions">
              <button type="button" className="btn-mini" onClick={() => decidirVerificacao(p, 'aprovar')}>
                Aprovar selo
              </button>
              <button type="button" className="btn-secondary btn-mini" onClick={() => decidirVerificacao(p, 'recusar')}>
                Recusar
              </button>
            </div>
          )}
        </div>
      ))}

      <h2>Denúncias</h2>
      {denuncias && denuncias.length === 0 && (
        <Empty icon={<IconUser />} title="Nenhuma denúncia" />
      )}
      {denuncias && denuncias.map((d) => (
        <div key={d.id} className={`panel mod-card ${d.status === 'resolvida' ? 'notif--read' : ''}`}>
          <div className="mod-card__head">
            <span>
              <span className="badge badge--role">{REASON_LABEL[d.reason] || d.reason}</span>{' '}
              <span className="badge">{STATUS_LABEL[d.status] || d.status}</span>
            </span>
            <span className="notif-target">{new Date(d.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
          <p className="mod-card__quem">
            <Link to={`/usuarios/${d.reporter.id}`}>{d.reporter.nome}</Link> denunciou{' '}
            <Link to={`/usuarios/${d.reported_user.id}`}>{d.reported_user.nome}</Link>
          </p>
          <p>{d.descricao}</p>
          {d.evidencias.length > 0 && (
            <div className="mod-card__evidencias">
              {d.evidencias.map((ev) => (
                <a key={ev.id} href={ev.foto} target="_blank" rel="noreferrer">
                  <img src={ev.foto} alt="Evidência" />
                </a>
              ))}
            </div>
          )}
          <div className="mod-card__actions">
            {d.status === 'pendente' && (
              <button type="button" className="btn-secondary btn-mini" onClick={() => mudarStatus(d, 'em_analise')}>
                Marcar em análise
              </button>
            )}
            {d.status !== 'resolvida' && (
              <button type="button" className="btn-secondary btn-mini" onClick={() => mudarStatus(d, 'resolvida')}>
                Marcar resolvida
              </button>
            )}
            <BanControl
              usuario={d.reported_user}
              banido={Boolean(banidos[d.reported_user.id])}
              onBan={banir}
            />
          </div>
        </div>
      ))}

      <h2>Bugs reportados</h2>
      {bugs && bugs.length === 0 && <Empty icon={<IconUser />} title="Nenhum bug reportado" />}
      {bugs && bugs.map((b) => (
        <div key={b.id} className={`list-row ${b.status === 'resolvido' ? 'notif--read' : ''}`}>
          <span>
            <strong>{b.reporter.nome}</strong>
            <span className="notif-target"> · {new Date(b.created_at).toLocaleDateString('pt-BR')}</span>
            <br />
            {b.descricao}
            {b.screenshot && (
              <>
                {' '}<a href={b.screenshot} target="_blank" rel="noreferrer">ver print ↗</a>
              </>
            )}
          </span>
          {b.status !== 'resolvido' ? (
            <button type="button" className="btn-secondary btn-mini" onClick={() => resolverBug(b)}>
              Resolvido
            </button>
          ) : (
            <span className="badge">resolvido</span>
          )}
        </div>
      ))}
    </section>
  )
}
