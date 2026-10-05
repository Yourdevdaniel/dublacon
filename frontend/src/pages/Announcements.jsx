import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import { apiFetch } from '../api.js'
import { ConfirmButton, Empty, IconBell } from '../components/ui.jsx'

export default function Announcements() {
  const { user } = useAuth()
  const [avisos, setAvisos] = useState(null)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    apiFetch('/api/avisos/').then(setAvisos)
  }, [])

  if (!user.is_staff) {
    return <p role="alert">Essa área é só pra administradores do site.</p>
  }

  async function publicar(e) {
    e.preventDefault()
    setErro('')
    try {
      const novo = await apiFetch('/api/avisos/', {
        method: 'POST',
        body: JSON.stringify({ mensagem }),
      })
      setAvisos([novo, ...avisos])
      setMensagem('')
    } catch (err) {
      setErro(err.message)
    }
  }

  async function alternarAtivo(aviso) {
    const atualizado = await apiFetch(`/api/avisos/${aviso.id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ ativo: !aviso.ativo }),
    })
    setAvisos(avisos.map((a) => (a.id === aviso.id ? atualizado : a)))
  }

  async function excluir(id) {
    await apiFetch(`/api/avisos/${id}/`, { method: 'DELETE' })
    setAvisos(avisos.filter((a) => a.id !== id))
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Avisos do site</h1>
          <p className="subtitle">O aviso ativo mais recente aparece como banner pra todo mundo.</p>
        </div>
      </div>

      <div className="panel">
        <form onSubmit={publicar}>
          <label>
            Novo aviso
            <textarea
              placeholder="Ex: Manutenção programada sábado às 22h — o site pode ficar fora do ar por 1h."
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={3}
              required
            />
          </label>
          {erro && <p role="alert">{erro}</p>}
          <button type="submit">Publicar aviso</button>
        </form>
      </div>

      {avisos && avisos.length === 0 && (
        <Empty icon={<IconBell />} title="Nenhum aviso publicado ainda" />
      )}
      {avisos && avisos.length > 0 && (
        <ul>
          {avisos.map((a) => (
            <li key={a.id} className={`list-row ${a.ativo ? '' : 'notif--read'}`}>
              <span>
                <strong>{a.mensagem}</strong>
                <span className="notif-target"> · {new Date(a.created_at).toLocaleDateString('pt-BR')}</span>
                {!a.ativo && <span className="badge" style={{ marginLeft: 8 }}>desativado</span>}
              </span>
              <span className="list-row__actions">
                <button type="button" className="btn-secondary btn-mini" onClick={() => alternarAtivo(a)}>
                  {a.ativo ? 'Desativar' : 'Reativar'}
                </button>
                <ConfirmButton pergunta="Excluir esse aviso?" onConfirm={() => excluir(a.id)}>
                  Excluir
                </ConfirmButton>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
