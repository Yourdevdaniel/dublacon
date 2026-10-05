import { useEffect, useState } from 'react'
import { apiFetch } from '../api.js'

function Estrela({ cheia, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill={cheia ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="m12 3 2.7 5.8 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3.1 1.2-6.2L3 9.6l6.3-.8L12 3Z" />
    </svg>
  )
}

export default function Rating({ targetType, targetId, canRate }) {
  const [media, setMedia] = useState(null)
  const [score, setScore] = useState(0)
  const [reason, setReason] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [erro, setErro] = useState('')
  const [enviada, setEnviada] = useState(false)

  useEffect(() => {
    apiFetch(`/api/avaliacoes/media/?target_type=${targetType}&target_id=${targetId}`).then(setMedia)
  }, [targetType, targetId])

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    try {
      await apiFetch('/api/avaliacoes/', {
        method: 'POST',
        body: JSON.stringify({ target_type: targetType, target_id: Number(targetId), score, reason }),
      })
      setEnviada(true)
      setMostrarForm(false)
      apiFetch(`/api/avaliacoes/media/?target_type=${targetType}&target_id=${targetId}`).then(setMedia)
    } catch (err) {
      setErro(err.message)
    }
  }

  return (
    <div className="rating">
      <span className="rating__media">
        <Estrela cheia />
        {media && media.total > 0 ? (
          <>
            <strong>{media.media.toFixed(1)}</strong>
            <span className="rating__total">({media.total})</span>
          </>
        ) : (
          <span className="rating__total">sem avaliações</span>
        )}
      </span>

      {canRate && !enviada && !mostrarForm && (
        <button type="button" className="btn-secondary btn-mini" onClick={() => setMostrarForm(true)}>
          Avaliar
        </button>
      )}
      {enviada && <span className="rating__total">Avaliação enviada ✓</span>}

      {mostrarForm && (
        <form className="rating__form" onSubmit={enviar}>
          <span className="rating__stars" role="radiogroup" aria-label="Nota de 1 a 5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="rating__star-btn"
                role="radio"
                aria-checked={score === n}
                aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
                onClick={() => setScore(n)}
              >
                <Estrela cheia={n <= score} />
              </button>
            ))}
          </span>
          {score > 0 && score <= 2 && (
            <textarea
              placeholder="Nota baixa exige um motivo — conta o que aconteceu"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              required
            />
          )}
          {erro && <p role="alert">{erro}</p>}
          <span className="rating__form-actions">
            <button type="submit" disabled={score === 0}>Enviar</button>
            <button type="button" className="btn-secondary" onClick={() => setMostrarForm(false)}>Cancelar</button>
          </span>
        </form>
      )}
    </div>
  )
}
