import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import { apiFetch } from './api.js'
import { IconBell, IconChat, IconClapper, IconCompass, IconFeed, IconSearch, IconUser } from './components/ui.jsx'
import OpenProjects from './pages/OpenProjects.jsx'
import Feed from './pages/Feed.jsx'
import PostDetail from './pages/PostDetail.jsx'
import ProjectDetail from './pages/ProjectDetail.jsx'
import MyProjects from './pages/MyProjects.jsx'
import Profile from './pages/Profile.jsx'
import People from './pages/People.jsx'
import FollowList from './pages/FollowList.jsx'
import Settings from './pages/Settings.jsx'
import Messages from './pages/Messages.jsx'
import Notifications from './pages/Notifications.jsx'
import ReportUser from './pages/ReportUser.jsx'
import ReportBug from './pages/ReportBug.jsx'
import Announcements from './pages/Announcements.jsx'
import Moderation from './pages/Moderation.jsx'
import Welcome from './pages/Welcome.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import './App.css'

function SiteBanner() {
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    apiFetch('/api/avisos/')
      .then((lista) => {
        const ultimo = lista[0]
        if (ultimo && String(ultimo.id) !== localStorage.getItem('aviso_dispensado')) {
          setAviso(ultimo)
        }
      })
      .catch(() => {})
  }, [])

  if (!aviso) return null

  function dispensar() {
    localStorage.setItem('aviso_dispensado', String(aviso.id))
    setAviso(null)
  }

  return (
    <div className="site-banner" role="status">
      <div className="site-banner__inner">
        <IconBell size={18} />
        <p>{aviso.mensagem}</p>
        <button type="button" onClick={dispensar} aria-label="Dispensar aviso">✕</button>
      </div>
    </div>
  )
}

function Badge({ count }) {
  if (!count) return null
  return <span className="unread-badge">{count > 9 ? '9+' : count}</span>
}

function useNaoLidas(user) {
  const [contagem, setContagem] = useState({ notificacoes: 0, mensagens: 0 })
  const { pathname } = useLocation()

  useEffect(() => {
    if (!user) return
    let ativo = true
    const buscar = () =>
      apiFetch('/api/notificacoes/nao_lidas/')
        .then((c) => ativo && setContagem(c))
        .catch(() => {})
    buscar()
    const timer = setInterval(buscar, 30000)
    return () => {
      ativo = false
      clearInterval(timer)
    }
  }, [user, pathname])

  return contagem
}

function Navbar({ contagem }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function sair() {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="brand">
          <IconClapper size={22} />
          DublaCon
        </NavLink>

        <div className="navbar-links">
          <NavLink to="/" end>Descobrir</NavLink>
          <NavLink to="/feed">Feed</NavLink>
          {user && <NavLink to="/meus-projetos">Meus projetos</NavLink>}
        </div>

        <div className="navbar-actions">
          {user ? (
            <>
              <NavLink to="/pessoas" className="icon-link icon-link--keep" aria-label="Buscar pessoas" title="Buscar pessoas">
                <IconSearch />
              </NavLink>
              <NavLink to="/mensagens" className="icon-link" aria-label="Mensagens" title="Mensagens">
                <IconChat />
                <Badge count={contagem.mensagens} />
              </NavLink>
              <NavLink to="/notificacoes" className="icon-link" aria-label="Notificações" title="Notificações">
                <IconBell />
                <Badge count={contagem.notificacoes} />
              </NavLink>
              <NavLink to="/configuracoes" className="navbar-avatar" aria-label="Configurações" title="Configurações">
                {user.foto ? <img src={user.foto} alt="" /> : user.nome[0]}
              </NavLink>
              <button type="button" className="navbar-sair" onClick={sair}>Sair</button>
            </>
          ) : (
            <NavLink to="/login" className="navbar-cta">Entrar</NavLink>
          )}
        </div>
      </div>
    </nav>
  )
}

function TabBar({ contagem }) {
  const { user } = useAuth()

  return (
    <nav className="tabbar">
      <NavLink to="/" end>
        <IconCompass />
        <span>Descobrir</span>
      </NavLink>
      <NavLink to="/feed">
        <IconFeed />
        <span>Feed</span>
      </NavLink>
      {user ? (
        <>
          <NavLink to="/meus-projetos">
            <IconClapper />
            <span>Meus</span>
          </NavLink>
          <NavLink to="/mensagens">
            <span className="tab-icon">
              <IconChat />
              <Badge count={contagem.mensagens} />
            </span>
            <span>Mensagens</span>
          </NavLink>
          <NavLink to="/notificacoes">
            <span className="tab-icon">
              <IconBell />
              <Badge count={contagem.notificacoes} />
            </span>
            <span>Avisos</span>
          </NavLink>
        </>
      ) : (
        <NavLink to="/login">
          <IconUser />
          <span>Entrar</span>
        </NavLink>
      )}
    </nav>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<OpenProjects />} />
      <Route path="/feed" element={<Feed />} />
      <Route path="/posts/:id" element={<PostDetail />} />
      <Route path="/projetos/:id" element={<ProjectDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route path="/esqueci-senha" element={<ForgotPassword />} />
      <Route path="/redefinir-senha" element={<ResetPassword />} />
      <Route path="/bem-vindo" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
      <Route path="/usuarios/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/usuarios/:id/seguidores" element={<ProtectedRoute><FollowList tipo="seguidores" /></ProtectedRoute>} />
      <Route path="/usuarios/:id/seguindo" element={<ProtectedRoute><FollowList tipo="seguindo" /></ProtectedRoute>} />
      <Route path="/pessoas" element={<ProtectedRoute><People /></ProtectedRoute>} />
      <Route path="/meus-projetos" element={<ProtectedRoute><MyProjects /></ProtectedRoute>} />
      <Route path="/mensagens" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
      <Route path="/mensagens/:userId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
      <Route path="/notificacoes" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/denunciar/:userId" element={<ProtectedRoute><ReportUser /></ProtectedRoute>} />
      <Route path="/bug" element={<ProtectedRoute><ReportBug /></ProtectedRoute>} />
      <Route path="/avisos" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
      <Route path="/moderacao" element={<ProtectedRoute><Moderation /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    </Routes>
  )
}

function Shell() {
  const { user } = useAuth()
  const contagem = useNaoLidas(user)

  return (
    <>
      <Navbar contagem={contagem} />
      <SiteBanner />
      <main>
        <AppRoutes />
      </main>
      <TabBar contagem={contagem} />
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
