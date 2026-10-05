import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../api.js'
import UpdateCard from '../components/UpdateCard.jsx'

export default function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    apiFetch(`/api/updates/${id}/`).then(setPost).catch((err) => setErro(err.message))
  }, [id])

  if (erro) return <p role="alert">{erro}</p>

  return (
    <section className="feed-col">
      <p className="post-back">
        <Link to="/feed">← Feed</Link>
      </p>
      {!post ? (
        <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-md)' }} aria-hidden="true" />
      ) : (
        <UpdateCard update={post} showProject detalhe onDelete={() => navigate('/feed')} />
      )}
    </section>
  )
}
