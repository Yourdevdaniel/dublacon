import { useState } from 'react'
import { apiFetch } from '../api.js'

export default function ReportBug() {
  const [descricao, setDescricao] = useState('')
  const [screenshot, setScreenshot] = useState(null)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    const form = new FormData()
    form.append('descricao', descricao)
    if (screenshot) form.append('screenshot', screenshot)
    try {
      await apiFetch('/api/bugs/', { method: 'POST', body: form })
      setEnviado(true)
    } catch (err) {
      setErro(err.message)
    }
  }

  if (enviado) {
    return (
      <section className="auth-card">
        <h1>Valeu por avisar! 🛠️</h1>
        <p>Seu reporte foi pra fila da equipe. Se precisarmos de mais detalhes, entramos em contato.</p>
      </section>
    )
  }

  return (
    <section className="auth-card">
      <h1>Encontrou um problema?</h1>
      <form onSubmit={enviar}>
        <label>
          O que aconteceu?
          <textarea
            placeholder="Descreva o que você estava fazendo e o que deu errado"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={4}
            required
          />
        </label>
        <label>
          Print da tela (opcional)
          <input type="file" accept="image/*" onChange={(e) => setScreenshot(e.target.files[0])} />
        </label>
        {erro && <p role="alert">{erro}</p>}
        <button type="submit">Enviar reporte</button>
      </form>
    </section>
  )
}
