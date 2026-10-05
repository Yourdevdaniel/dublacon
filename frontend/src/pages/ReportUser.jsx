import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiFetch } from '../api.js'

const REASONS = [
  ['assedio', 'Assédio'],
  ['conteudo_improprio', 'Conteúdo impróprio'],
  ['spam', 'Spam'],
  ['outro', 'Outro'],
]

export default function ReportUser() {
  const { userId } = useParams()
  const [alvo, setAlvo] = useState(null)
  const [reason, setReason] = useState('assedio')
  const [descricao, setDescricao] = useState('')
  const [evidencias, setEvidencias] = useState([])
  const [enviada, setEnviada] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    apiFetch(`/api/users/${userId}/`).then(setAlvo).catch((err) => setErro(err.message))
  }, [userId])

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    const form = new FormData()
    form.append('reported_user_id', userId)
    form.append('reason', reason)
    form.append('descricao', descricao)
    for (const foto of evidencias) form.append('evidencias', foto)
    try {
      await apiFetch('/api/denuncias/', { method: 'POST', body: form })
      setEnviada(true)
    } catch (err) {
      setErro(err.message)
    }
  }

  if (erro && !alvo) return <p role="alert">{erro}</p>
  if (!alvo) return <p>Carregando...</p>

  if (enviada) {
    return (
      <section className="auth-card">
        <h1>Denúncia enviada</h1>
        <p>Obrigado por avisar. Nossa equipe vai analisar e você será notificado quando houver atualização.</p>
      </section>
    )
  }

  return (
    <section className="auth-card">
      <h1>Denunciar {alvo.nome}</h1>
      <form onSubmit={enviar}>
        <label>
          Motivo
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map(([valor, label]) => (
              <option key={valor} value={valor}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          O que aconteceu?
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={4}
            required
          />
        </label>
        <label>
          Evidências (prints, opcional)
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setEvidencias([...e.target.files])}
          />
        </label>
        {erro && <p role="alert">{erro}</p>}
        <button type="submit">Enviar denúncia</button>
      </form>
    </section>
  )
}
