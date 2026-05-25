import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Layout from './components/Layout'
import Home from './pages/Home'
import CreatePlan from './pages/CreatePlan'
import EditPlan from './pages/EditPlan'
import Dashboard from './pages/Dashboard'
import Inheritance from './pages/Inheritance'
import Guardian from './pages/Guardian'
import Login from './pages/Login'
import AIHelper from './pages/AIHelper'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // 使用sessionStorage检查登录状态
  const user = sessionStorage.getItem('user')
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function App() {
  const location = useLocation()

  return (
    <Layout>
      <div key={location.pathname}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Login />} />
          <Route
            path="/create-plan"
            element={
              <ProtectedRoute>
                <CreatePlan />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-plan/:id"
            element={
              <ProtectedRoute>
                <EditPlan />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inheritance"
            element={
              <ProtectedRoute>
                <Inheritance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/guardian"
            element={
              <ProtectedRoute>
                <Guardian />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai"
            element={
              <ProtectedRoute>
                <AIHelper />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Layout>
  )
}

export default App
