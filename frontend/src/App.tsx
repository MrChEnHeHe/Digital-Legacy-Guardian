import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import CreatePlan from './pages/CreatePlan'
import EditPlan from './pages/EditPlan'
import Dashboard from './pages/Dashboard'
import Inheritance from './pages/Inheritance'
import Guardian from './pages/Guardian'
import Login from './pages/Login'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = localStorage.getItem('user')
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
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
      </Routes>
    </Layout>
  )
}

export default App
