import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { apiFetch } from '../api.js'
import { Empty, IconChat } from '../components/ui.jsx'

function ConversationList({ me }) {
  const [conversas, setConversas] = useState(null)

  useEffect(() => {
    apiFetch('/api/mensagens/').then(async (msgs) => {
      // agrupa pela outra pessoa da conversa; a última mensagem vence
      const porUsuario = new Map()
      for (const msg of msgs) {
        const outro = msg.sender.id === me.id ? { id: msg.recipient } : msg.sender
        porUsuario.set(outro.id, { outro, ultima: msg })
      }
      // quando só enviei (recipient vem como id cru), busca nome/foto
      await Promise.all(
        [...porUsuario.values()]
          .filter((c) => !c.outro.nome)
          .map(async (c) => {
            c.outro = await apiFetch(`/api/users/${c.outro.id}/`)
          })
      )
      setConversas([...porUsuario.values()].reverse())
    })
  }, [me.id])

  if (!conversas) return <p>Carregando...</p>

  return (
    <section>
      <h1>Mensagens</h1>
      {conversas.length === 0 ? (
        <Empty icon={<IconChat />} title="Nenhuma conversa ainda">
          Encontre alguém em um projeto e mande a primeira mensagem!
        </Empty>
      ) : (
        <ul>
          {conversas.map(({ outro, ultima }) => (
            <li key={outro.id} className="list-row">
              <Link to={`/mensagens/${outro.id}`} className="conversa-link">
                {outro.foto ? (
                  <img className="avatar" src={outro.foto} alt="" />
                ) : (
                  <span className="avatar">{outro.nome[0]}</span>
                )}
                <span>
                  <strong>{outro.nome}</strong>
                  <span className="conversa-preview">
                    {ultima.sender.id === me.id ? 'Você: ' : ''}{ultima.conteudo}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Thread({ me, userId }) {
  const [outro, setOutro] = useState(null)
  const [mensagens, setMensagens] = useState([])
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    apiFetch(`/api/users/${userId}/`).then(setOutro).catch((err) => setErro(err.message))
    // quase-real: repuxa a conversa a cada 5s (o GET também marca as recebidas como lidas)
    const buscar = () => apiFetch(`/api/mensagens/?with=${userId}`).then(setMensagens).catch(() => {})
    buscar()
    const timer = setInterval(buscar, 5000)
    return () => clearInterval(timer)
  }, [userId])

  async function enviar(e) {
    e.preventDefault()
    if (!texto.trim()) return
    setErro('')
    try {
      const msg = await apiFetch('/api/mensagens/', {
        method: 'POST',
        body: JSON.stringify({ recipient: userId, conteudo: texto }),
      })
      setMensagens([...mensagens, msg])
      setTexto('')
    } catch (err) {
      setErro(err.message)
    }
  }

  if (erro && !outro) return <p role="alert">{erro}</p>
  if (!outro) return <p>Carregando...</p>

  return (
    <section>
      <div className="thread-header">
        <Link to="/mensagens">← Mensagens</Link>
        <h1><Link to={`/usuarios/${outro.id}`} className="thread-header__nome">{outro.nome}</Link></h1>
        <Link to={`/denunciar/${outro.id}`} className="thread-header__report">Denunciar</Link>
      </div>

      <div className="thread">
        {mensagens.length === 0 && <p>Diga um oi pra começar a conversa!</p>}
        {mensagens.map((msg) => (
          <p
            key={msg.id}
            className={`bubble ${msg.sender.id === me.id ? 'bubble--mine' : ''}`}
          >
            {msg.conteudo}
          </p>
        ))}
      </div>

      {erro && <p role="alert">{erro}</p>}
      <form onSubmit={enviar} className="thread-form">
        <textarea
          placeholder={`Mensagem pra ${outro.nome}`}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={2}
          required
        />
        <button type="submit">Enviar</button>
      </form>
    </section>
  )
}

export default function Messages() {
  const { userId } = useParams()
  const { user } = useAuth()
  return userId ? <Thread me={user} userId={userId} /> : <ConversationList me={user} />
}
