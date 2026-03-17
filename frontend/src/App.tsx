import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import CreatePlan from './pages/CreatePlan'
import EditPlan from './pages/EditPlan'
import Dashboard from './pages/Dashboard'
import Inheritance from './pages/Inheritance'
import Guardian from './pages/Guardian'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create-plan" element={<CreatePlan />} />
        <Route path="/edit-plan/:id" element={<EditPlan />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/inheritance" element={<Inheritance />} />
        <Route path="/guardian" element={<Guardian />} />
      </Routes>
    </Layout>
  )
}

export default App
